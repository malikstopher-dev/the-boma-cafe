import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const client = getAdminClient()

  const { data, error } = await client
    .from('background_jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const client = getAdminClient()

  try {
    const body = await request.json()
    const action = body.action as string

    if (action === 'retry') {
      const { error } = await client
        .from('background_jobs')
        .update({
          status: 'pending',
          error: null,
          scheduled_at: new Date().toISOString(),
          heartbeat_at: null,
          locked_by: null,
          retry_count: 0,
        })
        .eq('id', id)
        .in('status', ['failed', 'dead_letter'])

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ status: 'pending' })
    }

    if (action === 'cancel') {
      const { error } = await client
        .from('background_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ status: 'cancelled' })
    }

    return NextResponse.json({ error: 'Invalid action. Use "retry" or "cancel".' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
