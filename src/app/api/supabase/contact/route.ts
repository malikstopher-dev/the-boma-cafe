import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminOrKitchen } from '@/lib/auth/requireRole'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  const { data, error } = await getAdminClient()
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`contact:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { name, phone, email, subject, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const { data, error } = await getAdminClient()
      .from('contact_messages')
      .insert([{ name, phone, email, subject: subject || null, message }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, contact_message: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Contact message ID required' }, { status: 400 })
  }

  const { error } = await getAdminClient()
    .from('contact_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Contact message ID required' }, { status: 400 })
  }

  const { error } = await getAdminClient()
    .from('contact_messages')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
