import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE = 'boma_admin_auth'
const KITCHEN_COOKIE = 'boma_kitchen_auth'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD

async function hashSHA256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

type AuthResult = { role: 'admin' | 'kitchen' } | null

async function verifyRole(request: NextRequest): Promise<AuthResult> {
  if (!ADMIN_PASSWORD || !KITCHEN_PASSWORD) return null

  const adminCookie = request.cookies.get(ADMIN_COOKIE)
  const kitchenCookie = request.cookies.get(KITCHEN_COOKIE)

  if (adminCookie?.value) {
    const expected = await hashSHA256(`admin:${ADMIN_PASSWORD}`)
    if (adminCookie.value === expected) return { role: 'admin' }
  }

  if (kitchenCookie?.value) {
    const expected = await hashSHA256(`kitchen:${KITCHEN_PASSWORD}`)
    if (kitchenCookie.value === expected) return { role: 'kitchen' }
  }

  return null
}

const PROTECTED_API_PREFIXES = ['/api/admin/', '/api/cms/', '/api/waiters/', '/api/gallery/', '/api/upload/']

const PUBLIC_API_EXCEPTIONS = ['/api/cms/public', '/api/waiters/active']

function isProtectedApiPath(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function isPublicApiException(pathname: string): boolean {
  return PUBLIC_API_EXCEPTIONS.some(p => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  // ── Page routes (admin) ──────────────────────────────────
  if (!isApi) {
    if (!pathname.startsWith('/admin/')) return NextResponse.next()
    if (pathname === '/admin/login') return NextResponse.next()

    const auth = await verifyRole(request)
    if (!auth) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (pathname === '/admin/kitchen') {
      const headers = new Headers(request.headers)
      headers.set('x-user-role', auth.role)
      headers.set('x-auth-valid', 'true')
      return NextResponse.next({ request: { headers } })
    }

    if (auth.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const headers = new Headers(request.headers)
    headers.set('x-user-role', 'admin')
    headers.set('x-auth-valid', 'true')
    return NextResponse.next({ request: { headers } })
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

  const headers = new Headers(request.headers)
  headers.set('x-user-role', auth.role)
  headers.set('x-auth-valid', 'true')
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/cms/:path*',
    '/api/waiters/:path*',
    '/api/gallery/:path*',
    '/api/upload/:path*',
  ],
}
