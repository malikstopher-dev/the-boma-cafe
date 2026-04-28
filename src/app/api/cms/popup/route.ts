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
    const body = await request.json();
    
    // Map camelCase fields to snake_case for database
    const popup = {
      type: body.type || 'promotion',
      title: body.title || '',
      description: body.description || '',
      image: body.image || '',
      cta_text: body.ctaText || '',
      cta_link: body.ctaLink || '',
      is_enabled: body.isEnabled ? 1 : 0,
      show_once_per_session: body.showOncePerSession ? 1 : 0,
      start_date: body.startDate || null,
      end_date: body.endDate || null,
      start_time: body.startTime || '09:30',
      end_time: body.endTime || '12:30',
      active_days: body.activeDays ? JSON.stringify(body.activeDays) : JSON.stringify([6, 0]),
      adult_price: body.adultPrice || 'R89',
      kids_price: body.kidsPrice || 'R45'
    };
    
    const success = savePopup(popup);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      console.error('savePopup returned false for data:', popup);
      return NextResponse.json({ error: 'Failed to save popup to database' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Full error saving popup:', error);
    const message = error.message || 'Unknown error occurred';
    return NextResponse.json({ error: `Failed to save popup: ${message}` }, { status: 500 });
  }
}
