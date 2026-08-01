'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'
import FilterBar from '@/components/admin/design-system/FilterBar'
import Button from '@/components/admin/design-system/Button'
import { Select } from '@/components/admin/design-system/Input'
import Badge from '@/components/admin/design-system/Badge'
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

type BackgroundJob = {
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

  const columns: Column<BackgroundJob>[] = [
    {
      key: 'job_type',
      header: 'Type',
      cell: job => (
        <span className="font-mono text-xs">{job.job_type}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: job => (
        <Badge variant={STATUS_VARIANTS[job.status] || 'default'}>
          {job.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'retry_count',
      header: 'Retries',
      cell: job => (
        <span>{job.retry_count}/{job.max_retries}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      cell: job => (
        <span className="text-gray-500 text-xs">{new Date(job.created_at).toLocaleString()}</span>
      ),
    },
    {
      key: 'scheduled_at',
      header: 'Scheduled',
      cell: job => (
        <span className="text-gray-500 text-xs">{new Date(job.scheduled_at).toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: job => {
        if (job.status === 'failed' || job.status === 'dead_letter') {
          return (
            <Button size="sm" variant="primary" onClick={() => handleAction(job.id, 'retry')} loading={actionLoading === job.id}>
              Retry
            </Button>
          )
        }
        if (job.status === 'pending') {
          return (
            <Button size="sm" variant="danger" onClick={() => handleAction(job.id, 'cancel')} loading={actionLoading === job.id}>
              Cancel
            </Button>
          )
        }
        return null
      },
    },
  ]

  return (
    <AdminPage title="Background Jobs" description="Monitor and manage async job processing">
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

      <FilterBar>
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
      </FilterBar>

      <DataTable<BackgroundJob>
        columns={columns}
        data={jobs}
        keyField="id"
        isLoading={isLoading}
        emptyState={
          <EmptyState
            title="No jobs found"
            description={statusFilter ? 'No jobs match the selected filter' : 'No background jobs have been created yet'}
          />
        }
      />
    </AdminPage>
  )
}
