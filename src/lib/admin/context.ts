// Resolve the acting admin identity from a request (headers set by middleware,
// falling back to a DB session lookup for routes that bypass middleware).
import { getRoleFromHeaders } from '@/lib/auth'
import { validateAdminSession } from './session'
import type { AdminContext } from './types'

export async function getAdminContext(request: Request): Promise<AdminContext | null> {
  const headers = request.headers
  const session = getRoleFromHeaders(headers)

  const adminId = headers.get('x-admin-id')
  const adminName = headers.get('x-admin-name')
  const adminRole = headers.get('x-admin-role')

  if (session?.role === 'admin' && adminId && adminRole) {
    return {
      adminId,
      username: adminName || '',
      displayName: adminName || '',
      role: adminRole as AdminContext['role'],
      legacy: adminRole === 'legacy',
      sessionId: headers.get('x-admin-session'),
    }
  }

  // Fallback: resolve from the cookie directly (routes not covered by middleware,
  // or requests without identity headers). The boma_admin_session cookie only
  // exists for individual admin sessions — never for staff roles.
  const cookieHeader = headers.get('cookie') || ''
  const match = cookieHeader.match(/(?:^|;\s*)boma_admin_session=([^;]+)/)
  if (!match) return null
  const token = match[1]
  if (!token) return null

  const info = await validateAdminSession(token)
  if (!info) return null

  return {
    adminId: info.adminId,
    username: info.username,
    displayName: info.displayName,
    role: info.role,
    legacy: false,
    sessionId: info.sessionId,
  }
}

export async function getAdminContextForRequest(req: Request): Promise<AdminContext | null> {
  return getAdminContext(req)
}