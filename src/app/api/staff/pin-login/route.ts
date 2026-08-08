// POST /api/staff/pin-login — Staff PIN authentication
// Body: { employee_id: string, pin: string, device_name?: string }
// Returns: { success, staff: { id, name, role, employee_id } }

import { NextRequest, NextResponse } from 'next/server'
import { verifyPin, getStaffByEmployeeId } from '@/lib/staff/auth'
import { createSession, generateDeviceFingerprint } from '@/lib/staff/session'
import { logAuthAudit } from '@/lib/staff/audit'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!await checkRateLimit(`pin-login:${ip}`, 20)) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { employee_id, pin, device_name } = body

    if (!employee_id || !pin) {
      return NextResponse.json({ error: 'Employee ID and PIN are required' }, { status: 400 })
    }

    // Rate limit per employee ID
    if (!await checkRateLimit(`pin-login:${employee_id}`, 10)) {
      return NextResponse.json({ error: 'Too many attempts for this employee. Try again later.' }, { status: 429 })
    }

    const result = await verifyPin(employee_id, pin)

    if (!result.success || !result.profile) {
      return NextResponse.json({ error: result.error || 'Invalid credentials' }, { status: 401 })
    }

    const profile = result.profile
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ip)

    // Create session
    const session = await createSession(
      profile,
      deviceFingerprint,
      device_name || 'Web Browser',
      userAgent,
      ip
    )

    if (!session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Log audit
    await logAuthAudit(profile.id, 'auth.login', {
      employee_id: profile.employee_id,
      device: device_name || 'Web Browser',
      ip,
    })

    // Set session cookie (session id is NOT exposed in the JSON body —
    // it is the bearer credential for boma_staff_session)
    const response = NextResponse.json({
      success: true,
      staff: {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        employee_id: profile.employee_id,
      },
    })

    response.cookies.set('boma_staff_session', session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    })

    // Also set the role cookie for middleware compatibility
    // NOTE: PIN login session UUID never matches middleware's expected SHA256(role:password)
    // hash format, so these cookies are never actually used for role verification by middleware.
    // The middleware falls back to boma_staff_session cookie check (which DOES match the UUID).
    // Only set role cookies for non-admin roles to avoid confusion.
    const roleCookieMap: Record<string, string> = {
      waiter: 'boma_waiter_auth',
      kitchen: 'boma_kitchen_auth',
      bar: 'boma_bar_auth',
    }
    const cookieName = roleCookieMap[profile.role]
    if (cookieName) {
      response.cookies.set(cookieName, session.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60,
      })
    }

    return response
  } catch (error) {
    console.error('[PIN Login] Error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
