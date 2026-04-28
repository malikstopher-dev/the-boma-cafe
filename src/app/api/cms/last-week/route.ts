import { NextRequest, NextResponse } from 'next/server';
import { getLastWeekHighlight, saveLastWeekHighlight } from '@/lib/db';

export async function GET() {
  try {
    const highlight = getLastWeekHighlight();
    return NextResponse.json(highlight);
  } catch (error) {
    console.error('Error reading last week highlight:', error);
    return NextResponse.json({ error: 'Failed to read highlight' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const highlight = await request.json();
    saveLastWeekHighlight(highlight);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving last week highlight:', error);
    return NextResponse.json({ error: 'Failed to save highlight' }, { status: 500 });
  }
}