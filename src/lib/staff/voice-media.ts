import { getAdminClient } from '@/lib/supabase'

export const STAFF_MEDIA_BUCKET = 'staff-media'
export const MAX_VOICE_BYTES = 10 * 1024 * 1024
export const VOICE_CONTENT_TYPE = 'audio/webm'

export function isWebmVoice(bytes: Uint8Array): boolean {
  if (bytes.length < 8
    || bytes[0] !== 0x1a
    || bytes[1] !== 0x45
    || bytes[2] !== 0xdf
    || bytes[3] !== 0xa3) return false
  const header = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 4096))).toLowerCase()
  return header.includes('webm')
}

export function isPrivateVoicePath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('voice-notes/') && !value.includes('..')
}

export function voiceStoragePath(value: unknown): string | null {
  if (isPrivateVoicePath(value)) return value
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const marker = `/storage/v1/object/public/${STAFF_MEDIA_BUCKET}/`
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex < 0) return null
    const path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    return isPrivateVoicePath(path) ? path : null
  } catch {
    return null
  }
}

export async function signVoiceUrl(value: unknown): Promise<unknown> {
  const path = voiceStoragePath(value)
  if (!path) return value
  const { data, error } = await getAdminClient().storage
    .from(STAFF_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60)
  return error || !data?.signedUrl ? null : data.signedUrl
}

export async function signVoiceMessage<T extends Record<string, unknown>>(message: T): Promise<T> {
  if (message.message_type !== 'voice' || !message.voice_url) return message
  return { ...message, voice_url: await signVoiceUrl(message.voice_url) }
}
