import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const jobType = searchParams.get('job_type')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  const client = getAdminClient()
  let query = client
    .from('background_jobs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }
  if (jobType) {
    query = query.eq('job_type', jobType)
  }

  const { data, error, count } = await query
  if (error) {
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 })
  }

  return NextResponse.json({ data, total: count, limit, offset })
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const client = getAdminClient()

    const { data, error } = await client
      .from('background_jobs')
      .insert({
        job_type: body.job_type,
        payload: body.payload || {},
        idempotency_key: body.idempotency_key || null,
        priority: body.priority || 0,
        max_retries: body.max_retries || 3,
        scheduled_at: body.scheduled_at || new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
