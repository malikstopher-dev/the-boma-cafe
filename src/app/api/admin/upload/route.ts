import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { generateStoragePath, BUCKET } from '@/lib/storage'
import { removeStorageObjectOrQueue } from '@/lib/storage/media'

export const dynamic = 'force-dynamic'

const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|svg|mp4|webm|pdf)$/i
const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'media.write')
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: jpg, jpeg, png, webp, gif, svg, mp4, webm, pdf' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 25MB.' }, { status: 400 })
    }

    const storagePath = generateStoragePath('media', file.name)
    const client = getAdminClient()

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })

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

    if (mediaError) {
      await removeStorageObjectOrQueue(BUCKET, storagePath)
      return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 })
    }

    return NextResponse.json({ data: mediaData })
  } catch (err: any) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
