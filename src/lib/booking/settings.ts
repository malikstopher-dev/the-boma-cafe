import { getAdminClient } from '@/lib/supabase'

export interface BookingSettings {
  deposit_percentage: number
  tax_rate: number
  quote_validity_days: number
  min_advance_days: number
  max_advance_days: number
  enabled: boolean
  auto_confirm: boolean
  business_hours_start: string
  business_hours_end: string
}

const SETTING_KEYS = [
  'booking:deposit_percentage',
  'booking:tax_rate',
  'booking:quote_validity_days',
  'booking:min_advance_days',
  'booking:max_advance_days',
  'booking:enabled',
  'booking:auto_confirm',
  'booking:business_hours_start',
  'booking:business_hours_end',
] as const

const DEFAULTS: BookingSettings = {
  deposit_percentage: 30,
  tax_rate: 0,
  quote_validity_days: 7,
  min_advance_days: 1,
  max_advance_days: 365,
  enabled: true,
  auto_confirm: true,
  business_hours_start: '08:00',
  business_hours_end: '22:00',
}

export async function getBookingSettings(): Promise<BookingSettings> {
  const { data, error } = await (await getAdminClient())
    .from('site_settings')
    .select('key, value')
    .in('key', SETTING_KEYS)

  if (error) return DEFAULTS

  const settings: Record<string, string> = {}
  for (const row of data) {
    settings[row.key] = row.value
  }

  return {
    deposit_percentage: parseFloat(settings['booking:deposit_percentage']) || DEFAULTS.deposit_percentage,
    tax_rate: parseFloat(settings['booking:tax_rate']) || DEFAULTS.tax_rate,
    quote_validity_days: parseInt(settings['booking:quote_validity_days']) || DEFAULTS.quote_validity_days,
    min_advance_days: parseInt(settings['booking:min_advance_days']) || DEFAULTS.min_advance_days,
    max_advance_days: parseInt(settings['booking:max_advance_days']) || DEFAULTS.max_advance_days,
    enabled: settings['booking:enabled'] !== 'false',
    auto_confirm: settings['booking:auto_confirm'] !== 'false',
    business_hours_start: settings['booking:business_hours_start'] || DEFAULTS.business_hours_start,
    business_hours_end: settings['booking:business_hours_end'] || DEFAULTS.business_hours_end,
  }
}

export async function updateBookingSetting(key: string, value: string): Promise<boolean> {
  const prefixedKey = key.startsWith('booking:') ? key : `booking:${key}`
  const { error } = await (await getAdminClient())
    .from('site_settings')
    .upsert({ key: prefixedKey, value }, { onConflict: 'key' })
  return !error
}