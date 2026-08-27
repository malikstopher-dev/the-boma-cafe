import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAllSettings, setMultipleSettings, isAllowedSiteSettingKey, setSetting } from '@/lib/cms-supabase';
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
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).every(isAllowedSiteSettingKey)) {
      return NextResponse.json({ error: 'Unsupported settings field' }, { status: 400 });
    }
    
    const success = await setMultipleSettings(body);
    
    if (success) {
      revalidatePath('/', 'layout');
      return NextResponse.json({ success: true, message: 'Settings saved successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'settings.write')
  if (authError) return authError

  try {
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || !isAllowedSiteSettingKey(key)) {
      return NextResponse.json({ error: 'Valid key is required' }, { status: 400 });
    }
    
    const success = await setSetting(key, value);
    
    if (success) {
      revalidatePath('/', 'layout');
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}
