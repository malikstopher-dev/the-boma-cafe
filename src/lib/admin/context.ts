// Resolve the acting admin identity from a validated individual admin session.
import { validateAdminSession } from './session'
import type { AdminContext } from './types'

export async function getAdminContext(request: Request): Promise<AdminContext | null> {
  const headers = request.headers
  // The boma_admin_session cookie only exists for individual admin sessions.
  // Never accept identity values from request headers, which a client can forge.
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
