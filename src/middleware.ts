import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_COOKIE = 'boma_admin_auth'
const KITCHEN_COOKIE = 'boma_kitchen_auth'
const WAITER_COOKIE = 'boma_waiter_auth'
const BAR_COOKIE = 'boma_bar_auth'
const STAFF_SESSION_COOKIE = 'boma_staff_session'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD
const WAITER_PASSWORD = process.env.WAITER_PASSWORD
const BAR_PASSWORD = process.env.BAR_PASSWORD

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

async function hashSHA256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = new TextEncoder().encode(a)
  const bufB = new TextEncoder().encode(b)
  if (bufA.length !== bufB.length) return false
  let diff = 0
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i]
  }
  return diff === 0
}

type AuthResult = { role: 'admin' | 'kitchen' | 'waiter' | 'bar' } | null

async function verifyRole(request: NextRequest): Promise<AuthResult> {
  if (!ADMIN_PASSWORD || !KITCHEN_PASSWORD || !WAITER_PASSWORD || !BAR_PASSWORD) return null

  const adminCookie = request.cookies.get(ADMIN_COOKIE)
  const kitchenCookie = request.cookies.get(KITCHEN_COOKIE)
  const waiterCookie = request.cookies.get(WAITER_COOKIE)
  const barCookie = request.cookies.get(BAR_COOKIE)
  const staffSessionCookie = request.cookies.get(STAFF_SESSION_COOKIE)

  // Check password-based cookies first (legacy admin auth)
  if (adminCookie?.value) {
    const expected = await hashSHA256(`admin:${ADMIN_PASSWORD}`)
    if (timingSafeCompare(adminCookie.value, expected)) return { role: 'admin' }
  }

  if (kitchenCookie?.value) {
    const expected = await hashSHA256(`kitchen:${KITCHEN_PASSWORD}`)
    if (timingSafeCompare(kitchenCookie.value, expected)) return { role: 'kitchen' }
  }

  if (barCookie?.value) {
    const expected = await hashSHA256(`bar:${BAR_PASSWORD}`)
    if (timingSafeCompare(barCookie.value, expected)) return { role: 'bar' }
  }

  if (waiterCookie?.value) {
    const expected = await hashSHA256(`waiter:${WAITER_PASSWORD}`)
    if (timingSafeCompare(waiterCookie.value, expected)) return { role: 'waiter' }
  }

  // Fallback: check PIN-based staff session cookie
  if (staffSessionCookie?.value && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
      const { data, error } = await supabase
        .from('staff_sessions')
        .select('id, staff_id, role, signed_out_at, expires_at, last_active_at')
        .eq('id', staffSessionCookie.value)
        .is('signed_out_at', null)
        .maybeSingle()

      if (!error && data) {
        const now = new Date()
        const expiresAt = new Date(data.expires_at)
        const lastActive = new Date(data.last_active_at)

        // Check hard expiry and inactivity
        if (now > expiresAt || (now.getTime() - lastActive.getTime()) > INACTIVITY_TIMEOUT_MS) {
          // Session expired — clear cookie
          const response = NextResponse.next()
          response.cookies.delete(STAFF_SESSION_COOKIE)
          return null
        }

        // Valid session — return role
        const role = data.role as 'admin' | 'kitchen' | 'waiter' | 'bar'
        return { role }
      }
    } catch {
      // Session validation failed — continue to return null
    }
  }

  return null
}

function roleScope(role: string): string {
  if (role === 'admin') return 'admin:full'
  if (role === 'kitchen') return 'kitchen:orders'
  if (role === 'bar') return 'bar:orders'
  return 'waiter:orders'
}

const PROTECTED_API_PREFIXES = ['/api/admin/', '/api/cms/', '/api/waiters/', '/api/gallery/', '/api/upload/', '/api/supabase/', '/api/staff/']

const PUBLIC_API_EXCEPTIONS = ['/api/cms/public', '/api/waiters/active', '/api/menu/public', '/api/track-order', '/api/receipt/verify', '/api/staff/pin-login', '/api/staff/list', '/api/staff/session']

const PUBLIC_SUPABASE_POST_ROUTES = ['/api/supabase/orders', '/api/supabase/contact', '/api/supabase/bookings']

function isProtectedApiPath(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function isPublicApiException(pathname: string): boolean {
  return PUBLIC_API_EXCEPTIONS.some(p => pathname.startsWith(p))
}

function setAuthHeaders(headers: Headers, role: string): Headers {
  const h = new Headers(headers)
  h.set('x-user-role', role)
  h.set('x-auth-valid', 'true')
  h.set('x-user-scope', roleScope(role))
  return h
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/admin/login', request.url)
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  // ── Page routes ─────────────────────────────────────────
  if (!isApi) {
    // Staff pages (PWA)
    if (pathname.startsWith('/staff')) {
      if (pathname === '/staff/login' || pathname === '/staff/install') return NextResponse.next()
      const auth = await verifyRole(request)
      if (!auth) {
        return NextResponse.redirect(new URL('/staff/login', request.url))
      }
      return NextResponse.next({ request: { headers: setAuthHeaders(request.headers, auth.role) } })
    }

    // Waiter page: has its own client-side PasswordGate — pass through.
    // If authenticated, set headers for the page component.
    if (pathname.startsWith('/waiter')) {
      const auth = await verifyRole(request)
      if (auth && (auth.role === 'admin' || auth.role === 'waiter')) {
        return NextResponse.next({ request: { headers: setAuthHeaders(request.headers, auth.role) } })
      }
      return NextResponse.next()
    }

    // Admin pages
    if (!pathname.startsWith('/admin/')) return NextResponse.next()
    if (pathname === '/admin/login') return NextResponse.next()

    const auth = await verifyRole(request)
    if (!auth) return redirectToLogin(request)

    if (pathname === '/admin/kitchen') {
      if (auth.role === 'admin' || auth.role === 'kitchen') {
        return NextResponse.next({ request: { headers: setAuthHeaders(request.headers, auth.role) } })
      }
      return redirectToLogin(request)
    }

    if (pathname === '/admin/bar') {
      if (auth.role === 'admin' || auth.role === 'bar') {
        return NextResponse.next({ request: { headers: setAuthHeaders(request.headers, auth.role) } })
      }
      return redirectToLogin(request)
    }

    if (pathname === '/admin/messages') {
      if (['admin', 'kitchen', 'bar', 'waiter'].includes(auth.role)) {
        return NextResponse.next({ request: { headers: setAuthHeaders(request.headers, auth.role) } })
      }
      return redirectToLogin(request)
    }

    // All other /admin/* routes: admin ONLY
    if (auth.role !== 'admin') return redirectToLogin(request)

    return NextResponse.next({ request: { headers: setAuthHeaders(request.headers, 'admin') } })
  }

  // ── API routes ──────────────────────────────────────────
  if (!isProtectedApiPath(pathname)) return NextResponse.next()
  if (isPublicApiException(pathname)) return NextResponse.next()

  // /api/admin/auth POST (login) and GET (logout/session check) — allow unauthenticated
  if (pathname === '/api/admin/auth' && (request.method === 'POST' || request.method === 'GET')) return NextResponse.next()

  // Allow public POST to specific supabase endpoints (public website order/book/contact forms)
  if (pathname.startsWith('/api/supabase/') && request.method === 'POST' && PUBLIC_SUPABASE_POST_ROUTES.some(p => pathname.startsWith(p))) return NextResponse.next()

  const auth = await verifyRole(request)
  if (!auth) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  return NextResponse.next({ request: { headers: setAuthHeaders(request.headers, auth.role) } })
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/waiter/:path*',
    '/staff/:path*',
    '/api/admin/:path*',
    '/api/cms/:path*',
    '/api/waiters/:path*',
    '/api/gallery/:path*',
    '/api/upload/:path*',
    '/api/supabase/:path*',
    '/api/staff/:path*',
  ],
}
