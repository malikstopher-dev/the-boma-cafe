import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventorySupplier } from '@/inventory/engine/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventorySupplier & { products?: unknown[] }>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { data, error } = await supabase
      .from('inventory_suppliers')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Supplier not found: ${id}` } },
        { status: 404 },
      )
    }

    const { data: products } = await supabase
      .from('inventory_products')
      .select('id, name, sku, is_active')
      .eq('preferred_supplier_id', id)
      .order('name')

    return NextResponse.json({ data: { ...data, products: products ?? [] } })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventorySupplier>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()
    const body = await request.json()

    const allowedFields = ['name', 'contact_person', 'phone', 'email', 'vat_number', 'payment_terms', 'payment_term_type', 'payment_term_days', 'lead_time_days', 'notes']

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if ('payment_term_type' in body && updates.payment_term_type !== null) {
      const t = updates.payment_term_type as string
      if (!['CASH', 'COD', 'ACCOUNT', 'WEEKLY', 'MONTHLY'].includes(t)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: `Invalid payment_term_type: ${t}. Must be one of CASH, COD, ACCOUNT, WEEKLY, MONTHLY` } },
          { status: 400 },
        )
      }
    }
    if ('payment_term_days' in body && updates.payment_term_days != null) {
      const d = Number(updates.payment_term_days)
      if (!Number.isFinite(d) || d < 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'payment_term_days must be a non-negative number' } },
          { status: 400 },
        )
      }
      updates.payment_term_days = d
    }
    if (updates.payment_term_type !== 'ACCOUNT') {
      updates.payment_term_days = null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
        { status: 400 },
      )
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('inventory_suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Supplier not found: ${id}` } },
          { status: 404 },
        )
      }
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    await supabase
      .from('inventory_audit_log')
      .insert({ table_name: 'inventory_suppliers', record_id: id, action: 'updated', changes: updates })

    return NextResponse.json({ data: data as InventorySupplier })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<void>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { count: productCount } = await supabase
      .from('inventory_products')
      .select('*', { count: 'exact', head: true })
      .eq('preferred_supplier_id', id)

    const { count: importCount } = await supabase
      .from('inventory_imports')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', id)

    if ((productCount ?? 0) > 0 || (importCount ?? 0) > 0) {
      await supabase
        .from('inventory_suppliers')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', id)

      await supabase
        .from('inventory_audit_log')
        .insert({ table_name: 'inventory_suppliers', record_id: id, action: 'archived' })

      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Supplier has linked products or imports. Archived instead.' } },
        { status: 409 },
      )
    }

    await supabase.from('inventory_suppliers').delete().eq('id', id)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<void>>> {
  return NextResponse.json(
    { error: { code: 'BAD_REQUEST', message: 'Unsupported action on supplier resource. Use POST /api/inventory/suppliers/:id/restore' } },
    { status: 400 },
  )
}
