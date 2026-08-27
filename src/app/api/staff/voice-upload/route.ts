// POST /api/staff/voice-upload — Validate and store a private voice note.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { resolveStaffIdentity } from '@/lib/staff/identity'
import { isWebmVoice, MAX_VOICE_BYTES, STAFF_MEDIA_BUCKET, VOICE_CONTENT_TYPE } from '@/lib/staff/voice-media'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const identity = await resolveStaffIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const conversationId = formData.get('conversation_id')
    const file = formData.get('file')

    if (typeof conversationId !== 'string' || !conversationId || !(file instanceof File)) {
      return NextResponse.json({ error: 'conversation_id and file required' }, { status: 400 })
    }

    const { data: membership, error: membershipError } = await getAdminClient()
      .from('staff_conversation_members')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .in('user_id', identity.aliases)
      .maybeSingle()
    if (membershipError) return NextResponse.json({ error: 'Could not verify conversation membership' }, { status: 500 })
    if (!membership && !identity.isAdmin) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 })
    }

    if (file.size <= 0 || file.size > MAX_VOICE_BYTES) {
      return NextResponse.json({ error: 'Voice note must be between 1 byte and 10MB' }, { status: 413 })
    }
    if (file.type !== VOICE_CONTENT_TYPE) {
      return NextResponse.json({ error: 'Only WebM voice notes are allowed' }, { status: 415 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!isWebmVoice(bytes)) {
      return NextResponse.json({ error: 'Voice note content is not valid WebM' }, { status: 415 })
    }

    const filePath = `voice-notes/${conversationId}/${crypto.randomUUID()}.webm`
    const bucket = getAdminClient().storage.from(STAFF_MEDIA_BUCKET)
    const { error: uploadError } = await bucket.upload(filePath, bytes, {
      contentType: VOICE_CONTENT_TYPE,
      upsert: false,
    })
    if (uploadError) return NextResponse.json({ error: 'Failed to upload voice note' }, { status: 500 })

    const { data: signed, error: signError } = await bucket.createSignedUrl(filePath, 60 * 60)
    if (signError || !signed?.signedUrl) {
      await bucket.remove([filePath])
      return NextResponse.json({ error: 'Failed to secure voice note' }, { status: 500 })
    }

    return NextResponse.json({ storage_path: filePath, voice_url: signed.signedUrl })
  } catch (error) {
    console.error('[Voice Upload] Error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
