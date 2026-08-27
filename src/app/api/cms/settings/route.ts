import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAllSettings, setMultipleSettings, isAllowedSiteSettingKey } from '@/lib/cms-supabase';
import { requireAdminPermission } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'settings.write')
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
  const authError = await requireAdminPermission(request, 'settings.write')
  if (authError) return authError

  try {
    const settings = await request.json();
    if (!settings || typeof settings !== 'object' || Array.isArray(settings) || !Object.keys(settings).every(isAllowedSiteSettingKey)) {
      return NextResponse.json({ error: 'Unsupported settings field' }, { status: 400 });
    }
    await setMultipleSettings(settings);
    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
