import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAnnouncement, saveAnnouncement } from '@/lib/cms-supabase';
import { requireAdminPermission } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const announcement = await getAnnouncement();
    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error reading announcement:', error);
    return NextResponse.json({ error: 'Failed to read announcement' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const announcement = await request.json();
    const success = await saveAnnouncement(announcement);
    
    if (success) {
      revalidatePath('/');
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to save announcement' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving announcement:', error);
    return NextResponse.json({ error: 'Failed to save announcement' }, { status: 500 });
  }
}
