import { NextRequest, NextResponse } from 'next/server';
import { getInquiries, saveInquiry, markInquiryRead } from '@/lib/db';

export async function GET() {
  try {
    const inquiries = getInquiries();
    return NextResponse.json(inquiries);
  } catch (error) {
    console.error('Error reading inquiries:', error);
    return NextResponse.json({ error: 'Failed to read inquiries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'markRead') {
      const id = body.id;
      if (id) {
        markInquiryRead(id);
        return NextResponse.json({ success: true });
      }
    }
    
    if (body.action === 'delete') {
      return NextResponse.json({ success: true });
    }
    
    const inquiry = saveInquiry(body);
    return NextResponse.json({ success: true, inquiry });
  } catch (error) {
    console.error('Error saving inquiry:', error);
    return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      markInquiryRead(id);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error marking inquiry read:', error);
    return NextResponse.json({ error: 'Failed to mark inquiry read' }, { status: 500 });
  }
}