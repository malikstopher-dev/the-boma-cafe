import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { hashPassword } from '@/lib/admin/password'
import { logAdminAction } from '@/lib/admin/audit'
import { getAdminContext } from '@/lib/admin/context'
import type { AdminRole } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

const VALID_ROLES: AdminRole[] = ['owner', 'full_manager', 'manager', 'assistant_manager']

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'view:accounts')
  if (authError) return authError

  const { data, error } = await getAdminClient()
    .from('admin_accounts')
    .select('id, username, display_name, email, role, is_active, must_change_password, failed_attempts, locked_until, last_login_at, created_at, created_by')
    .order('display_name')

  if (error) return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'accounts.write')
  if (authError) return authError

  const admin = await getAdminContext(request)
  const body = await request.json()
  const { username, display_name, role, password } = body

  if (!username || typeof username !== 'string' || !username.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }
  if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  if (role === 'owner') {
    return NextResponse.json({ error: 'Only the owner account may have the owner role' }, { status: 403 })
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Initial password must be at least 6 characters' }, { status: 400 })
  }

  const hash = await hashPassword(password)

  const { data, error } = await getAdminClient()
    .from('admin_accounts')
    .insert({
      username: username.trim().toLowerCase(),
      display_name: display_name.trim(),
      email: 'info@thebomacafe.co.za',
      role,
      password_hash: hash,
      must_change_password: true,
      is_active: true,
      created_by: admin?.adminId || null,
    })
    .select('id, username, display_name, email, role, is_active, must_change_password, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  await logAdminAction({
    adminId: admin?.adminId ?? null,
    adminName: admin?.displayName ?? null,
    adminRole: admin?.role ?? null,
    action: 'admin_accounts.create',
    targetType: 'admin_accounts',
    targetId: data.id,
    after: { username: data.username, role: data.role, display_name: data.display_name },
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
    sessionId: admin?.sessionId ?? null,
  })

  return NextResponse.json({ data }, { status: 201 })
}