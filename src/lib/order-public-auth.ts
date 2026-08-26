import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const PROOF_TTL_SECONDS = 15 * 60

function getProofSecret(): string {
  const secret = process.env.ORDER_PUBLIC_AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('ORDER_PUBLIC_AUTH_SECRET must be configured with at least 32 characters')
  }
  return secret
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function generateOrderTrackingToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashOrderTrackingToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function verifyOrderTrackingToken(token: string | null, expectedHash: string | null): boolean {
  if (!token || !expectedHash || token.length > 256) return false
  return safeEqual(hashOrderTrackingToken(token), expectedHash)
}

export function orderAccessCookieName(orderRef: string): string {
  const suffix = createHash('sha256').update(orderRef).digest('hex').slice(0, 20)
  return `boma_order_access_${suffix}`
}

export function createOrderAccessProof(orderRef: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({
    ref: orderRef,
    exp: Math.floor(now / 1000) + PROOF_TTL_SECONDS,
  })).toString('base64url')
  const signature = createHmac('sha256', getProofSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyOrderAccessProof(orderRef: string, proof: string | null | undefined, now = Date.now()): boolean {
  if (!proof || proof.length > 1024) return false
  const [payload, signature, extra] = proof.split('.')
  if (!payload || !signature || extra) return false

  const expected = createHmac('sha256', getProofSecret()).update(payload).digest('base64url')
  if (!safeEqual(signature, expected)) return false

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { ref?: unknown; exp?: unknown }
    return parsed.ref === orderRef
      && typeof parsed.exp === 'number'
      && parsed.exp >= Math.floor(now / 1000)
  } catch {
    return false
  }
}

export function normalizeOrderPhone(phone: string): string {
  const compact = phone.trim().replace(/[\s()-]+/g, '')
  if (compact.startsWith('+27')) return compact
  if (compact.startsWith('27')) return `+${compact}`
  if (compact.startsWith('0')) return `+27${compact.slice(1)}`
  return `+27${compact}`
}

export function verifyOrderPhone(submitted: string, stored: string): boolean {
  return safeEqual(normalizeOrderPhone(submitted), normalizeOrderPhone(stored))
}

export const ORDER_ACCESS_COOKIE_MAX_AGE = PROOF_TTL_SECONDS
