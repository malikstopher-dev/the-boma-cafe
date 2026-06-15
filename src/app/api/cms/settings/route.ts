import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, setMultipleSettings } from '@/lib/cms-supabase';
import { requireAdminOrKitchen } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error reading settings:', error);
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const settings = await request.json();
    await setMultipleSettings(settings);
    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
