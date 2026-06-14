import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE = 'boma_admin_auth'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

async function hashCookieValue(role: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${role}:${secret}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  const arr = Array.from(new Uint8Array(buf))
  return arr.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin/')) return NextResponse.next()

  // Allow login page (unauthenticated) and kitchen (has its own password gate)
  if (pathname === '/admin/login' || pathname === '/admin/kitchen') {
    return NextResponse.next()
  }

  // DEVELOPMENT ONLY: skip auth check so local dev works without env vars
  if (process.env.NODE_ENV === 'development') return NextResponse.next()

  const expected = await hashCookieValue('admin', ADMIN_PASSWORD)
  const adminCookie = request.cookies.get(ADMIN_COOKIE)

  if (!adminCookie?.value || adminCookie.value !== expected) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
