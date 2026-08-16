import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import { getSession } from '@/lib/auth';
import { expectedCookieValue } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyPassword } from '@/lib/admin/password';
import { createAdminSession, endAdminSession, validateAdminSession, generateDeviceFingerprint } from '@/lib/admin/session';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic'

const ADMIN_COOKIE = 'boma_admin_auth';
const ADMIN_SESSION_COOKIE = 'boma_admin_session';

const ADMIN_EMAIL = 'info@thebomacafe.co.za';

function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function clearAdminCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set(ADMIN_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
  cookieStore.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
}

function clearAllAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  clearAdminCookies(cookieStore);
  for (const name of ['boma_kitchen_auth', 'boma_bar_auth', 'boma_waiter_auth', 'boma_staff_session']) {
    cookieStore.set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
  }
}

async function endCurrentAdminSession(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE);
  if (sessionCookie?.value) {
    await endAdminSession(sessionCookie.value, 'user_logout');
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!await checkRateLimit(`login:${ip}`, 10)) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    const cookieStore = await cookies();
    const body = await request.json();
    const { username, password, action, role } = body;

    if (action === 'logout') {
      await endCurrentAdminSession(cookieStore);
      clearAllAuthCookies(cookieStore);
      return NextResponse.json({ success: true });
    }

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ip);

    // ── Individual admin login: username + password ──
    if (username && password) {
      const supabase = getAdminClient();
      const { data: account } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (account) {
        if (!account.is_active) {
          return NextResponse.json({ error: 'Account is disabled. Contact the owner.' }, { status: 403 });
        }
        if (account.locked_until && new Date(account.locked_until).getTime() > Date.now()) {
          const remaining = Math.ceil((new Date(account.locked_until).getTime() - Date.now()) / 1000);
          return NextResponse.json({ error: `Account locked. Try again in ${remaining} seconds.` }, { status: 429 });
        }

        const valid = account.password_hash && await verifyPassword(password, account.password_hash);

        if (!valid) {
          const attempts = (account.failed_attempts || 0) + 1;
          const updates: Record<string, unknown> = { failed_attempts: attempts };
          if (attempts >= 5) {
            updates.locked_until = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          }
          await supabase.from('admin_accounts').update(updates).eq('id', account.id);
          return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        // Success: reset failures, record login, create session
        await supabase.from('admin_accounts').update({
          failed_attempts: 0,
          locked_until: null,
          last_login_at: new Date().toISOString(),
        }).eq('id', account.id);

        const session = await createAdminSession(
          account,
          deviceFingerprint,
          'Web Browser',
          userAgent,
          ip,
        );

        if (!session) {
          return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
        }

        // Individual session cookie. Legacy admin cookie + staff cookies
        // are NOT touched — staff sessions must remain independent.
        clearAdminCookies(cookieStore);
        cookieStore.set(ADMIN_SESSION_COOKIE, session.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 8 * 60 * 60, // 8 hours
        });

        await logAdminAction({
          adminId: account.id,
          adminName: account.display_name,
          adminRole: account.role,
          action: 'auth.login',
          targetType: 'admin_accounts',
          targetId: account.id,
          ipAddress: ip,
          userAgent,
          sessionId: session.sessionId,
        });

        return NextResponse.json({
          success: true,
          role: 'admin',
          authenticated: true,
          user: {
            id: account.id,
            username: account.username,
            display_name: account.display_name,
            role: account.role,
            email: ADMIN_EMAIL,
          },
        });
      }

// Unknown username → no individual account exists
    }

    // ── Staff role shared-password login (kitchen/bar/waiter only) ──
    // Admin accounts log in ONLY via the individual username+password login
    // above. The legacy shared ADMIN_PASSWORD login is scrapped.
    if (role === 'kitchen' || role === 'bar' || role === 'waiter') {
      const rolePassword = role === 'kitchen' ? process.env.KITCHEN_PASSWORD : role === 'bar' ? process.env.BAR_PASSWORD : process.env.WAITER_PASSWORD;
      if (rolePassword && password && timingSafeCompare(password, rolePassword)) {
        const roleCookieMap: Record<string, string> = {
          kitchen: 'boma_kitchen_auth',
          bar: 'boma_bar_auth',
          waiter: 'boma_waiter_auth',
        };
        const cookieName = roleCookieMap[role];
        if (cookieName) {
          clearAdminCookies(cookieStore);
          for (const other of ['boma_kitchen_auth', 'boma_bar_auth', 'boma_waiter_auth']) {
            if (other !== cookieName) {
              cookieStore.set(other, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
            }
          }
          cookieStore.set(cookieName, expectedCookieValue(role), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
          });

          return NextResponse.json({
            success: true,
            role,
            authenticated: true,
            user: { id: 'staff', username: role, role },
          });
        }
      }
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    if (searchParams.get('action') === 'logout') {
      const cookieStore = await cookies();
      await endCurrentAdminSession(cookieStore);
      clearAllAuthCookies(cookieStore);
      // Admin-area callers pass redirect=/admin/login so they land on the
      // admin login; staff-area callers (kitchen/bar/waiter/staff nav) keep
      // the default /staff/login. Same-origin paths only (open-redirect guard).
      const redirectTo = searchParams.get('redirect');
      const safeRedirect = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/staff/login';
      return NextResponse.redirect(new URL(safeRedirect, request.url));
    }

    // Header identity set by middleware (admin session cookie)
    const adminId = request.headers.get('x-admin-id');
    const adminRole = request.headers.get('x-admin-role');
    if (adminId && adminRole) {
      return NextResponse.json({
        authenticated: true,
        role: 'admin',
        user: {
          id: adminId,
          username: request.headers.get('x-admin-name') || adminId,
          display_name: request.headers.get('x-admin-name') || adminId,
          role: adminRole,
          email: ADMIN_EMAIL,
        },
      });
    }

    // Fallback: cookie-based resolution (routes not covered by middleware)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE);
    if (sessionCookie?.value) {
      const info = await validateAdminSession(sessionCookie.value);
      if (info) {
        return NextResponse.json({
          authenticated: true,
          role: 'admin',
          user: {
            id: info.adminId,
            username: info.username,
            display_name: info.displayName,
            role: info.role,
            email: ADMIN_EMAIL,
          },
        });
      }
    }

    const session = await getSession();
    // Staff role identities (unchanged behavior — staff system independence)
    if (session?.role === 'kitchen') {
      return NextResponse.json({
        authenticated: true,
        role: 'kitchen',
        user: { id: '2', username: 'kitchen', email: '' }
      });
    }

    if (session?.role === 'bar') {
      return NextResponse.json({
        authenticated: true,
        role: 'bar',
        user: { id: '4', username: 'bartender', email: '' }
      });
    }

    if (session?.role === 'waiter') {
      return NextResponse.json({
        authenticated: true,
        role: 'waiter',
        user: { id: '3', username: 'waiter', email: '' }
      });
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}