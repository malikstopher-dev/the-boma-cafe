'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'

export default function ImportDetailPage() {
  const params = useParams()
  const [importData, setImportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = params?.id as string
    if (!id) return

    fetch(`/api/inventory/imports/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error.message)
        else setImportData(json.data)
      })
      .catch(() => setError('Failed to load import'))
      .finally(() => setIsLoading(false))
  }, [params?.id])

  async function handleRollback() {
    if (!importData?.id) return
    if (!confirm('Are you sure? This will reverse all transactions from this import.')) return

    try {
      const res = await fetch(`/api/inventory/imports/${importData.id}/rollback`, { method: 'POST' })
      if (res.ok) {
        alert('Import rolled back successfully')
        window.location.reload()
      } else {
        const err = await res.json()
        alert(err.error?.message || 'Rollback failed')
      }
    } catch {
      alert('Network error')
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Import Detail" description="Loading..." />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !importData) {
    return (
      <div>
        <PageHeader title="Import Detail" />
        <EmptyState title="Import not found" description={error || 'Could not load import details'} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={importData.filename} description={`${importData.importType?.replace('_', ' ') || 'Import'} — ${new Date(importData.createdAt || importData.created_at).toLocaleString()}`} actions={<><Badge variant={
          importData.status === 'applied' ? 'success' :
          importData.status === 'rolled_back' ? 'warning' :
          importData.status === 'failed' ? 'danger' : 'default'
        }>{importData.status}</Badge>
        {importData.canRollback && (
          <Button onClick={handleRollback} variant="danger" size="sm">Rollback Import</Button>
        )}
        <Link href="/admin/inventory/imports"><Button variant="secondary" size="sm">Back</Button></Link></>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Summary</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Total Rows</dt>
              <dd className="font-medium">{importData.rowCount ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Matched</dt>
              <dd className="font-medium text-green-600">{importData.matchedCount ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Unknown</dt>
              <dd className="font-medium text-yellow-600">{importData.unknownCount ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Errors</dt>
              <dd className="font-medium text-red-600">{importData.errorCount ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border p-4 lg:col-span-2">
          <h3 className="font-semibold mb-3">Import Details</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">File</dt><dd className="font-medium">{importData.filename}</dd></div>
            <div><dt className="text-gray-500">Type</dt><dd className="font-medium capitalize">{importData.importType?.replace('_', ' ') || '—'}</dd></div>
            <div><dt className="text-gray-500">Status</dt><dd className="font-medium">{importData.status}</dd></div>
            <div><dt className="text-gray-500">Applied At</dt><dd className="font-medium">{importData.appliedAt || importData.applied_at ? new Date(importData.appliedAt || importData.applied_at).toLocaleString() : '—'}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  )
}
