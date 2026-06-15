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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Non-admin routes pass through
  if (!pathname.startsWith('/admin/')) return NextResponse.next()

  // Login page is always public
  if (pathname === '/admin/login') return NextResponse.next()

  // Verify authentication — fail closed on any missing/invalid input
  const auth = await verifyRole(request)
  if (!auth) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /admin/kitchen: admin or kitchen allowed
  if (pathname === '/admin/kitchen') {
    const headers = new Headers(request.headers)
    headers.set('x-user-role', auth.role)
    headers.set('x-auth-valid', 'true')
    return NextResponse.next({ request: { headers } })
  }

  // All other /admin/* routes: admin ONLY
  if (auth.role !== 'admin') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const headers = new Headers(request.headers)
  headers.set('x-user-role', 'admin')
  headers.set('x-auth-valid', 'true')
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: '/admin/:path*',
}
