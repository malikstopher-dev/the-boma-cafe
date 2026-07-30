'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'

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
  const router = useRouter()
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

  const columns: Column<ImportRecord>[] = [
    { key: 'filename', header: 'File', render: row => <span className="font-medium">{row.filename}</span> },
    { key: 'importType', header: 'Type', render: row => <span className="capitalize">{row.importType.replace('_', ' ')}</span> },
    {
      key: 'status',
      header: 'Status',
      render: row => <Badge variant={statusVariant[row.status] || 'default'}>{row.status}</Badge>,
    },
    { key: 'rowCount', header: 'Rows', render: row => row.rowCount ?? '—' },
    { key: 'matchedCount', header: 'Matched', render: row => row.matchedCount ?? '—' },
    { key: 'unknownCount', header: 'Unknown', render: row => row.unknownCount ?? '—' },
    {
      key: 'createdAt',
      header: 'Date',
      render: row => <span className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
  ]

  return (
    <AdminPage
      title="Imports"
      description="Supplier deliveries and stock count imports"
      actions={<Link href="/admin/inventory/imports/new"><Button size="sm">+ New Import</Button></Link>}
    >
      <DataTable
        columns={columns}
        data={imports}
        keyField="id"
        isLoading={isLoading}
        onRowClick={row => router.push(`/admin/inventory/imports/${row.id}`)}
        emptyState={{ title: 'No imports found', description: 'Upload a supplier spreadsheet to get started' }}
      />
    </AdminPage>
  )
}
