import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPromotions, savePromotion, deletePromotion } from '@/lib/cms-supabase';
import { requireAdminPermission } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const promotions = await getPromotions();
    return NextResponse.json(promotions);
  } catch (error) {
    console.error('Error reading promotions:', error);
    return NextResponse.json({ error: 'Failed to read promotions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const promotion = await request.json();
    const saved = await savePromotion(promotion);
    revalidatePath('/promotions');
    revalidatePath('/');
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving promotion:', error);
    return NextResponse.json({ error: 'Failed to save promotion' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const promotion = await request.json();
    const saved = await savePromotion(promotion);
    revalidatePath('/promotions');
    revalidatePath('/');
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving promotion:', error);
    return NextResponse.json({ error: 'Failed to save promotion' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const body = await request.json();
    if (body.promotions && Array.isArray(body.promotions)) {
      for (const promo of body.promotions) {
        await savePromotion(promo);
      }
      revalidatePath('/promotions');
      revalidatePath('/');
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error reordering promotions:', error);
    return NextResponse.json({ error: 'Failed to reorder promotions' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      await deletePromotion(id);
      revalidatePath('/promotions');
      revalidatePath('/');
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
