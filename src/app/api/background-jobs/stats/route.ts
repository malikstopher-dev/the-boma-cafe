import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminPermission } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'background_jobs.read')
  if (authError) return authError

  const client = getAdminClient()

  const statuses = ['pending', 'processing', 'completed', 'failed', 'dead_letter', 'cancelled']
  const counts: Record<string, number> = {}

  for (const status of statuses) {
    const { count, error } = await client
      .from('background_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)
    if (error) return NextResponse.json({ error: 'Failed to load job statistics' }, { status: 500 })
    counts[status] = count || 0
  }

  const { data: jobTypes, error: typeError } = await client
    .from('background_jobs')
    .select('job_type')
    .neq('status', 'cancelled')
  if (typeError) return NextResponse.json({ error: 'Failed to load job statistics' }, { status: 500 })

  const typeCounts: Record<string, number> = {}
  if (jobTypes) {
    for (const row of jobTypes) {
      typeCounts[row.job_type] = (typeCounts[row.job_type] || 0) + 1
    }
  }

  return NextResponse.json({
    counts,
    by_type: typeCounts,
    total: Object.values(counts).reduce((sum, c) => sum + c, 0),
  })
}
