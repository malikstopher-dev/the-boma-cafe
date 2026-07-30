const SUPA_IMAGE_BUCKET = 'menu-images'

export function resolveImage(value?: string | null): string | null {
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) return value
  return `/api/supa-image?bucket=${SUPA_IMAGE_BUCKET}&path=${encodeURIComponent(value)}`
}
