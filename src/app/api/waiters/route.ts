import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'
import { hashPin } from '@/lib/staff/auth'

export const dynamic = 'force-dynamic'

interface WaiterProfile {
  id: string
  name: string
  employee_id: string | null
  active: boolean
  created_at: string
}

function toWaiter(row: any): WaiterProfile {
  return {
    id: row.id,
    name: row.name,
    employee_id: row.employee_id ?? null,
    active: row.on_duty ?? false,
    created_at: row.created_at,
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { data, error } = await getAdminClient()
    .from('staff_profiles')
    .select('id, name, employee_id, on_duty, created_at')
    .eq('role', 'waiter')
    .order('name')

  if (error) return NextResponse.json({ error: 'Failed to fetch waiters' }, { status: 500 })
  return NextResponse.json((data || []).map(toWaiter))
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, employee_id, pin } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Waiter name is required' }, { status: 400 })
    }
    if (!employee_id || typeof employee_id !== 'string' || !employee_id.trim()) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }
    if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })
    }

    const trimmedName = name.trim()
    const trimmedId = employee_id.trim().toUpperCase()

    // Check for duplicate employee_id
    const { data: existing } = await getAdminClient()
      .from('staff_profiles')
      .select('id')
      .eq('employee_id', trimmedId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Employee ID already exists' }, { status: 409 })
    }

    // Hash the PIN with bcrypt (salt is embedded in the hash)
    const hash = await hashPin(pin)
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await getAdminClient()
      .from('staff_profiles')
      .insert([{
        user_id: trimmedId,
        name: trimmedName,
        role: 'waiter',
        employee_id: trimmedId,
        pin_hash: hash,
        pin_salt: null,
        pin_set_at: now,
        pin_expires_at: expiresAt,
        on_duty: true,
        online: false,
      }])
      .select('id, name, employee_id, on_duty, created_at')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create waiter' }, { status: 500 })
    return NextResponse.json(toWaiter(data), { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) return NextResponse.json({ error: 'Waiter ID required' }, { status: 400 })

    const updateBody: Record<string, any> = {}
    if (body.name !== undefined) updateBody.name = body.name.trim()
    if (body.active !== undefined) updateBody.on_duty = !!body.active

    if (Object.keys(updateBody).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await getAdminClient()
      .from('staff_profiles')
      .update(updateBody)
      .eq('id', id)
      .eq('role', 'waiter')
      .select('id, name, employee_id, on_duty, created_at')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update waiter' }, { status: 500 })
    return NextResponse.json(toWaiter(data))
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Waiter ID required' }, { status: 400 })

  const { data, error } = await getAdminClient()
    .from('staff_profiles')
    .delete()
    .eq('id', id)
    .eq('role', 'waiter')
    .select('id, name')

  if (error) {
    // FK violation (23503) — waiter still referenced by historical records
    if (error.code === '23503') {
      return NextResponse.json({
        error: 'Cannot delete: this waiter still has linked records. Take them off duty instead, or delete their orders first.',
      }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to delete waiter' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Waiter not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, deleted: data[0] })
}
