import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'
import { redactBackgroundJob } from '@/lib/jobs/admin-api'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminPermission(request, 'background_jobs.read')
  if (authError) return authError

  const { id } = await params
  const client = getAdminClient()

  const { data, error } = await client
    .from('background_jobs')
    .select('id, job_type, status, result, error, priority, retry_count, max_retries, scheduled_at, heartbeat_at, created_at, started_at, completed_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({ data: redactBackgroundJob(data) })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminPermission(request, 'background_jobs.write')
  if (authError) return authError

  const { id } = await params
  const client = getAdminClient()

  try {
    const body = await request.json()
    const action = body.action as string

    if (action === 'retry') {
      const { data: updated, error } = await client
        .from('background_jobs')
        .update({
          status: 'pending',
          error: null,
          scheduled_at: new Date().toISOString(),
          heartbeat_at: null,
          locked_by: null,
          lease_token: null,
          retry_count: 0,
        })
        .eq('id', id)
        .in('status', ['failed', 'dead_letter'])
        .select('id')
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (!updated) return NextResponse.json({ error: 'Job is not retryable' }, { status: 409 })
      await auditJobAction(request, id, 'retry')
      return NextResponse.json({ status: 'pending' })
    }

    if (action === 'cancel') {
      const { data: updated, error } = await client
        .from('background_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (!updated) return NextResponse.json({ error: 'Job is not cancellable' }, { status: 409 })
      await auditJobAction(request, id, 'cancel')
      return NextResponse.json({ status: 'cancelled' })
    }

    return NextResponse.json({ error: 'Invalid action. Use "retry" or "cancel".' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

async function auditJobAction(request: NextRequest, id: string, action: 'retry' | 'cancel'): Promise<void> {
  const admin = await getAdminContext(request)
  if (!admin) return
  await logAdminAction({
    adminId: admin.adminId,
    adminName: admin.displayName,
    adminRole: admin.role,
    sessionId: admin.sessionId,
    action: `background_job.${action}`,
    targetType: 'background_job',
    targetId: id,
    after: { action },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: request.headers.get('user-agent'),
  })
}
