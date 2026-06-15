import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE = 'boma_admin_auth'
const KITCHEN_COOKIE = 'boma_kitchen_auth'
const WAITER_COOKIE = 'boma_waiter_auth'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD
const WAITER_PASSWORD = process.env.WAITER_PASSWORD

async function hashSHA256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

type AuthResult = { role: 'admin' | 'kitchen' | 'waiter' } | null

async function verifyRole(request: NextRequest): Promise<AuthResult> {
  if (!ADMIN_PASSWORD || !KITCHEN_PASSWORD || !WAITER_PASSWORD) return null

  const adminCookie = request.cookies.get(ADMIN_COOKIE)
  const kitchenCookie = request.cookies.get(KITCHEN_COOKIE)
  const waiterCookie = request.cookies.get(WAITER_COOKIE)

  if (adminCookie?.value) {
    const expected = await hashSHA256(`admin:${ADMIN_PASSWORD}`)
    if (adminCookie.value === expected) return { role: 'admin' }
  }

  if (kitchenCookie?.value) {
    const expected = await hashSHA256(`kitchen:${KITCHEN_PASSWORD}`)
    if (kitchenCookie.value === expected) return { role: 'kitchen' }
  }

  if (waiterCookie?.value) {
    const expected = await hashSHA256(`waiter:${WAITER_PASSWORD}`)
    if (waiterCookie.value === expected) return { role: 'waiter' }
  }

  return null
}

function roleScope(role: string): string {
  if (role === 'admin') return 'admin:full'
  if (role === 'kitchen') return 'kitchen:orders'
  return 'waiter:orders'
}

const PROTECTED_API_PREFIXES = ['/api/admin/', '/api/cms/', '/api/waiters/', '/api/gallery/', '/api/upload/']

const PUBLIC_API_EXCEPTIONS = ['/api/cms/public', '/api/waiters/active']

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
    // Waiter page: waiter or admin
    if (pathname.startsWith('/waiter')) {
      const auth = await verifyRole(request)
      if (!auth) return redirectToLogin(request)
      if (auth.role === 'admin' || auth.role === 'waiter') {
        return NextResponse.next({ request: { headers: setAuthHeaders(request.headers, auth.role) } })
      }
      return redirectToLogin(request)
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

    // All other /admin/* routes: admin ONLY
    if (auth.role !== 'admin') return redirectToLogin(request)

    return NextResponse.next({ request: { headers: setAuthHeaders(request.headers, 'admin') } })
  }

  // ── API routes ──────────────────────────────────────────
  if (!isProtectedApiPath(pathname)) return NextResponse.next()
  if (isPublicApiException(pathname)) return NextResponse.next()

  // /api/admin/auth POST is the login endpoint — allow unauthenticated
  if (pathname === '/api/admin/auth' && request.method === 'POST') return NextResponse.next()

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
    '/api/admin/:path*',
    '/api/cms/:path*',
    '/api/waiters/:path*',
    '/api/gallery/:path*',
    '/api/upload/:path*',
  ],
}
