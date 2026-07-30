'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'

interface ImportRecord {
  id: string
  importType: string
  filename: string
  status: string
  supplierId: string | null
  supplierName: string | null
  rowCount: number | null
  matchedCount: number | null
  unknownCount: number | null
  errorCount: number | null
  appliedBy: string | null
  appliedAt: string | null
  createdAt: string
  canRollback: boolean
}

export default function ImportsPage() {
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchImports = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/imports')
      const json = await res.json()
      setImports(json.data || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchImports() }, [fetchImports])

  const statusVariant: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
    applied: 'success',
    pending: 'default',
    previewed: 'info',
    rolled_back: 'warning',
    failed: 'danger',
  }

  return (
    <div>
      <PageHeader title="Imports" description="Supplier deliveries and stock count imports" actions={<Link href="/admin/inventory/imports/new"><Button variant="primary" size="sm">+ New Import</Button></Link>} />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : imports.length === 0 ? (
        <EmptyState title="No imports found" description="Upload a supplier spreadsheet to get started" />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">File</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Rows</th>
                  <th className="text-left p-3 font-medium">Matched</th>
                  <th className="text-left p-3 font-medium">Unknown</th>
                  <th className="text-left p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {imports.map(imp => (
                  <tr key={imp.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/admin/inventory/imports/${imp.id}`}>
                    <td className="p-3 font-medium">{imp.filename}</td>
                    <td className="p-3 capitalize">{imp.importType.replace('_', ' ')}</td>
                    <td className="p-3">
                      <Badge variant={statusVariant[imp.status] || 'default'}>{imp.status}</Badge>
                    </td>
                    <td className="p-3">{imp.rowCount ?? '—'}</td>
                    <td className="p-3">{imp.matchedCount ?? '—'}</td>
                    <td className="p-3">{imp.unknownCount ?? '—'}</td>
                    <td className="p-3 text-xs text-gray-500">{new Date(imp.createdAt).toLocaleDateString()}</td>
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
