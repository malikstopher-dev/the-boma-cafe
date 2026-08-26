import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { can } from '@/lib/admin/permissions'

const mocks = vi.hoisted(() => ({
  adminContext: vi.fn(),
  staffIdentity: vi.fn(),
  requirePermission: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/admin/context', () => ({
  getAdminContext: mocks.adminContext,
}))

vi.mock('@/lib/staff/identity', () => ({
  resolveStaffIdentity: mocks.staffIdentity,
}))

vi.mock('@/lib/auth/requireRole', () => ({
  requireAdminPermission: mocks.requirePermission,
}))

vi.mock('@/lib/supabase', () => ({
  getAdminClient: () => ({ from: mocks.from }),
}))

import { GET, PATCH, POST } from '@/app/api/staff/profiles/route'

const PROFILE = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  user_id: 'EMP-1',
  name: 'Staff One',
  role: 'waiter',
  employee_id: 'EMP-1',
  avatar_url: null,
  phone: '0710000000',
  on_duty: true,
  online: true,
  last_seen: '2026-08-26T10:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  pin_hash: 'must-not-leak',
  pin_salt: 'must-not-leak',
  failed_attempts: 3,
  session_started_at: 'secret',
}

function req(method: string, body?: unknown, query = ''): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) init.body = JSON.stringify(body)
  return new NextRequest(`https://x.test/api/staff/profiles${query}`, init)
}

function chain(result: { data: unknown; error: unknown }) {
  const c: any = {}
  c.select = vi.fn(() => c)
  c.update = vi.fn(() => c)
  c.eq = vi.fn(() => c)
  c.or = vi.fn(() => c)
  c.limit = vi.fn(() => c)
  c.order = vi.fn(() => c)
  c.maybeSingle = vi.fn(async () => result)
  c.then = (resolve?: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return c
}

function staff(role: 'kitchen' | 'bar' | 'waiter') {
  return {
    role,
    staffId: PROFILE.id,
    employeeId: 'EMP-1',
    userId: 'EMP-1',
    name: 'Staff One',
    textId: 'EMP-1',
    aliases: ['EMP-1', PROFILE.id],
    isAdmin: false,
  }
}

function setAdmin(role: 'owner' | 'full_manager' | 'manager' | 'assistant_manager') {
  const context = { adminId: 'a1', username: role, displayName: role, role, legacy: false, sessionId: 's1' }
  mocks.adminContext.mockResolvedValue(context)
  mocks.staffIdentity.mockResolvedValue(null)
  mocks.requirePermission.mockImplementation(async (_request: NextRequest, permission: Parameters<typeof can>[1]) =>
    can(role, permission) ? null : NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.from.mockReset()
  mocks.adminContext.mockResolvedValue(null)
  mocks.staffIdentity.mockResolvedValue(staff('waiter'))
  mocks.requirePermission.mockResolvedValue(NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }))
})

describe('staff presence profile self-service', () => {
  it.each(['kitchen', 'bar', 'waiter'] as const)('%s can update only its derived profile', async (role) => {
    mocks.staffIdentity.mockResolvedValue(staff(role))
    const find = chain({ data: PROFILE, error: null })
    const update = chain({ data: { ...PROFILE, online: false }, error: null })
    mocks.from.mockImplementationOnce(() => find).mockImplementationOnce(() => update)

    const response = await PATCH(req('PATCH', { online: false }))
    expect(response.status).toBe(200)
    expect(update.update).toHaveBeenCalledOnce()
    expect(update.update.mock.calls[0][0]).toMatchObject({ online: false })
    expect(update.update.mock.calls[0][0]).not.toHaveProperty('user_id')
    expect(update.eq).toHaveBeenCalledWith('id', PROFILE.id)
  })

  it.each(['user_id', 'role', 'employee_id', 'pin_hash', 'session_started_at', 'profile_id'])(
    'rejects forged or security field %s before updating',
    async (field) => {
      const find = chain({ data: PROFILE, error: null })
      mocks.from.mockImplementationOnce(() => find)
      const response = await PATCH(req('PATCH', { online: false, [field]: 'forged' }))
      expect(response.status).toBe(400)
      expect(mocks.from).toHaveBeenCalledTimes(1)
    },
  )

  it('returns an explicit safe DTO without PIN or session metadata', async () => {
    mocks.from.mockImplementationOnce(() => chain({ data: PROFILE, error: null }))
    const response = await GET(req('GET'))
    const json = await response.json()
    const serialized = JSON.stringify(json)
    expect(response.status).toBe(200)
    expect(serialized).not.toContain('pin_hash')
    expect(serialized).not.toContain('pin_salt')
    expect(serialized).not.toContain('failed_attempts')
    expect(serialized).not.toContain('session_started_at')
    expect(Object.keys(json).sort()).toEqual([
      'avatar_url', 'created_at', 'employee_id', 'id', 'last_seen', 'name',
      'on_duty', 'online', 'phone', 'role', 'user_id',
    ].sort())
  })
})

describe('staff profile management permission matrix', () => {
  it('assistant manager cannot list, update, or create profiles', async () => {
    setAdmin('assistant_manager')
    expect((await GET(req('GET'))).status).toBe(403)
    expect((await PATCH(req('PATCH', { profile_id: PROFILE.id, online: false }))).status).toBe(403)
    expect((await POST(req('POST', { role: 'waiter' }))).status).toBe(403)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it.each(['manager', 'full_manager', 'owner'] as const)('%s passes management permissions', async (role) => {
    setAdmin(role)
    mocks.from
      .mockImplementationOnce(() => chain({ data: [PROFILE], error: null }))
      .mockImplementationOnce(() => chain({ data: PROFILE, error: null }))

    expect((await GET(req('GET'))).status).toBe(200)
    expect((await PATCH(req('PATCH', { profile_id: PROFILE.id, on_duty: false }))).status).toBe(200)
    expect((await POST(req('POST', { role: 'waiter' }))).status).toBe(405)
  })
})
