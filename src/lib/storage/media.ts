import { getAdminClient } from '@/lib/supabase'

export const PUBLIC_MEDIA_BUCKET = 'menu-images'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function imageExtension(contentType: string): string | null {
  return EXTENSIONS[contentType] ?? null
}

export async function uploadPublicImage(file: File, prefix: string): Promise<{ path: string; url: string }> {
  const ext = imageExtension(file.type)
  if (!ext) throw new Error('Unsupported image type')

  const client = getAdminClient()
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`
  const { error } = await client.storage.from(PUBLIC_MEDIA_BUCKET).upload(
    path,
    Buffer.from(await file.arrayBuffer()),
    { contentType: file.type, upsert: false }
  )
  if (error) throw new Error(error.message)

  return {
    path,
    url: client.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl,
  }
}

export async function removeStorageObjectOrQueue(bucket: string, path: string): Promise<boolean> {
  const client = getAdminClient()
  const { error } = await client.storage.from(bucket).remove([path])
  if (!error) return true

  const { error: queueError } = await client.rpc('enqueue_storage_cleanup', {
    p_bucket: bucket,
    p_path: path,
  })
  if (queueError) {
    console.error('Failed to remove or queue storage cleanup', {
      bucket, path, error: error.message, queueError: queueError.message,
    })
    return false
  }
  return true
}
