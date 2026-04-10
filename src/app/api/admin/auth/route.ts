import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_PASSWORD = 'Lovers0884';
const AUTH_COOKIE_NAME = 'boma_admin_auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;
    
    if (password === ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 7 days
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
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
    
    if (authCookie?.value === 'true') {
      return NextResponse.json({ 
        authenticated: true, 
        user: { id: '1', username: 'admin', email: 'admin@thebomacafe.co.za' } 
      });
    }
    
    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}