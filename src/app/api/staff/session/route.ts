// GET /api/staff/session — Check current session
// POST /api/staff/session — Refresh session
// DELETE /api/staff/session — Sign out

import { NextRequest, NextResponse } from 'next/server'
import { validateSession, endSession } from '@/lib/staff/session'
import { logAuthAudit } from '@/lib/staff/audit'
import { getSession } from '@/lib/auth'
import { ROLE_SESSION_MAP } from '@/lib/staff/identity'

export const dynamic = 'force-dynamic'

// Stable virtual IDs for password-based staff (bar/kitchen/admin)
// These are deterministic so conversations persist across sessions.
// (ROLE_SESSION_MAP defined in src/lib/staff/identity.ts)

export async function GET(request: NextRequest) {
  // 1. Try PIN-based staff session cookie
  const sessionToken = request.cookies.get('boma_staff_session')?.value

  if (sessionToken) {
    const session = await validateSession(sessionToken)
    if (session) {
      return NextResponse.json({
        authenticated: true,
        staff: {
          id: session.staffId,
          name: session.name,
          role: session.role,
          employee_id: session.employeeId,
        },
        session: {
          started_at: session.startedAt,
          expires_at: session.expiresAt,
        },
      })
    }
  }

  // 2. Try password-based role cookies (admin/kitchen/bar/waiter)
  const roleSession = await getSession()
  if (roleSession) {
    const mapped = ROLE_SESSION_MAP[roleSession.role]
    if (mapped) {
      return NextResponse.json({
        authenticated: true,
        staff: {
          id: mapped.staffId,
          name: mapped.name,
          role: roleSession.role,
          employee_id: mapped.employeeId,
        },
      })
    }
  }

  return NextResponse.json({ authenticated: false })
}

export async function POST(request: NextRequest) {
  // Refresh session — update last_active_at
  const sessionToken = request.cookies.get('boma_staff_session')?.value

  if (!sessionToken) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  const session = await validateSession(sessionToken)

  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    staff: {
      id: session.staffId,
      name: session.name,
      role: session.role,
      employee_id: session.employeeId,
    },
  })
}

export async function DELETE(request: NextRequest) {
  const sessionToken = request.cookies.get('boma_staff_session')?.value

  if (sessionToken) {
    const session = await validateSession(sessionToken).catch(() => null)
    await endSession(sessionToken, 'user_logout')

    if (session) {
      await logAuthAudit(session.staffId, 'auth.logout', {
        employee_id: session.employeeId,
      })
    }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('boma_staff_session', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 })
  response.cookies.set('boma_waiter_auth', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 })
  response.cookies.set('boma_kitchen_auth', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 })
  response.cookies.set('boma_bar_auth', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 })
  response.cookies.set('boma_admin_auth', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 })

  return response
}
