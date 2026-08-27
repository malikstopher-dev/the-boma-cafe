import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { isPushOwnerConflict, resolvePushOwner } from '@/lib/push/identity'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const owner = await resolvePushOwner(request)
  if (!owner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { fcm_token, user_id, device_type, app_version } = body

    if (typeof fcm_token !== 'string' || !fcm_token.trim() || fcm_token.length > 4096) {
      return NextResponse.json({ error: 'Valid fcm_token required' }, { status: 400 })
    }
    if (user_id !== undefined && (typeof user_id !== 'string' || !owner.aliases.includes(user_id))) {
      return NextResponse.json({ error: 'Cannot register a token for another user' }, { status: 403 })
    }

    const { data, error } = await getAdminClient()
      .rpc('register_owned_push_subscription', {
        p_user_id: owner.userId,
        p_role: owner.role,
        p_fcm_token: fcm_token,
        p_device_type: typeof device_type === 'string' ? device_type.slice(0, 50) : null,
        p_app_version: typeof app_version === 'string' ? app_version.slice(0, 50) : null,
      })

    if (error) {
      if (isPushOwnerConflict(error)) {
        return NextResponse.json({ error: 'Token belongs to another user' }, { status: 403 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const row = Array.isArray(data) ? data[0] : data
    return NextResponse.json({ success: true, subscription: { id: row?.id, role: owner.role } })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
