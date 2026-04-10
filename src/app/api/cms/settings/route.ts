import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/cms/store';
import { defaultSettings } from '@/lib/cms/defaults';
import { SiteSettings } from '@/lib/cms/types';

export async function GET() {
  try {
    const settings = readData<SiteSettings>('settings', defaultSettings);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error reading settings:', error);
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    const success = writeData<SiteSettings>('settings', settings);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Settings saved successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
