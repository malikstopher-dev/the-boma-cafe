import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import type { Role } from '@/lib/auth'
import { can, type AdminPermission } from '@/lib/admin/permissions'
import type { AdminRole } from '@/lib/admin/types'
import { getAdminContext } from '@/lib/admin/context'

export type { Role }
export { getSession }

const ADMIN_ROLES: AdminRole[] = ['owner', 'full_manager', 'manager', 'assistant_manager']

/**
 * Resolves the authenticated role for a request.
 * Resolves only from a validated cookie/session. Middleware headers are an
 * optimization detail, never an authority boundary.
 */
export async function getRequestRole(request: NextRequest): Promise<Role | null> {
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

export async function requireBar(request: NextRequest): Promise<NextResponse | null> {
  const role = await getRequestRole(request)
  if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (role !== 'bar') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return null
}

export async function requireAdminOrKitchenOrBar(request: NextRequest): Promise<NextResponse | null> {
  const role = await getRequestRole(request)
  if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (role !== 'admin' && role !== 'kitchen' && role !== 'bar') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
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

/**
 * Admin permission gate (Mission E8 RBAC).
 * Admin identity is resolved from a validated individual admin session.
 */
export async function requireAdminPermission(
  request: NextRequest,
  permission: AdminPermission,
): Promise<NextResponse | null> {
  const context = await getAdminContext(request)
  if (context && !context.legacy && ADMIN_ROLES.includes(context.role as AdminRole)) {
    if (!can(context.role as AdminRole, permission)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    return null
  }

  const role = await getRequestRole(request)
  if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
}
