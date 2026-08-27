import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { resolveStaffIdentity, memberIdExists } from '@/lib/staff/identity'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const identity = await resolveStaffIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Identity is derived from the validated session; the client-supplied
  // user_id param (if any) is ignored entirely.
  const query = getAdminClient()
    .from('staff_conversations')
    .select(`
      *,
      members:staff_conversation_members(*),
      last_message:staff_messages(
        id, message, message_type, sender_id, created_at
      )
    `)
    .filter('members.user_id', 'in', `(${identity.aliases.map((a) => `"${a}"`).join(',')})`)
    .order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // For each conversation, get last message and unread count
  const conversations = await Promise.all(
    (data || []).map(async (conv) => {
      const { data: msgs } = await getAdminClient()
        .from('staff_messages')
        .select('id, message, message_type, sender_id, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const { count } = await getAdminClient()
        .from('staff_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .not('sender_id', 'in', identity.aliases)
        .is('read_at', null)
      const unread_count = count || 0

      return { ...conv, last_message: msgs?.[0] || null, unread_count }
    })
  )

  return NextResponse.json(conversations)
}

export async function POST(request: NextRequest) {
  const identity = await resolveStaffIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    let { member_ids, title } = body

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length < 2) {
      return NextResponse.json({ error: 'At least 2 member_ids required' }, { status: 400 })
    }

    // Ensure the caller is always a member (identity derived server-side,
    // never spoofable), and reject ids that do not resolve to real staff
    // or role-based session identities.
    const uniqueIds = Array.from(new Set(member_ids as string[]))
    if (!uniqueIds.some((id) => identity.aliases.includes(id))) {
      uniqueIds.push(identity.textId)
    }

    for (const id of uniqueIds) {
      if (!(await memberIdExists(id))) {
        return NextResponse.json({ error: `Unknown member id: ${id}` }, { status: 400 })
      }
    }

    const { data: conv, error: convError } = await getAdminClient().rpc('create_staff_conversation', {
      p_member_ids: uniqueIds,
      p_title: title || null,
    })
    if (convError) return NextResponse.json({ error: convError.message }, { status: 500 })
    return NextResponse.json(conv)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
