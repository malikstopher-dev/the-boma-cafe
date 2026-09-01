import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult = {
  data: unknown
  error: null | { code: string; message: string }
}

const state = vi.hoisted(() => ({
  from: vi.fn(),
  results: new Map<string, QueryResult>(),
  projections: new Map<string, string>(),
  queries: new Map<string, any>(),
}))

vi.mock('@/lib/supabase', () => ({
  getAdminClient: () => ({ from: state.from }),
}))

import { GET } from '@/app/api/booking/config/route'
import { loadBookingConfig } from '@/components/booking/BookingWizard'
import ErrorView from '@/components/booking/ErrorView'
import WizardView from '@/components/booking/WizardView'

const bookingType = {
  id: '123e4567-e89b-42d3-a456-426614174001',
  name: 'Wedding',
  slug: 'wedding',
  description: 'Your perfect wedding day',
  icon: 'Wedding',
  min_guests: 20,
  max_guests: 500,
  min_duration_hours: 1,
  max_duration_hours: 12,
  is_active: true,
  sort_order: 3,
}

const tableData: Record<string, unknown[]> = {
  booking_types: [bookingType],
  venues: [],
  venue_areas: [],
  food_packages: [],
  drink_packages: [],
  addon_categories: [],
  addons: [],
  site_settings: [{ key: 'booking:enabled', value: 'true' }],
}

function queryFor(table: string) {
  const query: any = {}
  query.select = vi.fn((projection: string) => {
    state.projections.set(table, projection)
    return query
  })
  query.eq = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.in = vi.fn(() => query)
  query.then = (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) => (
    Promise.resolve(state.results.get(table) ?? { data: tableData[table] ?? [], error: null }).then(resolve, reject)
  )
  state.queries.set(table, query)
  return query
}

const wizard = {
  booking_type_id: '',
  booking_date: '',
  booking_time: '',
  duration_hours: 3,
  adults: 2,
  children: 0,
  venue_area_id: '',
  food_package_id: '',
  drink_package_id: '',
  addon_selections: {},
  name: '',
  phone: '',
  email: '',
  company: '',
  special_requests: '',
}

const wizardProps: ComponentProps<typeof WizardView> = {
  config: {
    booking_types: [bookingType],
    venue_areas: [],
    food_packages: [],
    drink_packages: [],
    addon_categories: [],
    addons: [],
  },
  wizard,
  step: 0,
  errors: {},
  quotation: null,
  quoteLoading: false,
  availLoading: false,
  availability: null,
  isNarrow: false,
  enoughForQuote: false,
  submitting: false,
  update: vi.fn(),
  setErrors: vi.fn(),
  handleNext: vi.fn(),
  handleBack: vi.fn(),
  handleSubmit: vi.fn(),
  STEPS: ['Booking Type', 'Date & Time', 'Guests', 'Venue Area', 'Food Package', 'Drinks Package', 'Add-ons', 'Your Details', 'Review & Confirm'],
}

function continueButton(html: string) {
  const textIndex = html.indexOf('Continue')
  const start = html.lastIndexOf('<button', textIndex)
  const end = html.indexOf('</button>', textIndex)
  return html.slice(start, end + '</button>'.length)
}

beforeEach(() => {
  vi.clearAllMocks()
  state.results.clear()
  state.projections.clear()
  state.queries.clear()
  state.from.mockImplementation((table: string) => queryFor(table))
})

describe('booking configuration route contract', () => {
  it('uses the real explicit booking_types schema projection', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(state.projections.get('booking_types')).toBe(
      'id,name,slug,description,icon,min_guests,max_guests,min_duration_hours,max_duration_hours,is_active,sort_order',
    )
    expect(state.projections.get('booking_types')).not.toContain('base_price')
    expect(state.queries.get('booking_types').eq).toHaveBeenCalledWith('is_active', true)
  })

  it('returns active booking types in a successful response', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.booking_types).toEqual([bookingType])
  })

  it('returns a safe non-200 response when a database query fails', async () => {
    const databaseError = { code: '42703', message: 'column booking_types.base_price does not exist' }
    state.results.set('booking_types', { data: null, error: databaseError })
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to load booking configuration' })
    expect(body).not.toHaveProperty('booking_types')
    expect(log).toHaveBeenCalledWith('[booking/config] Failed to load booking_types', databaseError)
    log.mockRestore()
  })
})

describe('booking type wizard contract', () => {
  it('renders booking type cards from valid configuration', () => {
    const html = renderToStaticMarkup(createElement(WizardView, wizardProps))

    expect(html).toContain('Wedding')
    expect(html).toContain('Your perfect wedding day')
  })

  it('disables Continue until a booking type is selected', () => {
    const html = renderToStaticMarkup(createElement(WizardView, wizardProps))

    expect(continueButton(html)).toContain('disabled=""')
  })

  it('enables Continue after a valid booking type is selected', () => {
    const html = renderToStaticMarkup(createElement(WizardView, {
      ...wizardProps,
      wizard: { ...wizard, booking_type_id: bookingType.id },
    }))

    expect(continueButton(html)).not.toContain('disabled')
  })

  it('rejects failed and empty configuration responses instead of rendering an empty selector', async () => {
    const failedFetch = vi.fn(async () => new Response(
      JSON.stringify({ error: 'Failed to load booking configuration' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )) as unknown as typeof fetch
    const emptyFetch = vi.fn(async () => new Response(
      JSON.stringify({ booking_types: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )) as unknown as typeof fetch

    await expect(loadBookingConfig(failedFetch)).rejects.toThrow('Failed to load booking configuration')
    await expect(loadBookingConfig(emptyFetch)).rejects.toThrow('Failed to load booking configuration')
  })

  it('renders a visible retry state for configuration failures', () => {
    const html = renderToStaticMarkup(createElement(ErrorView, {
      message: 'Failed to load booking configuration',
      onRetry: vi.fn(),
    }))

    expect(html).toContain('Failed to load booking configuration')
    expect(html).toContain('Retry')
    expect(html).not.toContain('Booking Type</h2>')
  })
})
