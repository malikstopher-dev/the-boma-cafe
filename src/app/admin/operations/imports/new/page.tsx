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
        <div style={{maxWidth:544,background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:24,display:'flex',flexDirection:'column',gap:16,fontFamily:'Inter, sans-serif'}}>
          <div>
            <label style={{display:'block',fontSize:13,fontWeight:600,color:'#A09888',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>Import Type</label>
            <select value={importType} onChange={e => setImportType(e.target.value)} style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',width:'100%',fontFamily:'Inter, sans-serif',outline:'none'}}>
              <option value="supplier_delivery">Supplier Delivery</option>
              <option value="physical_count">Physical Stock Count</option>
              <option value="adjustment">Manual Adjustment</option>
            </select>
          </div>

          {importType === 'supplier_delivery' && (
            <div>
              <label style={{display:'block',fontSize:13,fontWeight:600,color:'#A09888',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>Supplier (optional)</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',width:'100%',fontFamily:'Inter, sans-serif',outline:'none'}}>
                <option value="">Auto-detect from data</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={{display:'block',fontSize:13,fontWeight:600,color:'#A09888',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>Excel File (.xlsx or .csv)</label>
            <div
              style={{border:'2px dashed #3A3428',borderRadius:12,padding:40,textAlign:'center',cursor:'pointer',color:'#6B6358',transition:'border-color 0.15s',fontFamily:'Inter, sans-serif'}}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#C8A04E')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#3A3428')}
            >
              {file ? (
                <div>
                  <p style={{fontWeight:500,fontSize:14,color:'#F0EBE3'}}>{file.name}</p>
                  <p style={{fontSize:12,color:'#6B6358',marginTop:4}}>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p style={{fontSize:14,color:'#6B6358'}}>Click to select a file</p>
                  <p style={{fontSize:12,color:'#6B6358',marginTop:4}}>.xlsx or .csv</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            style={{width:'100%',background:(!file || isUploading) ? '#3A3428' : '#C8A04E',color:(!file || isUploading) ? '#6B6358' : '#1A1610',fontWeight:600,borderRadius:8,padding:'10px 16px',fontSize:14,border:'none',cursor:(!file || isUploading) ? 'not-allowed' : 'pointer',fontFamily:'Inter, sans-serif'}}
          >
            {isUploading ? 'Uploading & Parsing...' : 'Upload & Preview'}
          </button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:16,fontFamily:'Inter, sans-serif'}}>
          <div className="grid grid-cols-2 lg:grid-cols-5" style={{gap:12}}>
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:12,textAlign:'center'}}>
              <p style={{fontSize:24,fontWeight:700,color:'#F0EBE3'}}>{preview.totalRows}</p>
              <p style={{fontSize:11,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em'}}>Total Rows</p>
            </div>
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:12,textAlign:'center'}}>
              <p style={{fontSize:24,fontWeight:700,color:'#4CAF50'}}>{preview.matchedRows}</p>
              <p style={{fontSize:11,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em'}}>Matched</p>
            </div>
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:12,textAlign:'center'}}>
              <p style={{fontSize:24,fontWeight:700,color:'#FF9800'}}>{preview.unknownRows}</p>
              <p style={{fontSize:11,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em'}}>Unknown</p>
            </div>
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:12,textAlign:'center'}}>
              <p style={{fontSize:24,fontWeight:700,color:'#E85454'}}>{preview.errorRows}</p>
              <p style={{fontSize:11,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em'}}>Errors</p>
            </div>
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:12,textAlign:'center'}}>
              <p style={{fontSize:24,fontWeight:700,color:'#F0EBE3'}}>{preview.summary.totalQuantity}</p>
              <p style={{fontSize:11,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em'}}>Total Qty</p>
            </div>
          </div>

          {preview.rows.length > 0 && (
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,overflow:'hidden'}}>
              <div className="overflow-x-auto max-h-80">
                <table style={{width:'100%',fontSize:14}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #3A3428',background:'#242018'}}>
                      <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>#</th>
                      <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Product</th>
                      <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Qty</th>
                      <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Unit Cost</th>
                      <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Match</th>
                      <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map(row => (
                      <tr key={row.rowIndex} style={{borderBottom:'1px solid #3A3428',background:row.errors.length > 0 ? '#3A1A1A' : !row.match || row.match.matchSource === 'none' ? '#2A2210' : undefined}}>
                        <td style={{padding:'12px 16px',fontSize:12,color:'#6B6358'}}>{row.rowIndex}</td>
                        <td style={{padding:'12px 16px',fontWeight:500,color:'#F0EBE3'}}>{row.productName || '—'}</td>
                        <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3'}}>{row.parsedQuantity ?? '—'}</td>
                        <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3'}}>{row.unitCost != null ? `R${row.unitCost.toFixed(2)}` : '—'}</td>
                        <td style={{padding:'12px 16px'}}>
                          {!row.match || row.match.matchSource === 'none' ? <Badge variant="warning">Unknown</Badge> :
                           row.match.matchSource === 'supplier_sku' ? <Badge variant="success">SKU</Badge> :
                           row.match.matchSource === 'exact_name' || row.match.matchSource === 'name_and_size' ? <Badge variant="info">Name</Badge> :
                           row.match.matchSource === 'saved_mapping' ? <Badge variant="info">Saved</Badge> :
                           row.match.matchSource === 'fuzzy' ? <Badge variant="warning">Fuzzy</Badge> :
                           row.match.productId ? <Badge variant="info">Matched</Badge> :
                           <Badge>—</Badge>}
                        </td>
                        <td style={{padding:'12px 16px',fontSize:12,color:'#E85454'}}>{row.errors.map(e => typeof e === 'string' ? e : e.message).join(', ') || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:12}}>
            <Button onClick={handleApply} disabled={isApplying || preview.errorRows > 0} variant="primary">
              {isApplying ? 'Applying...' : 'Apply Import'}
            </Button>
            <Button onClick={() => { setPreview(null); setFile(null); setError(null) }} variant="secondary">
              Cancel
            </Button>
          </div>
          {preview.errorRows > 0 && (
            <p style={{fontSize:12,color:'#E85454'}}>Fix errors in the spreadsheet before applying.</p>
          )}
        </div>
      )}
    </AdminPage>
    </div>
  )
}
