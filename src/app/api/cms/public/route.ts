import { NextResponse } from 'next/server';
import { getPublicCMSData } from '@/lib/cms-supabase';

export const revalidate = 60
export const dynamic = 'auto'

export async function GET() {
  try {
    const data = await getPublicCMSData();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Error reading public data:', error);
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}
