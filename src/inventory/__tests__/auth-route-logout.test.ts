import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStore = {
  get: vi.fn((_name: string) => undefined as { value: string } | undefined),
  set: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockStore),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => true),
}))

vi.mock('@/lib/supabase', () => ({
  getAdminClient: vi.fn(() => ({ from: vi.fn() })),
}))

vi.mock('@/lib/admin/session', () => ({
  createAdminSession: vi.fn(),
  endAdminSession: vi.fn(async () => true),
  validateAdminSession: vi.fn(async () => null),
  generateDeviceFingerprint: vi.fn(() => 'fp'),
}))

vi.mock('@/lib/admin/audit', () => ({
  logAdminAction: vi.fn(),
}))

vi.mock('@/lib/admin/password', () => ({
  verifyPassword: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => null),
  expectedCookieValue: vi.fn((role: string) => `hash-${role}`),
}))

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/admin/auth/route'

const ALL_AUTH_COOKIES = [
  'boma_admin_auth',
  'boma_admin_session',
  'boma_kitchen_auth',
  'boma_bar_auth',
  'boma_waiter_auth',
  'boma_staff_session',
]

function clearedNames(): string[] {
  return mockStore.set.mock.calls
    .filter(([,, opts]: unknown[]) => !!opts && (opts as { maxAge?: number }).maxAge === 0)
    .map(([name]: unknown[]) => String(name))
}

describe('auth route logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST logout clears every auth cookie', async () => {
    const req = new NextRequest('https://x.test/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    const res = await POST(req)
    expect(await res.json()).toEqual({ success: true })
    expect(clearedNames().sort()).toEqual([...ALL_AUTH_COOKIES].sort())
  })

  it('GET logout clears every auth cookie and redirects to /staff/login', async () => {
    const req = new NextRequest('https://x.test/api/admin/auth?action=logout')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://x.test/staff/login')
    expect(clearedNames().sort()).toEqual([...ALL_AUTH_COOKIES].sort())
  })

  it('GET logout honors same-origin redirect param', async () => {
    const req = new NextRequest('https://x.test/api/admin/auth?action=logout&redirect=/admin/login')
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://x.test/admin/login')
  })

  it('GET logout rejects external and protocol-relative redirects', async () => {
    for (const evil of ['https://evil.com', '//evil.com']) {
      const req = new NextRequest(`https://x.test/api/admin/auth?action=logout&redirect=${encodeURIComponent(evil)}`)
      const res = await GET(req)
      expect(res.headers.get('location')).toBe('https://x.test/staff/login')
    }
  })

  it('GET logout ends the individual admin session when its cookie is present', async () => {
    mockStore.get.mockReturnValueOnce({ value: 'sess-1' })
    const req = new NextRequest('https://x.test/api/admin/auth?action=logout')
    await GET(req)
    const { endAdminSession } = await import('@/lib/admin/session')
    expect(endAdminSession).toHaveBeenCalledWith('sess-1', 'user_logout')
  })
})