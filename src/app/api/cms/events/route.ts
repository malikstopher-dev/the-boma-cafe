import { NextRequest, NextResponse } from 'next/server';
import { getEvents, saveEvent, deleteEvent } from '@/lib/db';

export async function GET() {
  try {
    const events = getEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error reading events:', error);
    return NextResponse.json({ error: 'Failed to read events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    const saved = saveEvent(event);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving event:', error);
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const event = await request.json();
    const saved = saveEvent(event);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving event:', error);
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.events && Array.isArray(body.events)) {
      body.events.forEach((event: any) => saveEvent(event));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error reordering events:', error);
    return NextResponse.json({ error: 'Failed to reorder events' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      deleteEvent(id);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}