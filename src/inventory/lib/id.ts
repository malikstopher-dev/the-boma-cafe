export function createId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid

  // Fallback for environments without crypto.randomUUID (older Node/browsers).
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (RFC 4122 v4)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}