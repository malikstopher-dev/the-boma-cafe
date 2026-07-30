import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const client = getAdminClient()

  const statuses = ['pending', 'processing', 'completed', 'failed', 'dead_letter', 'cancelled']
  const counts: Record<string, number> = {}

  for (const status of statuses) {
    const { count } = await client
      .from('background_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)
    counts[status] = count || 0
  }

  const { data: jobTypes } = await client
    .from('background_jobs')
    .select('job_type')
    .neq('status', 'cancelled')

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
