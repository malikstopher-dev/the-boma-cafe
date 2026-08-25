// Staff Session Management — JWT tokens, session lifecycle
import { createHash, randomBytes } from 'node:crypto'
import { getAdminClient } from '@/lib/supabase'
import type { StaffProfile } from './auth'

const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000 // persist until voluntary logout

export interface StaffSession {
  sessionId: string
  staffId: string
  employeeId: string
  name: string
  role: string
  startedAt: string
  expiresAt: string
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateDeviceFingerprint(userAgent: string, ip: string): string {
  return createHash('sha256').update(`${userAgent}:${ip}`).digest('hex').slice(0, 16)
}

export async function createSession(
  profile: StaffProfile,
  deviceFingerprint: string,
  deviceName: string,
  userAgent: string,
  ipAddress: string
): Promise<StaffSession | null> {
  const token = generateSessionToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

  const { data, error } = await getAdminClient()
    .from('staff_sessions')
    .insert({
      staff_id: profile.id,
      session_token: token,
      device_fingerprint: deviceFingerprint,
      device_name: deviceName,
      user_agent: userAgent,
      ip_address: ipAddress,
      role: profile.role,
      started_at: now.toISOString(),
      last_active_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) return null

  // Update staff_profiles session fields
  await getAdminClient()
    .from('staff_profiles')
    .update({
      session_started_at: now.toISOString(),
      device_id: deviceFingerprint,
      online: true,
      on_duty: true,
    })
    .eq('id', profile.id)

  return {
    sessionId: data.id,
    staffId: profile.id,
    employeeId: profile.employee_id || '',
    name: profile.name,
    role: profile.role,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }
}

export async function validateSession(sessionToken: string): Promise<StaffSession | null> {
  const { data, error } = await getAdminClient()
    .from('staff_sessions')
    .select('*')
    .eq('id', sessionToken)
    .is('signed_out_at', null)
    .maybeSingle()

  if (error || !data) return null

  const now = new Date()
  const expiresAt = new Date(data.expires_at)

  // Check hard expiry
  if (now > expiresAt) {
    await endSession(sessionToken, 'timeout')
    return null
  }

  // Update last_active_at
  await getAdminClient()
    .from('staff_sessions')
    .update({ last_active_at: now.toISOString() })
    .eq('id', sessionToken)

  // Get staff profile for employee_id
  const { data: profile } = await getAdminClient()
    .from('staff_profiles')
    .select('employee_id, name')
    .eq('id', data.staff_id)
    .maybeSingle()

  return {
    sessionId: data.id,
    staffId: data.staff_id,
    employeeId: profile?.employee_id || '',
    name: profile?.name || '',
    role: data.role,
    startedAt: data.started_at,
    expiresAt: data.expires_at,
  }
}

export async function endSession(sessionToken: string, reason: string = 'user_logout'): Promise<void> {
  const { data } = await getAdminClient()
    .from('staff_sessions')
    .select('staff_id')
    .eq('id', sessionToken)
    .maybeSingle()

  await getAdminClient()
    .from('staff_sessions')
    .update({
      signed_out_at: new Date().toISOString(),
      signed_out_reason: reason,
    })
    .eq('id', sessionToken)

  if (data?.staff_id) {
    await getAdminClient()
      .from('staff_profiles')
      .update({ online: false, session_started_at: null, device_id: null })
      .eq('id', data.staff_id)
  }
}

export async function endAllSessionsForStaff(staffId: string, reason: string = 'security'): Promise<void> {
  const { data: sessions } = await getAdminClient()
    .from('staff_sessions')
    .select('id')
    .eq('staff_id', staffId)
    .is('signed_out_at', null)

  if (sessions) {
    for (const session of sessions) {
      await endSession(session.id, reason)
    }
  }
}

export async function getActiveSessions(staffId?: string): Promise<any[]> {
  let query = getAdminClient()
    .from('staff_sessions')
    .select('*, staff_profiles!inner(name, employee_id, role)')
    .is('signed_out_at', null)
    .order('started_at', { ascending: false })

  if (staffId) {
    query = query.eq('staff_id', staffId)
  }

  const { data } = await query
  return data || []
}
