import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getEvents, saveEvent, deleteEvent } from '@/lib/cms-supabase';
import { requireAdminPermission } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const events = await getEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error reading events:', error);
    return NextResponse.json({ error: 'Failed to read events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const event = await request.json();
    const saved = await saveEvent(event);
    revalidatePath('/');
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving event:', error);
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const event = await request.json();
    const saved = await saveEvent(event);
    revalidatePath('/');
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving event:', error);
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const body = await request.json();
    if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        await saveEvent(event);
      }
      revalidatePath('/');
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error reordering events:', error);
    return NextResponse.json({ error: 'Failed to reorder events' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      await deleteEvent(id);
      revalidatePath('/');
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
