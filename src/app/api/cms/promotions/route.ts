import { NextRequest, NextResponse } from 'next/server';
import { getPromotions, savePromotion, deletePromotion } from '@/lib/db';

export async function GET() {
  try {
    const promotions = getPromotions();
    return NextResponse.json(promotions);
  } catch (error) {
    console.error('Error reading promotions:', error);
    return NextResponse.json({ error: 'Failed to read promotions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const promotion = await request.json();
    const saved = savePromotion(promotion);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving promotion:', error);
    return NextResponse.json({ error: 'Failed to save promotion' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const promotion = await request.json();
    const saved = savePromotion(promotion);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving promotion:', error);
    return NextResponse.json({ error: 'Failed to save promotion' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.promotions && Array.isArray(body.promotions)) {
      body.promotions.forEach((promo: any) => savePromotion(promo));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error reordering promotions:', error);
    return NextResponse.json({ error: 'Failed to reorder promotions' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      deletePromotion(id);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}