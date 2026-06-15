import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash } from 'node:crypto'

const ADMIN_COOKIE = 'boma_admin_auth'
const KITCHEN_COOKIE = 'boma_kitchen_auth'
const WAITER_COOKIE = 'boma_waiter_auth'

export type Role = 'admin' | 'kitchen' | 'waiter'

export interface Session {
  role: Role
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD || ''
const WAITER_PASSWORD = process.env.WAITER_PASSWORD || ''

export function expectedCookieValue(role: Role): string {
  const secret = role === 'admin' ? ADMIN_PASSWORD : role === 'kitchen' ? KITCHEN_PASSWORD : WAITER_PASSWORD
  return createHash('sha256').update(`${role}:${secret}`).digest('hex')
}

/**
 * Fast role check: reads x-user-role header set by middleware (no cookie re-hash).
 * This is the preferred path for API routes called after middleware runs.
 */
export function getRoleFromHeaders(headers: Headers): Session | null {
  const role = headers.get('x-user-role') as Role | null
  if (role === 'admin' || role === 'kitchen') {
    return { role }
  }
  return null
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const admin = cookieStore.get(ADMIN_COOKIE)
  const kitchen = cookieStore.get(KITCHEN_COOKIE)
  const waiter = cookieStore.get(WAITER_COOKIE)

  if (admin?.value && admin.value === expectedCookieValue('admin')) return { role: 'admin' }
  if (kitchen?.value && kitchen.value === expectedCookieValue('kitchen')) return { role: 'kitchen' }
  if (waiter?.value && waiter.value === expectedCookieValue('waiter')) return { role: 'waiter' }

  return null
}

export async function requireRole(role: Role): Promise<NextResponse | null> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role !== role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function requireAnyRole(roles: Role[]): Promise<NextResponse | null> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!roles.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function assertAuthenticated(): Promise<NextResponse | null> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * Middleware-based auth check for API route handlers.
 * Uses x-user-role header (set by middleware) to avoid re-hashing cookies.
 * Falls back to cookie-based getSession() for non-middleware routes.
 */
export async function requireRoleFromHeadersOrSession(
  headers: Headers,
  roles: Role[],
): Promise<NextResponse | null> {
  const fromHeaders = getRoleFromHeaders(headers)
  if (fromHeaders && roles.includes(fromHeaders.role)) return null
  if (fromHeaders && !roles.includes(fromHeaders.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fallback: check cookies directly (for routes bypassing middleware or waiter)
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!roles.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
