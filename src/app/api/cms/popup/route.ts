import { NextRequest, NextResponse } from 'next/server';
import { getPopup, savePopup } from '@/lib/db';

export async function GET() {
  try {
    const popup = getPopup();
    return NextResponse.json(popup);
  } catch (error) {
    console.error('Error reading popup:', error);
    return NextResponse.json({ error: 'Failed to read popup' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const popup = await request.json();
    const success = savePopup(popup);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to save popup' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving popup:', error);
    return NextResponse.json({ error: 'Failed to save popup' }, { status: 500 });
  }
}