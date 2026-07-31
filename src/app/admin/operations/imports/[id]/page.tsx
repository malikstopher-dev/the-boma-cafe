'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

type PreviewRow = {
  id: string
  rowNumber: number
  sourceRow: number
  productName?: string
  sku?: string
  quantity?: number
  unitCost?: number
  location?: string
  match?: { productId?: string; matchSource: string; confidence?: number }
  errors: string[]
}

type PreviewData = {
  id: string
  importType: string
  filename: string
  totalRows: number
  matchedRows: number
  unknownRows: number
  errorRows: number
  rows: PreviewRow[]
  summary: {
    totalProducts: number
    matchedProducts: number
    unknownProducts: number
    totalQuantity: number
    totalValue: number
  }
  createdAt: string
}

export default function NewImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importType, setImportType] = useState('supplier_delivery')
  const [supplierId, setSupplierId] = useState('')
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [suppliersLoaded, setSuppliersLoaded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setPreview(null)
      setError(null)
    }
    if (!suppliersLoaded) {
      fetch('/api/inventory/suppliers?page_size=50')
        .then(r => r.json())
        .then(json => {
          setSuppliers((json.data || []).map((s: any) => ({ id: s.id, name: s.name })))
          setSuppliersLoaded(true)
        })
        .catch(() => {})
    }
  }

  async function handleUpload() {
    if (!file) return
    setIsUploading(true)
    setError(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('importType', importType)
      if (supplierId) fd.append('supplierId', supplierId)

      const res = await fetch('/api/inventory/imports', { method: 'POST', body: fd })
      const json = await res.json()

      if (res.ok) {
        setPreview(json.data)
      } else {
        setError(json.error?.message || 'Upload failed')
      }
    } catch {
      setError('Network error during upload')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleApply() {
    if (!preview?.id) return
    setIsApplying(true)
    setError(null)

    try {
      const res = await fetch(`/api/inventory/imports/${preview.id}/apply`, { method: 'POST' })
      const json = await res.json()

      if (res.ok) {
        router.push(`/admin/operations/imports/${preview.id}`)
      } else {
        setError(json.error?.message || 'Apply failed')
      }
    } catch {
      setError('Network error during apply')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div>
      <AdminPage title="New Import" description="Upload a supplier spreadsheet or stock count file" actions={<Link href="/admin/operations/imports"><Button variant="secondary" size="sm">Back</Button></Link>}>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {!preview ? (
        <div className="max-w-lg bg-white rounded-lg border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Import Type</label>
            <select value={importType} onChange={e => setImportType(e.target.value)} className="border rounded px-3 py-2 text-sm w-full">
              <option value="supplier_delivery">Supplier Delivery</option>
              <option value="physical_count">Physical Stock Count</option>
              <option value="adjustment">Manual Adjustment</option>
            </select>
          </div>

          {importType === 'supplier_delivery' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (optional)</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="border rounded px-3 py-2 text-sm w-full">
                <option value="">Auto-detect from data</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excel File (.xlsx or .csv)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400" onClick={() => fileInputRef.current?.click()}>
              {file ? (
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Click to select a file</p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx or .csv</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
          </div>

          <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
            {isUploading ? 'Uploading & Parsing...' : 'Upload & Preview'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{preview.totalRows}</p>
              <p className="text-xs text-gray-500">Total Rows</p>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{preview.matchedRows}</p>
              <p className="text-xs text-gray-500">Matched</p>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{preview.unknownRows}</p>
              <p className="text-xs text-gray-500">Unknown</p>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{preview.errorRows}</p>
              <p className="text-xs text-gray-500">Errors</p>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{preview.summary.totalQuantity}</p>
              <p className="text-xs text-gray-500">Total Qty</p>
            </div>
          </div>

          {preview.rows.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 sticky top-0">
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Product</th>
                      <th className="text-left p-2 font-medium">SKU</th>
                      <th className="text-right p-2 font-medium">Qty</th>
                      <th className="text-right p-2 font-medium">Unit Cost</th>
                      <th className="text-left p-2 font-medium">Match</th>
                      <th className="text-left p-2 font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map(row => (
                      <tr key={row.id} className={`border-b ${row.errors.length > 0 ? 'bg-red-50' : row.match?.matchSource === 'none' ? 'bg-yellow-50' : ''}`}>
                        <td className="p-2 text-xs text-gray-500">{row.rowNumber}</td>
                        <td className="p-2 font-medium">{row.productName || '—'}</td>
                        <td className="p-2 text-xs">{row.sku || '—'}</td>
                        <td className="p-2 text-right">{row.quantity ?? '—'}</td>
                        <td className="p-2 text-right">{row.unitCost != null ? `R${row.unitCost.toFixed(2)}` : '—'}</td>
                        <td className="p-2">
                          {row.match?.matchSource === 'none' ? <Badge variant="warning">Unknown</Badge> :
                           row.match?.matchSource === 'sku' ? <Badge variant="success">SKU</Badge> :
                           row.match?.matchSource === 'name' ? <Badge variant="info">Name</Badge> :
                           row.match?.productId ? <Badge variant="info">Matched</Badge> :
                           <Badge>—</Badge>}
                        </td>
                        <td className="p-2 text-xs text-red-600">{row.errors.join(', ') || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleApply} disabled={isApplying || preview.errorRows > 0} variant="primary">
              {isApplying ? 'Applying...' : 'Apply Import'}
            </Button>
            <Button onClick={() => { setPreview(null); setFile(null); setError(null) }} variant="secondary">
              Cancel
            </Button>
          </div>
          {preview.errorRows > 0 && (
            <p className="text-xs text-red-500">Fix errors in the spreadsheet before applying.</p>
          )}
        </div>
      )}
    </AdminPage>
    </div>
  )
}
