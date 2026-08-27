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
    const { fcm_token, user_id } = body

    if (typeof fcm_token !== 'string' || !fcm_token.trim() || fcm_token.length > 4096) {
      return NextResponse.json({ error: 'Valid fcm_token required' }, { status: 400 })
    }
    if (user_id !== undefined && (typeof user_id !== 'string' || !owner.aliases.includes(user_id))) {
      return NextResponse.json({ error: 'Cannot unregister a token for another user' }, { status: 403 })
    }

    const { error } = await getAdminClient().rpc('unregister_owned_push_subscription', {
      p_user_id: owner.userId,
      p_fcm_token: fcm_token,
    })
    if (error) {
      if (isPushOwnerConflict(error)) {
        return NextResponse.json({ error: 'Token belongs to another user' }, { status: 403 })
      }
      if (error.message?.includes('push_subscription_not_found')) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
