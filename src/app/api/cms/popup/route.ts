import { NextRequest, NextResponse } from 'next/server';
import { getPopup, savePopup } from '@/lib/cms-supabase';
import { requireAdminOrKitchen } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const popup = getPopup();
    return NextResponse.json(popup);
  } catch (error) {
    console.error('Error reading popup:', error);
    return NextResponse.json({ error: 'Failed to read popup' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const body = await request.json();
    const success = await savePopup(body);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      console.error('savePopup returned false for data:', body);
      return NextResponse.json({ error: 'Failed to save popup to database' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Full error saving popup:', error);
    const message = error.message || 'Unknown error occurred';
    return NextResponse.json({ error: `Failed to save popup: ${message}` }, { status: 500 });
  }
}
