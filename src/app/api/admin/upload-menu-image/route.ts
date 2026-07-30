import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024
const BUCKET = 'menu-images'
const MODULES = ['food', 'drinks', 'categories', 'promotions', 'events', 'gallery'] as const

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const module = formData.get('module') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!module || !MODULES.includes(module as any)) {
      return NextResponse.json({ error: 'Invalid module' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    const client = await getAdminClient()

    const { data: bucket } = await client.storage.getBucket(BUCKET)
    if (!bucket) {
      const { error: createError } = await client.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE,
      })
      if (createError) {
        console.error('Failed to create bucket:', createError)
        return NextResponse.json({ error: 'Storage not available' }, { status: 500 })
      }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const uuid = crypto.randomUUID()
    const storagePath = `${module}/${uuid}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) {
      console.error('Upload failed:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { data: publicUrl } = client.storage.from(BUCKET).getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      storagePath,
      url: publicUrl.publicUrl,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
