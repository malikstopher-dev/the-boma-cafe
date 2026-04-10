import { NextRequest, NextResponse } from 'next/server';
import { getAnnouncement, saveAnnouncement } from '@/lib/db';

export async function GET() {
  try {
    const announcement = getAnnouncement();
    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error reading announcement:', error);
    return NextResponse.json({ error: 'Failed to read announcement' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const announcement = await request.json();
    const success = saveAnnouncement(announcement);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to save announcement' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving announcement:', error);
    return NextResponse.json({ error: 'Failed to save announcement' }, { status: 500 });
  }
}