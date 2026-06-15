import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAnyRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authError = await requireAnyRole(['admin'])
  if (authError) return authError

  const { data, error } = await getAdminClient()
    .from('waiters')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authError = await requireAnyRole(['admin'])
  if (authError) return authError

  try {
    const { name } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Waiter name is required' }, { status: 400 })
    }

    const { data, error } = await getAdminClient()
      .from('waiters')
      .insert([{ name: name.trim() }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAnyRole(['admin'])
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) return NextResponse.json({ error: 'Waiter ID required' }, { status: 400 })

    const updateBody: Record<string, any> = {}
    if (body.name !== undefined) updateBody.name = body.name.trim()
    if (body.active !== undefined) updateBody.active = body.active

    if (Object.keys(updateBody).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await getAdminClient()
      .from('waiters')
      .update(updateBody)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAnyRole(['admin'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Waiter ID required' }, { status: 400 })

  const { error } = await getAdminClient()
    .from('waiters')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
