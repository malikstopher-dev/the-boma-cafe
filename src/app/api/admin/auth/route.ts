import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, expectedCookieValue } from '@/lib/auth';
import { createHash } from 'node:crypto';

const ADMIN_COOKIE = 'boma_admin_auth';
const KITCHEN_COOKIE = 'boma_kitchen_auth';
const WAITER_COOKIE = 'boma_waiter_auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, role, action } = body;

    if (action === 'logout') {
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      cookieStore.set(KITCHEN_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      cookieStore.set(WAITER_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
      return NextResponse.json({ success: true });
    }

    if (role === 'waiter') {
      const waiterPassword = process.env.WAITER_PASSWORD;
      if (!waiterPassword) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      if (password !== waiterPassword) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      const cookieStore = await cookies();
      cookieStore.set(WAITER_COOKIE, expectedCookieValue('waiter'), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
      return NextResponse.json({ success: true, role: 'waiter' });
    }

    if (role === 'kitchen') {
      const kitchenPassword = process.env.KITCHEN_PASSWORD;
      if (!kitchenPassword) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      if (password !== kitchenPassword) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      const cookieStore = await cookies();
      cookieStore.set(KITCHEN_COOKIE, expectedCookieValue('kitchen'), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
      return NextResponse.json({ success: true, role: 'kitchen' });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (password === adminPassword) {
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_COOKIE, expectedCookieValue('admin'), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return NextResponse.json({ success: true, user: { id: '1', username: 'admin', email: 'admin@thebomacafe.co.za' } });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();

    if (session?.role === 'admin') {
      return NextResponse.json({
        authenticated: true,
        role: 'admin',
        user: { id: '1', username: 'admin', email: 'admin@thebomacafe.co.za' }
      });
    }

    if (session?.role === 'kitchen') {
      return NextResponse.json({
        authenticated: true,
        role: 'kitchen',
        user: { id: '2', username: 'kitchen', email: '' }
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
