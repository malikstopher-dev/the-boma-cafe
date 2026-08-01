'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
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
      <AdminPage title="Import Detail">
        <SkeletonCard />
      </AdminPage>
    )
  }

  if (error || !importData) {
    return (
      <AdminPage title="Import Detail">
        <EmptyState title="Import not found" description={error || 'Could not load import details'} />
      </AdminPage>
    )
  }

  return (
    <AdminPage title={importData.filename} description={`${importData.importType?.replace('_', ' ') || 'Import'} ÔÇö ${new Date(importData.createdAt || importData.created_at).toLocaleString()}`} actions={<><Badge variant={
        importData.status === 'applied' ? 'success' :
        importData.status === 'rolled_back' ? 'warning' :
        importData.status === 'failed' ? 'danger' : 'default'
      }>{importData.status}</Badge>
      {importData.canRollback && (
        <Button onClick={handleRollback} variant="danger" size="sm">Rollback Import</Button>
      )}
      <Link href="/admin/operations/imports"><Button variant="secondary" size="sm">Back</Button></Link></>}>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16}}>
          <h3 style={{fontWeight:600,marginBottom:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Summary</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt style={{color:'#A09888'}}>Total Rows</dt>
              <dd style={{fontWeight:500,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{importData.rowCount ?? 'ÔÇö'}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{color:'#A09888'}}>Matched</dt>
              <dd style={{fontWeight:500,color:'#4CAF50',fontFamily:'Inter, sans-serif'}}>{importData.matchedCount ?? 'ÔÇö'}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{color:'#A09888'}}>Unknown</dt>
              <dd style={{fontWeight:500,color:'#FF9800',fontFamily:'Inter, sans-serif'}}>{importData.unknownCount ?? 'ÔÇö'}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{color:'#A09888'}}>Errors</dt>
              <dd style={{fontWeight:500,color:'#E85454',fontFamily:'Inter, sans-serif'}}>{importData.errorCount ?? 'ÔÇö'}</dd>
            </div>
          </dl>
        </div>

        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16,gridColumn:'span 2'}}>
          <h3 style={{fontWeight:600,marginBottom:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Import Details</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt style={{color:'#A09888'}}>File</dt><dd style={{fontWeight:500,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{importData.filename}</dd></div>
            <div><dt style={{color:'#A09888'}}>Type</dt><dd style={{fontWeight:500,color:'#F0EBE3',fontFamily:'Inter, sans-serif',textTransform:'capitalize'}}>{importData.importType?.replace('_', ' ') || 'ÔÇö'}</dd></div>
            <div><dt style={{color:'#A09888'}}>Status</dt><dd style={{fontWeight:500,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{importData.status}</dd></div>
            <div><dt style={{color:'#A09888'}}>Applied At</dt><dd style={{fontWeight:500,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{importData.appliedAt || importData.applied_at ? new Date(importData.appliedAt || importData.applied_at).toLocaleString() : 'ÔÇö'}</dd></div>
          </dl>
        </div>
      </div>
    </AdminPage>
  )
}