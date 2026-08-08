import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { resolveStaffIdentity } from '@/lib/staff/identity'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const identity = await resolveStaffIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  let query = getAdminClient()
    .from('staff_notifications')
    .select('*')
    .in('user_id', identity.aliases)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const identity = await resolveStaffIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { notification_id } = body

    if (!notification_id) {
      return NextResponse.json({ error: 'notification_id required' }, { status: 400 })
    }

    // Ownership check: only the notification's own user can mark it read
    const { data: owned, error: ownerError } = await getAdminClient()
      .from('staff_notifications')
      .select('id')
      .eq('id', notification_id)
      .in('user_id', identity.aliases)
      .maybeSingle()

    if (ownerError) return NextResponse.json({ error: ownerError.message }, { status: 500 })
    if (!owned) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })

    const { error } = await getAdminClient()
      .from('staff_notifications')
      .update({ read: true })
      .eq('id', notification_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}