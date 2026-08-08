// GET /api/staff/list — List staff members for login screen
// Returns: { staff: [{ id, employee_id, name, role, has_pin, on_duty }] }

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')

  let query = getAdminClient()
    .from('staff_profiles')
    .select('id, user_id, employee_id, name, role, pin_hash, on_duty, online')
    .order('name')

  if (role) {
    query = query.eq('role', role)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to load staff' }, { status: 500 })
  }

  const staff = (data || []).map(s => ({
    id: s.id,
    user_id: s.user_id,
    employee_id: s.employee_id,
    name: s.name,
    role: s.role,
    has_pin: !!s.pin_hash,
    on_duty: s.on_duty,
    online: s.online,
  }))

  return NextResponse.json({ staff })
}
