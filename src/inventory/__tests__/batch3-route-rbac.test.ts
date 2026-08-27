import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  adminContext: vi.fn(),
  getAllSettings: vi.fn(async () => ({})),
  getBarCategories: vi.fn(async () => []),
  getBarItems: vi.fn(async () => []),
  getAdminClient: vi.fn(),
  logAdminAction: vi.fn(),
}))

vi.mock('@/lib/admin/context', () => ({ getAdminContext: mocks.adminContext }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }))
vi.mock('@/lib/cms-supabase', () => ({
  getAllSettings: mocks.getAllSettings,
  setMultipleSettings: vi.fn(async () => true),
  isAllowedSiteSettingKey: vi.fn(() => true),
  setSetting: vi.fn(async () => true),
  getBarCategories: mocks.getBarCategories,
  getBarItems: mocks.getBarItems,
  saveBarCategory: vi.fn(),
  deleteBarCategory: vi.fn(),
  saveBarItem: vi.fn(),
  deleteBarItem: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ getAdminClient: mocks.getAdminClient }))
vi.mock('@/lib/admin/audit', () => ({ logAdminAction: mocks.logAdminAction }))

import { GET as getSettings } from '@/app/api/cms/all-settings/route'
import { GET as getBarMenu } from '@/app/api/cms/bar/route'
import { GET as getPricing, PATCH as patchPricing } from '@/app/api/admin/pricing/route'
import { GET as getMedia } from '@/app/api/admin/media/route'
import { GET as getJobs } from '@/app/api/background-jobs/route'
import { PATCH as patchJob } from '@/app/api/background-jobs/[id]/route'

function request(path: string, method = 'GET', body?: unknown): NextRequest {
  const init: { method: string; headers?: Record<string, string>; body?: string } = { method }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  return new NextRequest(`https://example.test${path}`, init)
}

function setRole(role: 'owner' | 'full_manager' | 'manager' | 'assistant_manager') {
  mocks.adminContext.mockResolvedValue({
    adminId: `admin-${role}`,
    username: role,
    displayName: role,
    role,
    legacy: false,
    sessionId: `session-${role}`,
  })
}

function queryClient() {
  const result = { data: [], error: null, count: 0 }
  const chain: any = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    update: vi.fn(() => chain),
    range: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: { id: 'job-1' }, error: null })),
    then: (resolve?: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return { from: vi.fn(() => chain), rpc: vi.fn(async () => result) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAdminClient.mockReturnValue(queryClient())
})

describe('Batch 3 route-level management RBAC', () => {
  it('denies manager and assistant manager across CMS, settings, pricing, media, and jobs', async () => {
    const handlers = [
      () => getSettings(request('/api/cms/all-settings')),
      () => getBarMenu(request('/api/cms/bar')),
      () => getPricing(request('/api/admin/pricing')),
      () => getMedia(request('/api/admin/media')),
      () => getJobs(request('/api/background-jobs')),
    ]

    for (const role of ['manager', 'assistant_manager'] as const) {
      setRole(role)
      for (const invoke of handlers) expect((await invoke()).status).toBe(403)
    }

    expect(mocks.getAllSettings).not.toHaveBeenCalled()
    expect(mocks.getBarCategories).not.toHaveBeenCalled()
  })

  it('allows full manager and owner through each route gate', async () => {
    for (const role of ['full_manager', 'owner'] as const) {
      setRole(role)
      expect((await getSettings(request('/api/cms/all-settings'))).status).toBe(200)
      expect((await getBarMenu(request('/api/cms/bar'))).status).toBe(200)
      expect((await getPricing(request('/api/admin/pricing'))).status).toBe(200)
      expect((await getMedia(request('/api/admin/media'))).status).toBe(200)
      expect((await getJobs(request('/api/background-jobs'))).status).toBe(200)
    }
  })

  it('rejects non-pricing fields before issuing an update', async () => {
    setRole('owner')
    const client = queryClient()
    mocks.getAdminClient.mockReturnValue(client)
    const response = await patchPricing(request('/api/admin/pricing', 'PATCH', {
      entity_type: 'food_packages',
      entity_id: 'package-1',
      field: 'name',
      value: 'forged name',
    }))

    expect(response.status).toBe(400)
    expect(client.from).not.toHaveBeenCalled()
  })

  it('audits a successful background-job retry without exposing job payloads', async () => {
    setRole('full_manager')
    const response = await patchJob(
      request('/api/background-jobs/job-1', 'PATCH', { action: 'retry' }),
      { params: Promise.resolve({ id: 'job-1' }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.logAdminAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'background_job.retry',
      targetType: 'background_job',
      targetId: 'job-1',
    }))
    expect(JSON.stringify(mocks.logAdminAction.mock.calls[0]?.[0])).not.toContain('payload')
  })
})
