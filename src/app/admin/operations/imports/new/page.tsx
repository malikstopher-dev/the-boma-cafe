'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

type PreviewRow = {
  rowIndex: number
  productName?: string
  parsedQuantity?: number
  unitCost?: number
  match?: { productId?: string; matchSource: string; confidence?: number } | null
  errors: Array<{ message: string; field?: string }> | string[]
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
      const json = await res.json().catch(() => ({ error: { message: 'Upload failed — server returned an invalid response' } }))

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
      // Build decisions from the preview: apply every row with a matched
      // product and no validation errors. Rows that failed validation were
      // already excluded by the disabled Apply button, but guard anyway.
      const decisions = preview.rows
        .filter(r => r.match?.productId && (!r.errors || r.errors.length === 0))
        .map(r => ({
          rowIndex: r.rowIndex,
          action: 'apply' as const,
          productId: r.match?.productId,
          quantity: r.parsedQuantity ?? null,
          locationId: null,
          unitCost: r.unitCost ?? null,
          transactionType: importType === 'adjustment' ? 'adjustment' : 'purchase',
          sourceRow: r.productName,
        }))

      if (decisions.length === 0) {
        setError('No matched rows to apply — check for unknown or errored rows first.')
        return
      }

      const res = await fetch(`/api/inventory/imports/${preview.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions }),
      })
      const json = await res.json().catch(() => ({ error: { message: 'Apply failed — server returned an invalid response' } }))

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
        <div className="mb-4 p-3 rounded text-sm" style={{ background: '#3A1A1A', border: '1px solid #5A2020', color: '#E85454' }}>{error}</div>
      )}

      {!preview ? (
        <div className="max-w-lg rounded-lg border p-6 space-y-4" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#A09888' }}>Import Type</label>
            <select value={importType} onChange={e => setImportType(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" style={{ background: '#2A261E', borderColor: '#3A3428', color: '#F0EBE3' }}>
              <option value="supplier_delivery">Supplier Delivery</option>
              <option value="physical_count">Physical Stock Count</option>
              <option value="adjustment">Manual Adjustment</option>
            </select>
          </div>

          {importType === 'supplier_delivery' && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#A09888' }}>Supplier (optional)</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" style={{ background: '#2A261E', borderColor: '#3A3428', color: '#F0EBE3' }}>
                <option value="">Auto-detect from data</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#A09888' }}>Excel File (.xlsx or .csv)</label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer" style={{ borderColor: '#3A3428' }} onClick={() => fileInputRef.current?.click()}>
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
            <div className="rounded-lg border p-3 text-center" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
              <p className="text-2xl font-bold">{preview.totalRows}</p>
              <p className="text-xs" style={{ color: '#A09888' }}>Total Rows</p>
            </div>
            <div className="rounded-lg border p-3 text-center" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
              <p className="text-2xl font-bold" style={{ color: '#4CAF50' }}>{preview.matchedRows}</p>
              <p className="text-xs" style={{ color: '#A09888' }}>Matched</p>
            </div>
            <div className="rounded-lg border p-3 text-center" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
              <p className="text-2xl font-bold" style={{ color: '#FF9800' }}>{preview.unknownRows}</p>
              <p className="text-xs" style={{ color: '#A09888' }}>Unknown</p>
            </div>
            <div className="rounded-lg border p-3 text-center" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
              <p className="text-2xl font-bold" style={{ color: '#E85454' }}>{preview.errorRows}</p>
              <p className="text-xs" style={{ color: '#A09888' }}>Errors</p>
            </div>
            <div className="rounded-lg border p-3 text-center" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
              <p className="text-2xl font-bold">{preview.summary.totalQuantity}</p>
              <p className="text-xs" style={{ color: '#A09888' }}>Total Qty</p>
            </div>
          </div>

          {preview.rows.length > 0 && (
            <div className="rounded-lg border overflow-hidden" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b sticky top-0" style={{ background: '#242018' }}>
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Product</th>
                      <th className="text-right p-2 font-medium">Qty</th>
                      <th className="text-right p-2 font-medium">Unit Cost</th>
                      <th className="text-left p-2 font-medium">Match</th>
                      <th className="text-left p-2 font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map(row => (
                      <tr key={row.rowIndex} className={`border-b ${row.errors.length > 0 ? '' : !row.match || row.match.matchSource === 'none' ? '' : ''}`} style={row.errors.length > 0 ? { background: '#3A1A1A' } : !row.match || row.match.matchSource === 'none' ? { background: '#2A2210' } : undefined}>
                        <td className="p-2 text-xs text-gray-500">{row.rowIndex}</td>
                        <td className="p-2 font-medium">{row.productName || '—'}</td>
                        <td className="p-2 text-right">{row.parsedQuantity ?? '—'}</td>
                        <td className="p-2 text-right">{row.unitCost != null ? `R${row.unitCost.toFixed(2)}` : '—'}</td>
                        <td className="p-2">
                          {!row.match || row.match.matchSource === 'none' ? <Badge variant="warning">Unknown</Badge> :
                           row.match.matchSource === 'supplier_sku' ? <Badge variant="success">SKU</Badge> :
                           row.match.matchSource === 'exact_name' || row.match.matchSource === 'name_and_size' ? <Badge variant="info">Name</Badge> :
                           row.match.matchSource === 'saved_mapping' ? <Badge variant="info">Saved</Badge> :
                           row.match.matchSource === 'fuzzy' ? <Badge variant="warning">Fuzzy</Badge> :
                           row.match.productId ? <Badge variant="info">Matched</Badge> :
                           <Badge>—</Badge>}
                        </td>
                        <td className="p-2 text-xs" style={{ color: '#E85454' }}>{row.errors.map(e => typeof e === 'string' ? e : e.message).join(', ') || ''}</td>
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
