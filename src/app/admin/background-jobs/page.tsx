'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import { Select } from '@/components/admin/design-system/Input'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'
import { useToast } from '@/components/admin/design-system/Toast'

const STATUSES = ['pending', 'processing', 'completed', 'failed', 'dead_letter', 'cancelled'] as const

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'danger' | 'default' | 'info'> = {
  pending: 'default',
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
  dead_letter: 'danger',
  cancelled: 'info',
}

interface BackgroundJob {
  id: string
  job_type: string
  status: string
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: Record<string, unknown> | null
  idempotency_key: string | null
  priority: number
  retry_count: number
  max_retries: number
  scheduled_at: string
  heartbeat_at: string | null
  locked_by: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export default function AdminBackgroundJobs() {
  const [jobs, setJobs] = useState<BackgroundJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const { success, error: showError } = useToast()

  const fetchJobs = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('job_type', typeFilter)

    const [jobsRes, statsRes] = await Promise.all([
      fetch(`/api/background-jobs?${params}`),
      fetch('/api/background-jobs/stats'),
    ])
    const jobsData = await jobsRes.json()
    const statsData = await statsRes.json()

    setJobs(jobsData.data || [])
    setStats(statsData.counts || null)
    setIsLoading(false)
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 15000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  async function handleAction(jobId: string, action: string) {
    setActionLoading(jobId)
    try {
      const res = await fetch(`/api/background-jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json()
        showError(err.error || 'Action failed')
      } else {
        success(action === 'retry' ? 'Job queued for retry' : 'Job cancelled')
        fetchJobs()
      }
    } catch {
      showError('Network error')
    } finally {
      setActionLoading(null)
    }
  }

  const jobTypes = [...new Set(jobs.map(j => j.job_type))]

  return (
    <div>
      <PageHeader
        title="Background Jobs"
        description="Monitor and manage async job processing"
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Object.entries(stats).map(([status, count]) => (
            <div key={status} className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 capitalize">{status.replace('_', ' ')}</span>
                <Badge variant={STATUS_VARIANTS[status] || 'default'}>{count as number}</Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{count as number}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
          options={[
            { value: '', label: 'All Statuses' },
            ...STATUSES.map(s => ({ value: s, label: s.replace('_', ' ') })),
          ]}
        />

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48"
          options={[
            { value: '', label: 'All Types' },
            ...jobTypes.map(t => ({ value: t, label: t })),
          ]}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No jobs found"
          description={statusFilter ? 'No jobs match the selected filter' : 'No background jobs have been created yet'}
        />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Retries</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="text-left p-3 font-medium">Scheduled</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{job.job_type}</td>
                    <td className="p-3">
                      <Badge variant={STATUS_VARIANTS[job.status] || 'default'}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {job.retry_count}/{job.max_retries}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {new Date(job.scheduled_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      {job.status === 'failed' || job.status === 'dead_letter' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleAction(job.id, 'retry')}
                          loading={actionLoading === job.id}
                        >
                          Retry
                        </Button>
                      ) : job.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleAction(job.id, 'cancel')}
                          loading={actionLoading === job.id}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
