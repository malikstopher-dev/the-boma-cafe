'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

// ─── Types (mirror the ImportTypes shape returned by the API) ────────────
type ImportField =
  | 'productName' | 'quantity' | 'unit' | 'supplierSku' | 'unitCost'
  | 'bottleSizeMl' | 'fullBottles' | 'tots' | 'categoryName' | 'inventoryType'
  | 'sku' | 'barcode' | 'parLevel' | 'reorderPoint' | 'preferredSupplier' | 'notes'

const FIELD_CHOICES: ImportField[] = [
  'productName', 'quantity', 'unit', 'supplierSku', 'unitCost', 'bottleSizeMl',
  'fullBottles', 'tots', 'categoryName', 'inventoryType', 'sku', 'barcode',
  'parLevel', 'reorderPoint', 'preferredSupplier', 'notes',
]

const FIELD_LABELS: Record<ImportField, string> = {
  productName: 'Product Name',
  quantity: 'Quantity',
  unit: 'Unit / Package Size',
  supplierSku: 'Supplier SKU / Code',
  unitCost: 'Unit Cost',
  bottleSizeMl: 'Bottle / Volume (ml)',
  fullBottles: 'Full Bottles',
  tots: 'Tots / Shots',
  categoryName: 'Category',
  inventoryType: 'Item Type',
  sku: 'Internal SKU',
  barcode: 'Barcode',
  parLevel: 'Par Level',
  reorderPoint: 'Reorder Point',
  preferredSupplier: 'Preferred Supplier',
  notes: 'Notes',
}

type DetectedHeader = {
  field: ImportField | null
  header: string
  match: 'exact' | 'alias' | 'none'
}

type PreviewRow = {
  rowIndex: number
  productName?: string
  parsedQuantity?: number | null
  unitCost?: number | null
  match?: { productId?: string | null; matchSource: string; confidence?: number } | null
  errors: Array<{ message: string; field?: string }> | string[]
  warnings: string[]
  skipped?: boolean
  skipReason?: string | null
}

type PreviewData = {
  id: string
  importType: string
  filename: string
  totalRows: number
  matchedRows: number
  unknownRows: number
  errorRows: number
  skippedRows?: number
  skipReasons?: string[]
  headers?: DetectedHeader[]
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

const STEP_LABELS = ['Upload', 'Map Columns', 'Preview', 'Confirm']

function errorField(e: string | { message: string; field?: string }): string | undefined {
  return typeof e === 'string' ? undefined : e.field
}

function sourceLabel(source?: string): string {
  switch (source) {
    case 'supplier_sku': return 'SKU'
    case 'exact_name': return 'Name'
    case 'name_and_size': return 'Name + Size'
    case 'saved_mapping': return 'Saved'
    case 'fuzzy': return 'Fuzzy'
    case 'none': return 'Unknown'
    default: return '—'
  }
}

function sourceVariant(source?: string): 'success' | 'info' | 'warning' | 'danger' | 'default' {
  switch (source) {
    case 'supplier_sku': return 'success'
    case 'exact_name': return 'success'
    case 'name_and_size': return 'info'
    case 'saved_mapping': return 'info'
    case 'fuzzy': return 'warning'
    case 'none': return 'danger'
    default: return 'default'
  }
}

// The mapping default: field -> its own chosen spreadsheet header.
// Start from the server's auto-detection; the user can override below.
function buildOverride(headers: DetectedHeader[]): Partial<Record<ImportField, string>> {
  const map: Partial<Record<ImportField, string>> = {}
  headers.forEach(h => {
    if (h.field && h.header) map[h.field] = h.header
  })
  return map
}

export default function NewImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [importType, setImportType] = useState('supplier_delivery')
  const [supplierId, setSupplierId] = useState('')
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [suppliersLoaded, setSuppliersLoaded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [headers, setHeaders] = useState<DetectedHeader[] | null>(null)
  const [overrideMap, setOverrideMap] = useState<Partial<Record<ImportField, string>>>({})
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [rowEdits, setRowEdits] = useState<Record<number, { quantity?: string; unitCost?: string; productName?: string }>>({})
  const [skippedRows, setSkippedRows] = useState<Set<number>>(new Set())
  const [bulkQuantity, setBulkQuantity] = useState('')
  const [bulkUnitCost, setBulkUnitCost] = useState('')

  const loadSuppliers = useCallback(() => {
    if (suppliersLoaded) return
    fetch('/api/inventory/suppliers?page_size=100')
      .then(r => r.json())
      .then(json => {
        setSuppliers((json.data || []).map((s: any) => ({ id: s.id, name: s.name })))
        setSuppliersLoaded(true)
      })
      .catch(() => {})
  }, [suppliersLoaded])

  // When the server finishes auto-detecting, seed the override map once.
  async function detectColumns(fileToUse: File) {
    setIsDetecting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', fileToUse)
      fd.append('action', 'detect')
      const res = await fetch('/api/inventory/imports', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({ error: { message: 'Column detection failed' } }))
      if (res.ok) {
        const detected = (json.data || []) as DetectedHeader[]
        setHeaders(detected)
        setOverrideMap(buildOverride(detected))
        setFile(fileToUse)
        setStep(1)
      } else {
        setError(json.error?.message || 'Column detection failed')
      }
    } catch {
      setError('Network error during column detection')
    } finally {
      setIsDetecting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPreview(null)
    setError(null)
    setRowEdits({})
    loadSuppliers()
    void detectColumns(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    setPreview(null)
    setError(null)
    setRowEdits({})
    loadSuppliers()
    void detectColumns(f)
  }

  function handleClearMapping() {
    setOverrideMap({})
  }

  function handleAutoMapping() {
    if (headers) setOverrideMap(buildOverride(headers))
  }

  function handlePreview() {
    if (!file) return
    setIsUploading(true)
    setError(null)
    void (async () => {
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('importType', importType)
        if (Object.keys(overrideMap).length > 0) {
          fd.append('columnOverride', JSON.stringify(overrideMap))
        }
        if (supplierId) fd.append('supplierId', supplierId)

        const res = await fetch('/api/inventory/imports', { method: 'POST', body: fd })
        const json = await res.json().catch(() => ({ error: { message: 'Upload failed — server returned an invalid response' } }))
        if (res.ok) {
          setPreview(json.data)
          setStep(2)
        } else {
          setError(json.error?.message || 'Upload failed')
        }
      } catch {
        setError('Network error during upload')
      } finally {
        setIsUploading(false)
      }
    })()
  }

  function effectiveRows() {
    if (!preview) return []
    return preview.rows
      .filter(r => !skippedRows.has(r.rowIndex) && !r.skipped)
      .map(r => {
        const edit = rowEdits[r.rowIndex]
        if (!edit) return r
        const parsedQuantity = edit.quantity !== undefined && edit.quantity !== ''
          ? Number(edit.quantity)
          : r.parsedQuantity
        const unitCost = edit.unitCost !== undefined && edit.unitCost !== ''
          ? Number(edit.unitCost)
          : r.unitCost
        const productName = edit.productName !== undefined && edit.productName !== ''
          ? edit.productName
          : r.productName
        const cleared = new Set<string>()
        if (edit.quantity !== '' && Number.isFinite(parsedQuantity) && (parsedQuantity ?? 0) > 0) cleared.add('quantity')
        if (edit.unitCost !== '' && Number.isFinite(unitCost) && (unitCost ?? 0) >= 0) cleared.add('unitCost')
        if (productName) cleared.add('productName')
        const errors = r.errors.filter(e => !cleared.has(errorField(e) ?? ''))
        return { ...r, parsedQuantity, unitCost, productName, errors }
      })
  }

  function setRowEdit(rowIndex: number, field: 'quantity' | 'unitCost', value: string) {
    setRowEdits(prev => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [field]: value } }))
  }

  function applyBulkFill() {
    if (!preview) return
    const qty = bulkQuantity.trim() !== '' ? Number(bulkQuantity) : NaN
    const cost = bulkUnitCost.trim() !== '' ? Number(bulkUnitCost) : NaN
    if (Number.isNaN(qty) && Number.isNaN(cost)) {
      setError('Enter a Quantity or Unit Cost to bulk-fill.')
      return
    }
    setRowEdits(prev => {
      const next = { ...prev }
      for (const row of preview.rows) {
        if (!Number.isNaN(qty)) {
          next[row.rowIndex] = { ...next[row.rowIndex], quantity: String(qty) }
        }
        if (!Number.isNaN(cost)) {
          next[row.rowIndex] = { ...next[row.rowIndex], unitCost: String(cost) }
        }
      }
      return next
    })
    setError(null)
  }

  async function handleApply() {
    if (!preview?.id) return
    setIsApplying(true)
    setError(null)
    try {
      const rows = effectiveRows()
      const decisions = rows
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

  // Scroll to top when an error appears so the user immediately sees it
  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [error])

  const effRows = effectiveRows()
  const errorRows = effRows.filter(r => (r.errors || []).length > 0).length
  const canApply = preview !== null && errorRows === 0

  // The "Preview" step index. We show mapping at index 1, preview at index 2.
  const mappedCount = headers ? headers.filter(h => h.field).length : 0

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <AdminPage
        title="New Import"
        description="Bulk import products, stock counts, or supplier deliveries"
        actions={<Link href="/admin/operations/imports"><Button variant="secondary" size="sm">Back</Button></Link>}
      >

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {STEP_LABELS.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 14px', borderRadius: 999,
                background: i === step ? '#C8A04E' : i < step ? '#2A3A28' : 'transparent',
                border: `1px solid ${i === step ? '#C8A04E' : '#3A3428'}`,
                cursor: i < step ? 'pointer' : 'default',
              }}
              onClick={() => { if (i < step) setStep(i) }}
            >
              <span
                style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 700,
                  background: i === step ? '#1A1610' : i < step ? '#4CAF50' : '#3A3428',
                  color: i === step ? '#C8A04E' : i < step ? '#0D0D0D' : '#6B6358',
                }}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span style={{ fontSize: 13, fontWeight: i === step ? 700 : 500, color: i === step ? '#1A1610' : i < step ? '#A0D9AF' : '#6B6358' }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && <span style={{ color: '#3A3428', fontSize: 12 }}>›</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded text-sm" style={{ background: '#3A1A1A', border: '1px solid #5A2020', color: '#E85454' }}>{error}</div>
      )}

      {/* STEP 0 — Upload */}
      {step === 0 && (
        <div style={{ maxWidth: 560, background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#A09888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Import Type</label>
            <select value={importType} onChange={e => setImportType(e.target.value)} style={{ background: '#2A261E', border: '1px solid #3A3428', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#F0EBE3', width: '100%', outline: 'none' }}>
              <option value="supplier_delivery">Supplier Delivery</option>
              <option value="physical_count">Physical Stock Count</option>
              <option value="adjustment">Manual Adjustment</option>
            </select>
          </div>

          {importType === 'supplier_delivery' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#A09888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier (optional)</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} onFocus={loadSuppliers} style={{ background: '#2A261E', border: '1px solid #3A3428', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#F0EBE3', width: '100%', outline: 'none' }}>
                <option value="">Auto-detect from data</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Dropzone */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#A09888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spreadsheet (.xlsx, .csv)</label>
            <div
              style={{
                border: `2px dashed ${dragOver ? '#C8A04E' : '#3A3428'}`,
                borderRadius: 12, padding: 36, textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'rgba(200,160,78,0.08)' : 'transparent',
                transition: 'all 0.15s',
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#C8A04E' }}>{isDetecting ? 'Analysing columns…' : 'Drop file here or click to select'}</div>
              <div style={{ fontSize: 12, color: '#6B6358', marginTop: 6 }}>.xlsx or .csv — auto-detects columns</div>
              {file && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#F0EBE3', fontWeight: 500 }}>
                  {file.name} <span style={{ color: '#6B6358' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <a href="/api/inventory/imports/template?type=supplier_delivery" download style={{ textDecoration: 'none' }}>
              <Button variant="ghost" size="sm">⬇ Download product template</Button>
            </a>
            <a href="/api/inventory/imports/template?type=physical_count" download style={{ textDecoration: 'none' }}>
              <Button variant="ghost" size="sm">⬇ Stock count template</Button>
            </a>
          </div>
        </div>
      )}

      {/* STEP 1 — Column mapping */}
      {step === 1 && headers && (
        <div style={{ maxWidth: 880, background: '#121212', border: '1px solid #3A3428', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F0EBE3' }}>Map your columns</h3>
              <p style={{ fontSize: 13, color: '#6B6358', marginTop: 4 }}>
                {mappedCount} of {headers.length} columns auto-detected. Adjust below if needed, then preview.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={handleAutoMapping}>Auto-detect</Button>
              <Button variant="secondary" size="sm" onClick={handleClearMapping}>Clear</Button>
            </div>
          </div>

          {/* Mapping rows: file header -> assigned system field */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {headers.map((h, i) => {
              const mapped = fieldForHeader(h, overrideMap)
              const isMapped = mapped !== null
              return (
                <div key={i} style={{ background: '#1E1A14', border: `1px solid ${isMapped ? '#3A4A28' : '#3A3428'}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isMapped ? '#A9D0B0' : '#9A8B6A' }}>
                      {h.header || '(unnamed column)'}
                    </div>
                    <span style={{ fontSize: 11, color: '#6B6358', fontWeight: 500 }}>
                      {h.match !== 'none' ? (h.match === 'exact' ? 'exact' : 'alias') : 'unmapped'}
                    </span>
                  </div>
                  <select
                    value={mapped || ''}
                    onChange={e => {
                      const val = e.target.value
                      setOverrideMap(prev => {
                        const next: Partial<Record<ImportField, string>> = { ...prev }
                        // Revoke any previous field that pointed at this header.
                        for (const k of Object.keys(next) as ImportField[]) {
                          if (next[k] === h.header) delete next[k]
                        }
                        if (val) next[val as ImportField] = h.header
                        return next
                      })
                    }}
                    style={{ background: '#2A261E', border: '1px solid #3A3428', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#F0EBE3', outline: 'none', width: '100%' }}
                  >
                    <option value="">— Not mapped —</option>
                    {FIELD_CHOICES.map(k => (
                      <option key={k} value={k}>{FIELD_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
            <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={handlePreview} disabled={isUploading}>
              {isUploading ? 'Parsing rows…' : 'Preview & Validate'}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2 — Preview */}
      {step === 2 && preview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid grid-cols-2 lg:grid-cols-5" style={{ gap: 12 }}>
            <StatCard label="Total Rows" value={preview.totalRows} color="#F0EBE3" />
            <StatCard label="Matched" value={preview.matchedRows} color="#4CAF50" />
            <StatCard label="Unknown" value={preview.unknownRows} color="#FF9800" />
            <StatCard label="Errors" value={preview.errorRows} color="#E85454" />
            <StatCard label="Total Qty" value={preview.summary.totalQuantity} color="#F0EBE3" />
          </div>

          {(preview.skippedRows ?? 0) > 0 && (
            <div style={{ background: '#2A2610', border: '1px solid #7A6A2A', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#D9BE6A' }}>
              <strong style={{ color: '#E8C870' }}>{preview.skippedRows} blank row{preview.skippedRows === 1 ? '' : 's'} auto-skipped:</strong>{' '}
              {[...new Set(preview.skipReasons ?? [])].join(' ')}
            </div>
          )}

          <div style={{ background: '#242018', border: '1px solid #3A3428', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#A09888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fill all rows</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#6B6358' }}>Qty</label>
              <input
                type="number" min={0} step="any" value={bulkQuantity}
                onChange={e => setBulkQuantity(e.target.value)} placeholder="e.g. 1"
                style={{ width: 80, background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: '#F0EBE3' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#6B6358' }}>Unit Cost</label>
              <input
                type="number" min={0} step="any" value={bulkUnitCost}
                onChange={e => setBulkUnitCost(e.target.value)}
                placeholder="e.g. 150.00"
                style={{ width: 100, background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: '#F0EBE3' }}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={applyBulkFill}>Apply to all rows</Button>
            <span style={{ fontSize: 12, color: '#6B6358' }}>Sets the same value across every row — you can still fine-tune individual cells below.</span>
          </div>

          {preview.rows.length > 0 && (
            <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 420px)', minHeight: 320 }}>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', fontSize: 14 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr style={{ borderBottom: '1px solid #3A3428', background: '#242018' }}>
                      {['#', 'Product', 'Qty', 'Unit Cost', 'Match', 'Status', 'Notes'].map(h => (
                        <th key={h} style={{ textAlign: h === 'Qty' || h === 'Unit Cost' ? 'right' : 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B6358', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {effRows.map(row => {
                      const rowErrors = row.errors || []
                      const rowWarnings = row.warnings || []
                      const rowHasError = rowErrors.length > 0
                      const rowHasWarning = !rowHasError && rowWarnings.length > 0
                      const rowBg = rowHasError ? '#3A1A1A' : rowHasWarning ? '#2A2610' : !row.match?.productId ? '#2A2210' : undefined
                      const edit = rowEdits[row.rowIndex]
                      return (
                        <tr key={row.rowIndex} style={{ borderBottom: '1px solid #3A3428', background: rowBg }}>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#6B6358' }}>{row.rowIndex}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 500, color: '#F0EBE3' }}>{row.productName || '—'}</td>
                          <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={edit?.quantity !== undefined ? edit.quantity : (row.parsedQuantity ?? '')}
                              onChange={e => setRowEdit(row.rowIndex, 'quantity', e.target.value)}
                              placeholder="0"
                              style={{ width: 90, background: '#241F18', border: rowErrors.some(e => errorField(e) === 'quantity') ? '1px solid #E85454' : '1px solid #3A3428', borderRadius: 8, padding: '6px 8px', fontSize: 13, color: '#F0EBE3' }}
                            />
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={edit?.unitCost !== undefined ? edit.unitCost : (row.unitCost != null ? String(row.unitCost) : '')}
                              onChange={e => setRowEdit(row.rowIndex, 'unitCost', e.target.value)}
                              placeholder="0.00"
                              style={{ width: 90, padding: '6px 10px', border: rowErrors.some(e => errorField(e) === 'unitCost') ? '1px solid #E85454' : '1px solid #3A3428', borderRadius: 6, fontSize: 13, color: '#F0EBE3', background: '#241E18', textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Badge variant={sourceVariant(row.match?.matchSource)}>{sourceLabel(row.match?.matchSource)}</Badge>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {rowHasError ? <Badge variant="danger">Error</Badge> : rowHasWarning ? <Badge variant="warning">Warning</Badge> : <Badge variant="default">OK</Badge>}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12 }}>
                            {rowErrors.map(e => typeof e === 'string' ? e : e.message).join(', ')}
                            {rowHasError ? null : rowWarnings.map((w, wi) => (
                              <span key={wi} style={{ color: '#D9B36A' }}>{w}{wi < rowWarnings.length - 1 ? '; ' : ''}</span>
                            ))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sticky bottom action bar — errors + cancel/apply visible regardless of scroll */}
              <div style={{
                position: 'sticky', bottom: 0, zIndex: 2,
                background: '#1A1610', borderTop: '2px solid #3A3428',
                padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', fontWeight: 500 }}>
                    {error}
                  </div>
                )}
                {errorRows > 0 && (
                  <p style={{ fontSize: 12, color: '#E85454', margin: 0 }}>Some rows have errors. Fix Quantity or Unit Cost directly in the table — valid edits clear the error — or adjust column mapping and re-preview.</p>
                )}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                  <Button variant="secondary" size="sm" onClick={() => setStep(1)}>Back to mapping</Button>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button variant="secondary" size="sm" onClick={() => { setPreview(null); setHeaders(null); setStep(0); setFile(null); setRowEdits({}) }}>
                      Cancel
                    </Button>
                    <Button onClick={handleApply} disabled={isApplying || !canApply} variant="primary">
                      {isApplying ? 'Applying…' : 'Apply Import'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inline error banner for unmatched */}
          {preview.rows.length === 0 && errorRows > 0 && (
            <p style={{ fontSize: 12, color: '#E85454' }}>Some rows have errors. Fix Quantity or Unit Cost directly in the table — valid edits clear the error — or adjust column mapping and re-preview.</p>
          )}
        </div>
      )}
      </AdminPage>
    </div>
  )
}

// Utility used by the mapping select: returns the current assigned field for a
// header (preferring the user override over the server auto-detection).
function fieldForHeader(
  header: DetectedHeader,
  override: Partial<Record<ImportField, string>>,
): ImportField | null {
  const forced = overrideForHeader(header.header, override)
  return forced ?? header.field ?? null
}

function overrideForHeader(header: string, override: Partial<Record<ImportField, string>>): ImportField | null {
  for (const [field, srcHeader] of Object.entries(override)) {
    if (srcHeader === header) return field as ImportField
  }
  return null
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 12, textAlign: 'center' }}>
      <p style={{ fontSize: 24, fontWeight: 700, color }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#A09888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    </div>
  )
}