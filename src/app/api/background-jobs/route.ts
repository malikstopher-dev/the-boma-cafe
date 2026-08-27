import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'
import { parseManualBackgroundJob, redactBackgroundJob } from '@/lib/jobs/admin-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'background_jobs.read')
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const jobType = searchParams.get('job_type')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  const client = getAdminClient()
  let query = client
    .from('background_jobs')
    .select('id, job_type, status, result, error, priority, retry_count, max_retries, scheduled_at, heartbeat_at, created_at, started_at, completed_at', { count: 'exact' })
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

  return NextResponse.json({ data: (data || []).map(row => redactBackgroundJob(row)), total: count, limit, offset })
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'background_jobs.write')
  if (authError) return authError

  try {
    const body = await request.json()
    const parsed = parseManualBackgroundJob(body)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid or unsupported background job' }, { status: 400 })
    }
    const client = getAdminClient()

    const { data, error } = await client
      .rpc('enqueue_background_job', {
        p_job_type: parsed.jobType,
        p_payload: parsed.payload,
        p_idempotency_key: parsed.idempotencyKey,
        p_priority: parsed.priority,
        p_max_retries: parsed.maxRetries,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row?.id) return NextResponse.json({ error: 'Failed to queue job' }, { status: 500 })

    const admin = await getAdminContext(request)
    if (admin) {
      await logAdminAction({
        adminId: admin.adminId,
        adminName: admin.displayName,
        adminRole: admin.role,
        sessionId: admin.sessionId,
        action: 'background_job.enqueue',
        targetType: 'background_job',
        targetId: row.id,
        after: { job_type: parsed.jobType, outcome: row.outcome },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: request.headers.get('user-agent'),
      })
    }

    return NextResponse.json({ id: row.id, outcome: row.outcome }, { status: row.outcome === 'inserted' ? 201 : 200 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
