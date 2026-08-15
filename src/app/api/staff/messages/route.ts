import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { resolveStaffIdentity } from '@/lib/staff/identity'

export const dynamic = 'force-dynamic'

async function isConversationMember(conversationId: string, aliases: string[]): Promise<boolean> {
  const { data } = await getAdminClient()
    .from('staff_conversation_members')
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .in('user_id', aliases)
    .maybeSingle()
  return !!data
}

export async function GET(request: NextRequest) {
  const identity = await resolveStaffIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')
  const messageId = searchParams.get('message_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const before = searchParams.get('before')

  if (messageId) {
    const { data: msg, error: msgError } = await getAdminClient()
      .from('staff_messages')
      .select('*')
      .eq('id', messageId)
      .maybeSingle()
    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })
    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const member = await isConversationMember(msg.conversation_id, identity.aliases)
    if (!member && !identity.isAdmin) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 })
    }
    return NextResponse.json(msg)
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id or message_id required' }, { status: 400 })
  }

  const member = await isConversationMember(conversationId, identity.aliases)
  if (!member && !identity.isAdmin) {
    return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 })
  }

  let query = getAdminClient()
    .from('staff_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((data || []).reverse())
}

export async function POST(request: NextRequest) {
  const identity = await resolveStaffIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { conversation_id, message, message_type, voice_url, voice_duration } = body

    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
    }

    if (!message && !voice_url) {
      return NextResponse.json({ error: 'message or voice_url required' }, { status: 400 })
    }

    const senderId = identity.textId

    const member = await isConversationMember(conversation_id, identity.aliases)
    if (!member && !identity.isAdmin) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 })
    }

    const { data, error } = await getAdminClient()
      .from('staff_messages')
      .insert({
        conversation_id,
        sender_id: senderId,
        message: message || null,
        message_type: message_type || 'text',
        voice_url: voice_url || null,
        voice_duration: voice_duration || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Create notifications for other conversation members
    const { data: memberRows } = await getAdminClient()
      .from('staff_conversation_members')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .neq('user_id', senderId)

    if (memberRows) {
      const notifications = memberRows.map((m: { user_id: string }) => ({
        user_id: m.user_id,
        type: 'new_message',
        title: 'New Message',
        message: message || '🎤 Voice message',
        metadata: { conversation_id, sender_id: senderId },
      }))
      await getAdminClient().from('staff_notifications').insert(notifications)
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const identity = await resolveStaffIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { conversation_id } = body

    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
    }

    const member = await isConversationMember(conversation_id, identity.aliases)
    if (!member && !identity.isAdmin) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 })
    }

    const { error } = await getAdminClient()
      .from('staff_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id)
      .neq('sender_id', identity.textId)
      .is('read_at', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}