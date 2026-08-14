// Admin session management — individual sessions (cookie = session UUID,
// same proven pattern as the staff session system; fully separate tables)
import { createHash, randomBytes } from 'node:crypto'
import { getAdminClient } from '@/lib/supabase'
import type { AdminAccount, AdminRole, AdminSessionInfo } from './types'

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export interface AdminSessionRow {
  id: string
  admin_id: string
  signed_out_at: string | null
  started_at: string
  expires_at: string
  last_active_at: string
}

export function generateDeviceFingerprint(userAgent: string, ip: string): string {
  return createHash('sha256').update(`${userAgent}:${ip}`).digest('hex').slice(0, 16)
}

export async function createAdminSession(
  account: AdminAccount,
  deviceFingerprint: string,
  deviceName: string,
  userAgent: string,
  ipAddress: string,
): Promise<AdminSessionInfo | null> {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

  const { data, error } = await getAdminClient()
    .from('admin_sessions')
    .insert({
      admin_id: account.id,
      session_token: token,
      device_fingerprint: deviceFingerprint,
      device_name: deviceName,
      user_agent: userAgent,
      ip_address: ipAddress,
      started_at: now.toISOString(),
      last_active_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) return null

  return {
    sessionId: data.id,
    adminId: account.id,
    username: account.username,
    displayName: account.display_name,
    role: account.role,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }
}

export async function validateAdminSession(sessionId: string): Promise<AdminSessionInfo | null> {
  const { data, error } = await getAdminClient()
    .from('admin_sessions')
    .select('*')
    .eq('id', sessionId)
    .is('signed_out_at', null)
    .maybeSingle()

  if (error || !data) return null

  const now = new Date()
  const expiresAt = new Date(data.expires_at)
  const lastActive = new Date(data.last_active_at)

  if (now > expiresAt) {
    await endAdminSession(sessionId, 'timeout')
    return null
  }

  if (now.getTime() - lastActive.getTime() > INACTIVITY_TIMEOUT_MS) {
    await endAdminSession(sessionId, 'timeout')
    return null
  }

  await getAdminClient()
    .from('admin_sessions')
    .update({ last_active_at: now.toISOString() })
    .eq('id', sessionId)

  const { data: account } = await getAdminClient()
    .from('admin_accounts')
    .select('id, username, display_name, role, is_active')
    .eq('id', data.admin_id)
    .maybeSingle()

  if (!account || !account.is_active) return null

  return {
    sessionId: data.id,
    adminId: data.admin_id,
    username: account.username,
    displayName: account.display_name,
    role: account.role as AdminRole,
    startedAt: data.started_at,
    expiresAt: data.expires_at,
  }
}

export async function endAdminSession(sessionId: string, reason: string = 'user_logout'): Promise<void> {
  await getAdminClient()
    .from('admin_sessions')
    .update({
      signed_out_at: new Date().toISOString(),
      signed_out_reason: reason,
    })
    .eq('id', sessionId)
}

export async function endAllSessionsForAdmin(adminId: string, reason: string = 'security', exceptSessionId?: string): Promise<void> {
  const { data } = await getAdminClient()
    .from('admin_sessions')
    .select('id')
    .eq('admin_id', adminId)
    .is('signed_out_at', null)

  if (data) {
    for (const session of data) {
      if (exceptSessionId && session.id === exceptSessionId) continue
      await endAdminSession(session.id, reason)
    }
  }
}

export async function getActiveAdminSessions(adminId?: string): Promise<AdminSessionRow[]> {
  let query = getAdminClient()
    .from('admin_sessions')
    .select('id, admin_id, signed_out_at, started_at, expires_at, last_active_at, device_name, ip_address, signed_out_reason')
    .is('signed_out_at', null)
    .order('started_at', { ascending: false })

  if (adminId) query = query.eq('admin_id', adminId)

  const { data } = await query
  return (data || []) as AdminSessionRow[]
}
