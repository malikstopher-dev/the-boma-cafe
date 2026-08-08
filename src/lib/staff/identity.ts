// Server-side staff identity resolution for API routes.
// Never trusts client-supplied user_id/sender_id params — identity is
// derived from the validated PIN session cookie or password-role cookie.
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import type { Role } from '@/lib/auth'
import { validateSession } from '@/lib/staff/session'
import { getAdminClient } from '@/lib/supabase'

// Stable virtual IDs for password-based staff (bar/kitchen/admin).
// Mirrors ROLE_SESSION_MAP in /api/staff/session/route.ts.
export const ROLE_SESSION_MAP: Record<string, { staffId: string; employeeId: string; name: string }> = {
  admin:   { staffId: 'role-admin-001',   employeeId: 'ADMIN',   name: 'Admin' },
  kitchen: { staffId: 'role-kitchen-001', employeeId: 'KITCHEN', name: 'Kitchen' },
  bar:     { staffId: 'role-bar-001',     employeeId: 'BAR',     name: 'Bar' },
  waiter:  { staffId: 'role-waiter-001',  employeeId: 'WAITER',  name: 'Waiter' },
}

export interface StaffIdentity {
  role: Role
  staffId: string
  employeeId: string
  userId: string | null
  name: string
  textId: string
  aliases: string[]
  isAdmin: boolean
}

export async function resolveStaffIdentity(request: NextRequest): Promise<StaffIdentity | null> {
  const token = request.cookies.get('boma_staff_session')?.value

  if (token) {
    const session = await validateSession(token)
    if (session) {
      const { data: profile } = await getAdminClient()
        .from('staff_profiles')
        .select('user_id, employee_id')
        .eq('id', session.staffId)
        .maybeSingle()

      const employeeId = profile?.employee_id || session.employeeId || ''
      const textId = employeeId || session.staffId
      const aliases = Array.from(
        new Set([textId, session.staffId, profile?.user_id || '', employeeId].filter(Boolean))
      )
      if (session.role !== 'admin' && session.role !== 'kitchen' && session.role !== 'waiter' && session.role !== 'bar') {
        return null
      }
      const role = session.role as Role
      return {
        role,
        staffId: session.staffId,
        employeeId,
        userId: profile?.user_id || null,
        name: session.name,
        textId,
        aliases,
        isAdmin: role === 'admin',
      }
    }
  }

  const roleSession = await getSession()
  if (roleSession) {
    const mapped = ROLE_SESSION_MAP[roleSession.role]
    if (mapped) {
      return {
        role: roleSession.role,
        staffId: mapped.staffId,
        employeeId: mapped.employeeId,
        userId: null,
        name: mapped.name,
        textId: mapped.employeeId,
        aliases: [mapped.employeeId, mapped.staffId],
        isAdmin: roleSession.role === 'admin',
      }
    }
  }

  return null
}

export function isKnownMemberId(id: string): boolean {
  if (Object.values(ROLE_SESSION_MAP).some((m) => m.staffId === id || m.employeeId === id)) return true
  return false
}

export async function memberIdExists(id: string): Promise<boolean> {
  if (isKnownMemberId(id)) return true
  const { data } = await getAdminClient()
    .from('staff_profiles')
    .select('id')
    .or(`user_id.eq.${id},employee_id.eq.${id},id.eq.${id}`)
    .maybeSingle()
  return !!data
}