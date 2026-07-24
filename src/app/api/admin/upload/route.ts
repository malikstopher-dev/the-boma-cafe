import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'
import { generateStoragePath, BUCKET } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const storagePath = generateStoragePath('media', file.name)
    const client = getAdminClient()

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(storagePath)

    const { data: mediaData, error: mediaError } = await client
      .from('media')
      .insert({
        url: urlData.publicUrl,
        alt_text: file.name.replace(/\.[^.]+$/, ''),
        file_name: file.name,
        file_size: file.size,
      })
      .select()
      .single()

    if (mediaError) return NextResponse.json({ error: mediaError.message }, { status: 500 })

    return NextResponse.json({ data: mediaData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
