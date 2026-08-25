import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { validateAdminSession } from '@/lib/admin/session'

const KITCHEN_COOKIE = 'boma_kitchen_auth'
const WAITER_COOKIE = 'boma_waiter_auth'
const BAR_COOKIE = 'boma_bar_auth'
const ADMIN_SESSION_COOKIE = 'boma_admin_session'
const STAFF_SESSION_COOKIE = 'boma_staff_session'


export type Role = 'admin' | 'kitchen' | 'waiter' | 'bar'

export interface Session {
  role: Role
}

export type StaffRole = 'kitchen' | 'waiter' | 'bar'

const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD
const WAITER_PASSWORD = process.env.WAITER_PASSWORD
const BAR_PASSWORD = process.env.BAR_PASSWORD
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function expectedCookieValue(role: StaffRole): string {
  const secret = role === 'kitchen' ? KITCHEN_PASSWORD : role === 'waiter' ? WAITER_PASSWORD : BAR_PASSWORD
  return createHash('sha256').update(`${role}:${secret}`).digest('hex')
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const kitchen = cookieStore.get(KITCHEN_COOKIE)
  const waiter = cookieStore.get(WAITER_COOKIE)
  const bar = cookieStore.get(BAR_COOKIE)
  const adminSession = cookieStore.get(ADMIN_SESSION_COOKIE)

  // Highest precedence: individual admin session → kitchen → bar → waiter
  if (adminSession?.value) {
    const info = await validateAdminSession(adminSession.value)
    if (info) return { role: 'admin' }
  }
  if (kitchen?.value && timingSafeCompare(kitchen.value, expectedCookieValue('kitchen'))) return { role: 'kitchen' }
  if (bar?.value && timingSafeCompare(bar.value, expectedCookieValue('bar'))) return { role: 'bar' }
  if (waiter?.value && timingSafeCompare(waiter.value, expectedCookieValue('waiter'))) return { role: 'waiter' }

  // PIN-based staff session (waiter/kitchen/bar PWA logins). The middleware
  // validates this cookie for page/API routing, but route handlers resolve
  // identity from cookies only (SYNC-1C) — so getSession must understand it
  // too, or PIN-logged-in staff are anonymous to every cookie-only route
  // (orders POST stripped waiter_name → "Phone number is required" → orders
  // created as source='online' → stuck behind admin confirmation).
  const staffSession = cookieStore.get(STAFF_SESSION_COOKIE)
  if (staffSession?.value && SUPABASE_URL && SERVICE_KEY) {
    try {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
      const { data } = await sb
        .from('staff_sessions')
        .select('id, role, signed_out_at, expires_at, last_active_at')
        .eq('id', staffSession.value)
        .is('signed_out_at', null)
        .maybeSingle()
      if (data) {
        const now = new Date()
        const expired = now > new Date(data.expires_at as string)
        if (!expired) {
          const role = data.role as Role
          if (role === 'admin' || role === 'kitchen' || role === 'bar' || role === 'waiter') {
            return { role }
          }
        }
      }
    } catch {
      // fall through → unauthenticated
    }
  }

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
 * Cookie/session-based auth check for API route handlers. Request headers are
 * deliberately ignored because callers can forge them before middleware.
 */
export async function requireRoleFromHeadersOrSession(
  _headers: Headers,
  roles: Role[],
): Promise<NextResponse | null> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!roles.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
