// GET /api/staff/list — List staff members for login screen
// Public login DTO: opaque selector plus display name/role only.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { PUBLIC_STAFF_LOGIN_ROLES, toPublicStaffLoginDto } from '@/lib/staff/public-login'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  if (role && !PUBLIC_STAFF_LOGIN_ROLES.includes(role as typeof PUBLIC_STAFF_LOGIN_ROLES[number])) {
    return NextResponse.json({ error: 'Invalid staff role' }, { status: 400 })
  }

  let query = getAdminClient()
    .from('staff_profiles')
    .select('id, name, role, pin_hash')
    .in('role', role ? [role] : [...PUBLIC_STAFF_LOGIN_ROLES])
    .not('pin_hash', 'is', null)
    .order('name')

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to load staff' }, { status: 500 })
  }

  const staff = (data || []).map(toPublicStaffLoginDto)

  return NextResponse.json({ staff })
}
