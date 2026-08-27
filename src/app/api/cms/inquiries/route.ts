import { NextRequest, NextResponse } from 'next/server';
import { getInquiries, saveInquiry, markInquiryRead } from '@/lib/cms-supabase';
import { requireAdminPermission } from '@/lib/auth/requireRole';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const inquiries = await getInquiries();
    return NextResponse.json(inquiries);
  } catch (error) {
    console.error('Error reading inquiries:', error);
    return NextResponse.json({ error: 'Failed to read inquiries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const body = await request.json();
    
    if (body.action === 'markRead') {
      const id = body.id;
      if (id) {
        await markInquiryRead(id);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    if (body.action === 'delete') {
      const id = body.id;
      if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
      }
      const { error } = await getAdminClient().from('contact_messages').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ error: 'Failed to delete inquiry' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }
    
    const inquiry = await saveInquiry(body);
    return NextResponse.json({ success: true, inquiry });
  } catch (error) {
    console.error('Error saving inquiry:', error);
    return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      await markInquiryRead(id);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error marking inquiry read:', error);
    return NextResponse.json({ error: 'Failed to mark inquiry read' }, { status: 500 });
  }
}
