import { NextRequest, NextResponse } from 'next/server'
import { getSession, getRoleFromHeaders } from '@/lib/auth'
import type { Role } from '@/lib/auth'

export type { Role }
export { getSession }

/**
 * Resolves the authenticated role for a request.
 * Checks x-user-role header first (set by middleware), then falls back
 * to cookie-based getSession() for routes that bypass middleware.
 */
export async function getRequestRole(request: NextRequest): Promise<Role | null> {
  const fromHeaders = getRoleFromHeaders(request.headers)
  if (fromHeaders) return fromHeaders.role
  const session = await getSession()
  return session?.role ?? null
}

export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const role = await getRequestRole(request)
  if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (role !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return null
}

export async function requireKitchen(request: NextRequest): Promise<NextResponse | null> {
  const role = await getRequestRole(request)
  if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (role !== 'kitchen') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return null
}

export async function requireAdminOrKitchen(request: NextRequest): Promise<NextResponse | null> {
  const role = await getRequestRole(request)
  if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (role !== 'admin' && role !== 'kitchen') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return null
}

export async function requireWaiter(request: NextRequest): Promise<NextResponse | null> {
  const role = await getRequestRole(request)
  if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (role !== 'waiter') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return null
}

export async function requireAnyRole(request: NextRequest, roles: Role[]): Promise<NextResponse | null> {
  const role = await getRequestRole(request)
  if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!roles.includes(role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return null
}

export async function requireAuthenticated(request: NextRequest): Promise<NextResponse | null> {
  const role = await getRequestRole(request)
  if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  return null
}
