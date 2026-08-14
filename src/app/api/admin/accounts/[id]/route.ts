import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { hashPassword } from '@/lib/admin/password'
import { logAdminAction } from '@/lib/admin/audit'
import { getAdminContext } from '@/lib/admin/context'
import { endAllSessionsForAdmin } from '@/lib/admin/session'
import type { AdminRole } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

const VALID_ROLES: AdminRole[] = ['owner', 'full_manager', 'manager', 'assistant_manager']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdminPermission(request, 'accounts.write')
  if (authError) return authError

  const admin = await getAdminContext(request)
  const { id } = await params
  const body = await request.json()

  const { data: existing } = await getAdminClient()
    .from('admin_accounts')
    .select('id, username, display_name, role, is_active')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  const before = { ...existing }

  if (body.display_name !== undefined) {
    if (typeof body.display_name !== 'string' || !body.display_name.trim()) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
    }
    updates.display_name = body.display_name.trim()
  }

  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    // Changing role (including the owner account) requires the owner permission
    if (body.role !== existing.role || existing.role === 'owner') {
      const ownerGate = await requireAdminPermission(request, 'accounts.change_role')
      if (ownerGate) return ownerGate
    }
    updates.role = body.role
  }

  if (body.is_active !== undefined) {
    updates.is_active = !!body.is_active
  }

  if (body.password !== undefined) {
    if (typeof body.password !== 'string' || body.password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    updates.password_hash = await hashPassword(body.password)
    updates.must_change_password = true
    // Activation/reset: a freshly set password clears any accumulated
    // failed-attempt lockout so the account is immediately usable.
    updates.failed_attempts = 0
    updates.locked_until = null
    // Changing a password invalidates existing sessions of that admin
    if (existing.id !== admin?.adminId) {
      await endAllSessionsForAdmin(existing.id, 'password_changed')
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await getAdminClient()
    .from('admin_accounts')
    .update(updates)
    .eq('id', id)
    .select('id, username, display_name, email, role, is_active, must_change_password, last_login_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })

  await logAdminAction({
    adminId: admin?.adminId ?? null,
    adminName: admin?.displayName ?? null,
    adminRole: admin?.role ?? null,
    action: 'admin_accounts.update',
    targetType: 'admin_accounts',
    targetId: id,
    before: before as unknown as Record<string, unknown>,
    after: { ...before, ...updates } as unknown as Record<string, unknown>,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
    sessionId: admin?.sessionId ?? null,
  })

  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdminPermission(request, 'accounts.delete')
  if (authError) return authError

  const admin = await getAdminContext(request)
  const { id } = await params

  const { data: existing } = await getAdminClient()
    .from('admin_accounts')
    .select('id, username, display_name, role')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  if (existing.role === 'owner') {
    return NextResponse.json({ error: 'The owner account cannot be deleted' }, { status: 403 })
  }
  if (id === admin?.adminId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 403 })
  }

  // Soft-delete: deactivate (accounts keep audit history references)
  const { error } = await getAdminClient()
    .from('admin_accounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })

  await endAllSessionsForAdmin(id, 'account_deleted')

  await logAdminAction({
    adminId: admin?.adminId ?? null,
    adminName: admin?.displayName ?? null,
    adminRole: admin?.role ?? null,
    action: 'admin_accounts.delete',
    targetType: 'admin_accounts',
    targetId: id,
    before: existing as unknown as Record<string, unknown>,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
    sessionId: admin?.sessionId ?? null,
  })

  return NextResponse.json({ success: true })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // POST /api/admin/accounts/[id] with { action: 'force-logout' } ends all
  // sessions — owner-only emergency control (security.sessions).
  const authError = await requireAdminPermission(request, 'security.sessions')
  if (authError) return authError

  const admin = await getAdminContext(request)
  const { id } = await params
  const body = await request.json()

  if (body.action !== 'force-logout') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { data: existing } = await getAdminClient()
    .from('admin_accounts')
    .select('id, username, display_name')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  await endAllSessionsForAdmin(id, 'force_logout')

  await logAdminAction({
    adminId: admin?.adminId ?? null,
    adminName: admin?.displayName ?? null,
    adminRole: admin?.role ?? null,
    action: 'admin_accounts.force_logout',
    targetType: 'admin_accounts',
    targetId: id,
    after: { username: existing.username },
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
    sessionId: admin?.sessionId ?? null,
  })

  return NextResponse.json({ success: true })
}