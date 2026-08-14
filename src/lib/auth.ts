import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash, timingSafeEqual } from 'node:crypto'
import { validateAdminSession } from '@/lib/admin/session'

const ADMIN_COOKIE = 'boma_admin_auth'
const KITCHEN_COOKIE = 'boma_kitchen_auth'
const WAITER_COOKIE = 'boma_waiter_auth'
const BAR_COOKIE = 'boma_bar_auth'
const ADMIN_SESSION_COOKIE = 'boma_admin_session'

export type Role = 'admin' | 'kitchen' | 'waiter' | 'bar'

export interface Session {
  role: Role
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD
const WAITER_PASSWORD = process.env.WAITER_PASSWORD
const BAR_PASSWORD = process.env.BAR_PASSWORD

if (!ADMIN_PASSWORD) console.error('[auth] CRITICAL: ADMIN_PASSWORD env var is not set — admin login will fail and server may be vulnerable')

function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function expectedCookieValue(role: Role): string {
  const secret = role === 'admin' ? ADMIN_PASSWORD : role === 'kitchen' ? KITCHEN_PASSWORD : role === 'waiter' ? WAITER_PASSWORD : BAR_PASSWORD
  return createHash('sha256').update(`${role}:${secret}`).digest('hex')
}

/**
 * Fast role check: reads x-user-role header set by middleware (no cookie re-hash).
 * This is the preferred path for API routes called after middleware runs.
 */
export function getRoleFromHeaders(headers: Headers): Session | null {
  const role = headers.get('x-user-role') as Role | null
  if (role === 'admin' || role === 'kitchen' || role === 'bar' || role === 'waiter') {
    return { role }
  }
  return null
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const admin = cookieStore.get(ADMIN_COOKIE)
  const kitchen = cookieStore.get(KITCHEN_COOKIE)
  const waiter = cookieStore.get(WAITER_COOKIE)
  const bar = cookieStore.get(BAR_COOKIE)
  const adminSession = cookieStore.get(ADMIN_SESSION_COOKIE)

  // Highest precedence: individual admin session → legacy admin → kitchen → bar → waiter
  if (adminSession?.value) {
    const info = await validateAdminSession(adminSession.value)
    if (info) return { role: 'admin' }
  }
  if (admin?.value && timingSafeCompare(admin.value, expectedCookieValue('admin'))) return { role: 'admin' }
  if (kitchen?.value && timingSafeCompare(kitchen.value, expectedCookieValue('kitchen'))) return { role: 'kitchen' }
  if (bar?.value && timingSafeCompare(bar.value, expectedCookieValue('bar'))) return { role: 'bar' }
  if (waiter?.value && timingSafeCompare(waiter.value, expectedCookieValue('waiter'))) return { role: 'waiter' }

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
