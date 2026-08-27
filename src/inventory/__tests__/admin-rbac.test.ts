import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = { from: vi.fn() }

vi.mock('@/lib/supabase', () => ({
  getAdminClient: vi.fn(() => mockClient),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => (name === 'boma_admin_session' ? { value: 'sess-1' } : undefined)),
  })),
}))

import { createAdminSession, validateAdminSession, endAllSessionsForAdmin } from '@/lib/admin/session'
import { logAdminAction, getAdminAuditLog } from '@/lib/admin/audit'
import { hashPassword, verifyPassword } from '@/lib/admin/password'
import { can, roleLabel } from '@/lib/admin/permissions'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { NextRequest } from 'next/server'
import type { AdminAccount, AdminRole } from '@/lib/admin/types'
import { POST as changePassword } from '@/app/api/admin/auth/change-password/route'

// Chain builder: from('table') -> select/insert/update/eq/is/order/limit -> maybeSingle/single.
// The chain is also awaitable (resolves to the terminal {data, error}).
function chain(terminal: () => Promise<{ data: any; error: any }> = async () => ({ data: null, error: null })) {
  const c: any = {}
  c.select = vi.fn(() => c)
  c.insert = vi.fn(() => c)
  c.update = vi.fn(() => c)
  c.eq = vi.fn(() => c)
  c.is = vi.fn(() => c)
  c.order = vi.fn(() => c)
  c.limit = vi.fn(() => c)
  c.maybeSingle = vi.fn(terminal)
  c.single = vi.fn(terminal)
  c.then = (onFulfilled: any, onRejected: any) => terminal().then(onFulfilled, onRejected)
  return c
}

const ok = (data: any) => ({ data, error: null })
const fail = (message: string) => ({ data: null, error: { message } })

const ALL_PERMISSIONS = [
  'view:owner_dashboard', 'view:reports', 'view:staff_management', 'view:settings',
  'view:accounts', 'waiter.write', 'waiter.pin_reset', 'settings.write', 'pricing.write',
  'cms.write', 'bar_menu.write', 'media.write', 'background_jobs.read', 'background_jobs.write',
  'inventory.config.write', 'inventory.approve', 'inventory.final_approve',
  'inventory.destructive', 'accounts.write', 'accounts.delete', 'accounts.change_role',
  'security.settings', 'security.sessions', 'supplier.bank.read', 'supplier.bank.write',
  'supplier.bank.delete', 'supplier.finance.read', 'supplier.finance.write',
] as const

const OWNER_ONLY = ['accounts.delete', 'accounts.change_role', 'security.settings', 'security.sessions', 'supplier.bank.delete']

describe('permissions matrix', () => {
  it('owner has every permission', () => {
    for (const p of ALL_PERMISSIONS) expect(can('owner', p)).toBe(true)
  })

  it('full_manager lacks accounts.delete, accounts.change_role, security.settings, security.sessions', () => {
    for (const p of ALL_PERMISSIONS) {
      expect(can('full_manager', p)).toBe(!OWNER_ONLY.includes(p))
    }
  })

  it('owner-only: force-logout (security.sessions) belongs to the owner alone', () => {
    expect(can('owner', 'security.sessions')).toBe(true)
    for (const role of ['full_manager', 'manager', 'assistant_manager'] as const) {
      expect(can(role, 'security.sessions')).toBe(false)
    }
  })

  it('manager has exactly the operational set', () => {
    const expected = [
      'view:reports', 'view:staff_management', 'view:settings', 'waiter.write',
      'waiter.pin_reset', 'inventory.config.write', 'inventory.approve',
    ]
    for (const p of ALL_PERMISSIONS) expect(can('manager', p)).toBe(expected.includes(p))
  })

  it('assistant_manager only resets PINs', () => {
    for (const p of ALL_PERMISSIONS) expect(can('assistant_manager', p)).toBe(p === 'waiter.pin_reset')
  })

  it('roleLabel maps every role', () => {
    expect(roleLabel('owner')).toBe('Owner')
    expect(roleLabel('full_manager')).toBe('Main Manager')
    expect(roleLabel('manager')).toBe('Manager')
    expect(roleLabel('assistant_manager')).toBe('Assistant Manager')
  })
})

describe('password hashing', () => {
  it('hashes and verifies a roundtrip', async () => {
    const hash = await hashPassword('S3cret-pw!')
    expect(hash).not.toBe('S3cret-pw!')
    expect(hash).toMatch(/^\$2[aby]\$/)
    expect(await verifyPassword('S3cret-pw!', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})

describe('admin sessions', () => {
  const account = {
    id: 'adm-1', username: 'mahindra', display_name: 'Mahindra', role: 'owner' as AdminRole,
  } as AdminAccount

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.from.mockReset()
  })

  it('createAdminSession inserts and returns session info', async () => {
    const c = chain(() => Promise.resolve(ok({ id: 'sess-1' })))
    mockClient.from.mockImplementation(() => c)

    const info = await createAdminSession(account, 'fp123', 'Chrome', 'UA', '1.2.3.4')

    expect(mockClient.from).toHaveBeenCalledWith('admin_sessions')
    expect(c.insert).toHaveBeenCalled()
    const inserted = c.insert.mock.calls[0][0]
    expect(inserted.admin_id).toBe('adm-1')
    expect(inserted.session_token).toMatch(/^[0-9a-f]{64}$/)
    expect(inserted.device_fingerprint).toBe('fp123')
    expect(info).toMatchObject({ sessionId: 'sess-1', adminId: 'adm-1', username: 'mahindra', role: 'owner' })
  })

  it('createAdminSession returns null when the insert fails', async () => {
    const c = chain(() => Promise.resolve(fail('boom')))
    mockClient.from.mockImplementation(() => c)
    expect(await createAdminSession(account, 'fp', 'UA', 'UA', 'ip')).toBeNull()
  })

  it('validateAdminSession returns info for a live session and bumps last_active_at', async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    mockClient.from
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({
        id: 'sess-1', admin_id: 'adm-1', signed_out_at: null,
        started_at: future, expires_at: future, last_active_at: new Date().toISOString(),
      }))))
      .mockImplementationOnce(() => chain()) // last_active_at update
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({ id: 'adm-1', username: 'mahindra', display_name: 'Mahindra', role: 'owner', is_active: true }))))

    const info = await validateAdminSession('sess-1')
    expect(info).toMatchObject({ sessionId: 'sess-1', adminId: 'adm-1', username: 'mahindra', role: 'owner' })
    expect(mockClient.from).toHaveBeenNthCalledWith(2, 'admin_sessions')
    expect(mockClient.from).toHaveBeenNthCalledWith(3, 'admin_accounts')
  })

  it('validateAdminSession ends an expired session and returns null', async () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    mockClient.from
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({
        id: 'sess-1', admin_id: 'adm-1', signed_out_at: null,
        started_at: past, expires_at: past, last_active_at: past,
      }))))
      .mockImplementationOnce(() => chain()) // endAdminSession update

    const info = await validateAdminSession('sess-1')
    expect(info).toBeNull()
    // signed_out_at must have been stamped with reason timeout
    const updateCalls = mockClient.from.mock.results.filter(r => r.value && r.value.update)
    expect(updateCalls.length).toBeGreaterThan(0)
  })

  it('validateAdminSession rejects an inactive account', async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    mockClient.from
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({
        id: 'sess-1', admin_id: 'adm-1', signed_out_at: null,
        started_at: future, expires_at: future, last_active_at: new Date().toISOString(),
      }))))
      .mockImplementationOnce(() => chain())
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({ id: 'adm-1', username: 'mahindra', display_name: 'Mahindra', role: 'owner', is_active: false }))))

    expect(await validateAdminSession('sess-1')).toBeNull()
  })

  it('endAllSessionsForAdmin signs out every active session', async () => {
    const c = chain(() => Promise.resolve(ok({ data: null, error: null })))
    c.select.mockImplementation(() => c)
    c.is.mockImplementationOnce(() => Promise.resolve({ data: [{ id: 's1' }, { id: 's2' }], error: null }))

    mockClient.from.mockImplementation(() => c)
    await endAllSessionsForAdmin('adm-1', 'security')

    expect(c.select).toHaveBeenCalled()
    expect(c.is).toHaveBeenCalledWith('signed_out_at', null)
    // two session updates
    const updates = c.update.mock.calls
    expect(updates.length).toBe(2)
    for (const u of updates) expect(u[0].signed_out_reason).toBe('security')
  })

  it('endAllSessionsForAdmin keeps the excepted session (password change)', async () => {
    const c = chain(() => Promise.resolve(ok(null)))
    c.is.mockImplementationOnce(() => Promise.resolve({ data: [{ id: 'sess-current' }, { id: 'sess-other' }], error: null }))

    mockClient.from.mockImplementation(() => c)
    await endAllSessionsForAdmin('adm-1', 'password_changed', 'sess-current')

    expect(c.update.mock.calls.length).toBe(1)
    expect(c.update.mock.calls[0][0].signed_out_reason).toBe('password_changed')
    const idEqs = c.eq.mock.calls.filter((args: any[]) => args[0] === 'id').map((args: any[]) => args[1])
    expect(idEqs).toEqual(['sess-other'])
  })
})

describe('requireAdminPermission — identity enforcement', () => {
  const future = new Date(Date.now() + 60_000).toISOString()

  function cookieAccount(role: string, isActive = true) {
    mockClient.from
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({
        id: 'sess-1', admin_id: 'adm-1', signed_out_at: null,
        started_at: future, expires_at: future, last_active_at: new Date().toISOString(),
      }))))
      .mockImplementationOnce(() => chain()) // last_active_at update
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({
        id: 'adm-1', username: 'khosi', display_name: 'Ms Khosi', role, is_active: isActive,
      }))))
  }

  function adminRequest(extraHeaders: Record<string, string> = {}): NextRequest {
    return new NextRequest('http://localhost/api/waiters', {
      headers: { 'x-user-role': 'admin', ...extraHeaders },
    })
  }

  it('forged middleware identity headers are denied without a validated cookie', async () => {
    const res = await requireAdminPermission(
      adminRequest({ 'x-admin-id': 'adm-1', 'x-admin-role': 'assistant_manager' }),
      'waiter.write',
    )
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('assistant_manager via cookie fallback is denied waiter.create/edit/delete and accounts.write', async () => {
    cookieAccount('assistant_manager')
    const res = await requireAdminPermission(
      adminRequest({ cookie: 'boma_admin_session=sess-1' }),
      'waiter.write',
    )
    expect(res).not.toBeNull()
    expect(res!.status).toBe(403)

    cookieAccount('assistant_manager')
    const res2 = await requireAdminPermission(
      adminRequest({ cookie: 'boma_admin_session=sess-1' }),
      'accounts.write',
    )
    expect(res2).not.toBeNull()
    expect(res2!.status).toBe(403)
  })

  it('assistant_manager is allowed waiter.pin_reset', async () => {
    cookieAccount('assistant_manager')
    const res = await requireAdminPermission(
      adminRequest({ cookie: 'boma_admin_session=sess-1' }),
      'waiter.pin_reset',
    )
    expect(res).toBeNull()
  })

  it('manager via cookie fallback is allowed waiter.write', async () => {
    cookieAccount('manager')
    const res = await requireAdminPermission(
      adminRequest({ cookie: 'boma_admin_session=sess-1' }),
      'waiter.write',
    )
    expect(res).toBeNull()
  })

  it('force-logout (security.sessions): full_manager denied, owner allowed', async () => {
    cookieAccount('full_manager')
    const denied = await requireAdminPermission(
      adminRequest({ cookie: 'boma_admin_session=sess-1' }),
      'security.sessions',
    )
    expect(denied).not.toBeNull()
    expect(denied!.status).toBe(403)

    cookieAccount('owner')
    const allowed = await requireAdminPermission(
      adminRequest({ cookie: 'boma_admin_session=sess-1' }),
      'security.sessions',
    )
    expect(allowed).toBeNull()
  })

  it('assistant_manager cookie fallback is enforced even without middleware identity headers (bare /api/waiters path)', async () => {
    cookieAccount('assistant_manager')
    const bareReq = new NextRequest('http://localhost/api/waiters', {
      headers: { cookie: 'boma_admin_session=sess-1' },
    })
    const res = await requireAdminPermission(bareReq, 'waiter.write')
    expect(res).not.toBeNull()
    expect(res!.status).toBe(403)
  })

  it('an unresolvable admin identity is denied', async () => {
    const res = await requireAdminPermission(adminRequest(), 'accounts.delete')
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('forged non-admin headers are denied', async () => {
    const waiterReq = new NextRequest('http://localhost/api/waiters', {
      headers: { 'x-user-role': 'waiter' },
    })
    const res = await requireAdminPermission(waiterReq, 'waiter.pin_reset')
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })
})

describe('admin audit log', () => {
  beforeEach(() => vi.clearAllMocks())

  it('logAdminAction inserts with null-coalesced fields', async () => {
    const c = chain()
    mockClient.from.mockImplementation(() => c)
    await logAdminAction({
      adminId: 'adm-1', adminName: 'Mahindra', adminRole: 'owner',
      action: 'waiters.create', targetType: 'staff_profiles', targetId: 'w-1',
      before: null, after: { name: 'Joe' },
      ipAddress: '1.2.3.4', userAgent: 'UA', sessionId: 'sess-1',
    })
    expect(mockClient.from).toHaveBeenCalledWith('admin_audit_log')
    const row = c.insert.mock.calls[0][0]
    expect(row).toMatchObject({
      admin_id: 'adm-1', admin_name: 'Mahindra', admin_role: 'owner',
      action: 'waiters.create', target_type: 'staff_profiles', target_id: 'w-1',
      after_values: { name: 'Joe' }, ip_address: '1.2.3.4', user_agent: 'UA', session_id: 'sess-1',
    })
    expect(row.before_values).toBeNull()
  })

  it('logAdminAction never throws when the client fails', async () => {
    const c = chain(() => Promise.reject(new Error('down')))
    mockClient.from.mockImplementation(() => c)
    await expect(logAdminAction({
      adminId: null, adminName: null, adminRole: null, action: 'x',
      targetType: undefined, targetId: undefined, before: null, after: null,
      ipAddress: null, userAgent: null, sessionId: null,
    })).resolves.toBeUndefined()
  })

  it('getAdminAuditLog orders desc and applies filters', async () => {
    const c = chain(() => Promise.resolve({ data: [{ id: 'a1' }], error: null }))
    mockClient.from.mockImplementation(() => c)
    const rows = await getAdminAuditLog({ limit: 10, targetType: 'bookings', targetId: 'b-1' })
    expect(rows).toEqual([{ id: 'a1' }])
    expect(c.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(c.eq).toHaveBeenCalledWith('target_type', 'bookings')
    expect(c.eq).toHaveBeenCalledWith('target_id', 'b-1')
  })
})

describe('change-password route (self-service)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.from.mockReset()
  })

  function authReq(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/admin/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-role': 'admin', ...headers },
      body: JSON.stringify(body),
    })
  }

  function validOwnerContext() {
    const future = new Date(Date.now() + 60_000).toISOString()
    mockClient.from
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({
        id: 'sess-current', admin_id: 'adm-1', signed_out_at: null,
        started_at: future, expires_at: future, last_active_at: new Date().toISOString(),
      }))))
      .mockImplementationOnce(() => chain())
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({
        id: 'adm-1', username: 'mahindra', display_name: 'Mr Mahendra', role: 'owner', is_active: true,
      }))))
  }

  it('rejects legacy admins without an individual identity', async () => {
    const res = await changePassword(authReq({ current_password: 'x', new_password: 'yyyyyy' }))
    expect(res.status).toBe(400)
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('rejects missing fields and short new passwords', async () => {
    const headers = { 'x-admin-id': 'adm-1', 'x-admin-role': 'owner' }
    expect((await changePassword(authReq({}, headers))).status).toBe(400)
    expect((await changePassword(authReq({ current_password: 'x', new_password: '123' }, headers))).status).toBe(400)
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('rejects a wrong current password without touching the account', async () => {
    const hash = await hashPassword('Correct-Pw!1')
    validOwnerContext()
    mockClient.from.mockImplementationOnce(() => chain(() => Promise.resolve(ok({ id: 'adm-1', username: 'mahindra', password_hash: hash }))))

    const res = await changePassword(
      authReq({ current_password: 'Wrong-Pw!', new_password: 'New-Pw!234' }, { cookie: 'boma_admin_session=sess-current' }),
    )
    expect(res.status).toBe(401)
    expect(mockClient.from).toHaveBeenCalledTimes(4)
  })

  it('changes the hash, keeps the current session, ends others, and audits', async () => {
    const hash = await hashPassword('Correct-Pw!1')
    const updateChain = chain(() => Promise.resolve(ok({ id: 'adm-1' })))
    const endChain = chain(() => Promise.resolve(ok(null)))

    validOwnerContext()
    mockClient.from
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok({ id: 'adm-1', username: 'mahindra', password_hash: hash }))))
      .mockImplementationOnce(() => updateChain)
      .mockImplementationOnce(() => chain(() => Promise.resolve(ok([{ id: 'sess-current' }, { id: 'sess-other' }]))))
      .mockImplementationOnce(() => endChain)
      .mockImplementationOnce(() => chain())

    const res = await changePassword(
        authReq(
          { current_password: 'Correct-Pw!1', new_password: 'New-Pw!234' },
          { cookie: 'boma_admin_session=sess-current' },
      ),
    )
    expect(res.status).toBe(200)

    const updated = updateChain.update.mock.calls[0][0]
    expect(updated.password_hash).toMatch(/^\$2[aby]\$/)
    expect(updated.password_hash).not.toBe(hash)
    expect(updated.failed_attempts).toBe(0)
    expect(updated.locked_until).toBeNull()
    expect(updated.must_change_password).toBe(false)
    expect(await verifyPassword('New-Pw!234', updated.password_hash)).toBe(true)

    expect(endChain.update.mock.calls.length).toBe(1)
    expect(endChain.update.mock.calls[0][0].signed_out_reason).toBe('password_changed')
    const idEqs = endChain.eq.mock.calls.filter((args: any[]) => args[0] === 'id').map((args: any[]) => args[1])
    expect(idEqs).toEqual(['sess-other'])

    expect(mockClient.from).toHaveBeenNthCalledWith(8, 'admin_audit_log')
    const auditChain = mockClient.from.mock.results[7]!.value as any
    const auditRow = auditChain.insert.mock.calls[0][0]
    expect(auditRow).toMatchObject({
      admin_id: 'adm-1', action: 'admin_accounts.password_change_self',
      target_type: 'admin_accounts', target_id: 'adm-1', session_id: 'sess-current',
    })
  })
})
