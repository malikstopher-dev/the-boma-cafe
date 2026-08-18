'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import styles from '@/components/admin/design-system/DesignSystem.module.css'
import type { ParsedProductRow } from '@/inventory/import/product-parser'
import type { ProductImportRecord } from '@/inventory/engine/types'

type PreviewRow = ParsedProductRow & {
  existing?: { id: string; name: string; sku: string | null; barcode: string | null } | null
}

type Action = 'create' | 'update' | 'skip'

interface ApplyResult {
  importId: string
  created: number
  updated: number
  skipped: number
  createdIds: string[]
  updatedIds: string[]
  createdSuppliers: string[]
  createdCategories: string[]
}

const TYPE_OPTIONS = ['FOOD', 'BEVERAGE', 'CLEANING', 'PACKAGING', 'GENERAL']

function ConfidenceDot({ level }: { level: 'high' | 'medium' | 'low' }) {
  const color = level === 'high' ? '#4CAF50' : level === 'medium' ? '#F5C444' : '#E85454'
  return (
    <span
      title={`${level} confidence`}
      style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6, flexShrink: 0 }}
    />
  )
}

export default function ProductImportDialog({
  open,
  onClose,
  forcedType,
  onImported,
}: {
  open: boolean
  onClose: () => void
  forcedType?: string
  onImported?: (createdIds: string[]) => void
}) {
  const [step, setStep] = useState<'pick' | 'review' | 'done'>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [inventoryType, setInventoryType] = useState(forcedType ?? 'GENERAL')
  const [sheets, setSheets] = useState<{ name: string; sheetIndex: number; rowCount: number }[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [sheetName, setSheetName] = useState('')
  const [rows, setRows] = useState<PreviewRow[] | null>(null)
  const [decisions, setDecisions] = useState<Record<number, Action>>({})
  const [busy, setBusy] = useState(false)
  const [applying, setApplying] = useState(false)
  const [undoing, setUndoing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApplyResult | null>(null)
  const [lastImport, setLastImport] = useState<ProductImportRecord | null>(null)
  const [undoNote, setUndoNote] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadLastImport = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/product-import/last')
      const json = await res.json()
      if (json.data) setLastImport(json.data)
      else setLastImport(null)
    } catch {
      setLastImport(null)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setStep('pick')
      setFile(null)
      setRows(null)
      setSheets([])
      setSheetIndex(0)
      setSheetName('')
      setError(null)
      setResult(null)
      setUndoNote(null)
      setDecisions({})
      setInventoryType(forcedType ?? 'GENERAL')
      loadLastImport()
    }
  }, [open, forcedType, loadLastImport])

  if (!open) return null

  async function handleParse() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('sheet_index', String(sheetIndex))
      const res = await fetch('/api/inventory/product-import/preview', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message || 'Failed to parse the file')
        return
      }
      const parsedRows = (json.data.rows ?? []) as PreviewRow[]
      setSheets(json.data.sheets ?? [])
      setSheetName(json.data.sheetName ?? '')
      setRows(parsedRows)
      const initial: Record<number, Action> = {}
      for (const row of parsedRows) {
        // Existing product match -> Update (operator can override); new rows
        // -> Create. Rows flagged Needs Details stay Create but highlighted.
        initial[row.rowNumber] = row.existing ? 'update' : 'create'
      }
      setDecisions(initial)
      setStep('review')
    } catch {
      setError('Failed to parse the file')
    } finally {
      setBusy(false)
    }
  }

  async function handleSheetChange(next: number) {
    if (!file || next === sheetIndex) return
    setSheetIndex(next)
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('sheet_index', String(next))
      const res = await fetch('/api/inventory/product-import/preview', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message || 'Failed to parse the sheet')
        return
      }
      const parsedRows = (json.data.rows ?? []) as PreviewRow[]
      setSheetName(json.data.sheetName ?? '')
      setRows(parsedRows)
      const initial: Record<number, Action> = {}
      for (const row of parsedRows) initial[row.rowNumber] = row.existing ? 'update' : 'create'
      setDecisions(initial)
    } catch {
      setError('Failed to parse the sheet')
    } finally {
      setBusy(false)
    }
  }

  function setAll(action: Action) {
    if (!rows) return
    const next: Record<number, Action> = {}
    for (const row of rows) next[row.rowNumber] = action
    setDecisions(next)
  }

  async function handleApply() {
    if (!rows) return
    setApplying(true)
    setError(null)
    try {
      const payload = rows
        .filter(r => (decisions[r.rowNumber] ?? 'skip') !== 'skip')
        .map(r => ({
          rowNumber: r.rowNumber,
          action: decisions[r.rowNumber] ?? 'skip',
          name: r.name.value,
          sku: r.sku.value,
          barcode: r.barcode.value,
          unitCost: r.unitCost.value,
          unitText: r.unitText.value,
          supplierName: r.supplierName.value,
          categoryName: r.categoryName.value,
        }))
      const res = await fetch('/api/inventory/product-import/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: payload,
          inventoryType,
          filename: file?.name ?? 'import',
          sheetName,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message || 'Failed to apply the import')
        return
      }
      setResult(json.data)
      setStep('done')
      loadLastImport()
    } catch {
      setError('Failed to apply the import')
    } finally {
      setApplying(false)
    }
  }

  async function handleUndo() {
    if (!lastImport) return
    setUndoing(true)
    setError(null)
    try {
      const res = await fetch('/api/inventory/product-import/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId: lastImport.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message || 'Failed to undo the import')
        return
      }
      const r = json.data as { removed: number; archived: number; restored: number }
      setUndoNote(`Undone — ${r.removed} removed, ${r.archived} archived (had history), ${r.restored} restored to previous values.`)
      setLastImport(null)
    } catch {
      setError('Failed to undo the import')
    } finally {
      setUndoing(false)
    }
  }

  const createdCount = rows ? Object.values(decisions).filter(a => a === 'create').length : 0
  const updateCount = rows ? Object.values(decisions).filter(a => a === 'update').length : 0
  const skipCount = rows ? Object.values(decisions).filter(a => a === 'skip').length : 0

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={styles.card} style={{ maxWidth: 1060, width: '100%', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: '#F0EBE3' }}>Import Products</h3>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>

        {error && (
          <div className={styles.card} style={{ background: '#2A1515', border: '1px solid #E85454', marginBottom: 12, padding: 10, fontSize: 13, color: '#F0C9C9' }}>
            {error}
          </div>
        )}

        {step === 'pick' && (
          <>
            <div className={styles.card} style={{ marginBottom: 12, padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'end' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#8A8694', marginBottom: 6 }}>Spreadsheet (.xlsx or .csv)</div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                    className={styles.input}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#8A8694', marginBottom: 6 }}>Import as</div>
                  <select
                    className={styles.input + ' ' + styles.select}
                    value={inventoryType}
                    onChange={e => setInventoryType(e.target.value)}
                    disabled={!!forcedType}
                  >
                    {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Button onClick={handleParse} disabled={busy || !file}>
                    {busy ? 'Parsing…' : 'Parse & Preview'}
                  </Button>
                </div>
              </div>
              {file && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#A09888' }}>
                  {file.name} — {file.size > 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${file.size} B`}
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: '#8A8694', lineHeight: 1.6 }}>
              <div>• Recognised layouts: a header row with known columns (product / supplier / code / price / unit…), category headings (e.g. <b>WHISKEY</b> above item rows), or a plain name list.</div>
              <div>• Low-confidence cells are left blank for you to fill in later — nothing is invented.</div>
              <div>• Existing products are matched by SKU, barcode, or name and offered as <b>Update</b>; new rows default to <b>Create</b>.</div>
            </div>

            {lastImport && !undoNote && (
              <div className={styles.card} style={{ marginTop: 12, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#A09888' }}>
                  Last import: <b style={{ color: '#F0EBE3' }}>{lastImport.filename}</b>{' '}
                  ({new Date(lastImport.created_at).toLocaleString()} — {lastImport.created_ids.length} created, {lastImport.updated_ids.length} updated)
                </span>
                <Button variant="danger" size="sm" onClick={handleUndo} disabled={undoing}>
                  {undoing ? 'Undoing…' : 'Undo Last Import'}
                </Button>
              </div>
            )}
            {undoNote && (
              <div className={styles.card} style={{ marginTop: 12, padding: 10, background: '#1E2A15', border: '1px solid #4CAF50', fontSize: 13, color: '#C9F0C9' }}>
                {undoNote}
              </div>
            )}
          </>
        )}

        {step === 'review' && rows && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              {sheets.length > 1 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8A8694' }}>
                  Sheet:
                  <select
                    className={styles.input + ' ' + styles.select}
                    style={{ width: 'auto' }}
                    value={sheetIndex}
                    onChange={e => handleSheetChange(Number(e.target.value))}
                    disabled={busy}
                  >
                    {sheets.map(s => (
                      <option key={s.sheetIndex} value={s.sheetIndex}>{s.name} ({s.rowCount} rows)</option>
                    ))}
                  </select>
                </label>
              )}
              <Badge variant="info">{rows.length} rows</Badge>
              <Badge variant="success">{createdCount} create</Badge>
              <Badge variant="warning">{updateCount} update</Badge>
              <Badge variant="info">{skipCount} skip</Badge>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#8A8694' }}>Set all:</span>
              <Button size="sm" onClick={() => setAll('create')}>Create</Button>
              <Button size="sm" onClick={() => setAll('update')}>Update</Button>
              <Button size="sm" variant="secondary" onClick={() => setAll('skip')}>Skip</Button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #2E2A22', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#1E1A14', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A8694', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A8694', fontWeight: 600 }}>Action</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A8694', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A8694', fontWeight: 600 }}>SKU</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A8694', fontWeight: 600 }}>Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A8694', fontWeight: 600 }}>Unit</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A8694', fontWeight: 600 }}>Supplier</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A8694', fontWeight: 600 }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const action = decisions[r.rowNumber] ?? 'skip'
                    return (
                      <tr key={r.rowNumber} style={{ borderTop: '1px solid #211D16', background: r.needsDetails ? '#2A2418' : undefined }}>
                        <td style={{ padding: '6px 10px', color: '#5A5666', fontFamily: "'JetBrains Mono', monospace" }}>{r.rowNumber}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <select
                            className={styles.input + ' ' + styles.select}
                            style={{ width: 110, padding: '4px 6px', fontSize: 12 }}
                            value={action}
                            onChange={e => setDecisions(d => ({ ...d, [r.rowNumber]: e.target.value as Action }))}
                          >
                            <option value="create">Create</option>
                            <option value="update">Update</option>
                            <option value="skip">Skip</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <ConfidenceDot level={r.name.confidence} />
                            <span style={{ color: r.needsDetails ? '#F5C444' : '#F0EBE3' }}>{r.name.value ?? '—'}</span>
                          </div>
                          {r.needsDetails && (
                            <div style={{ fontSize: 11, color: '#F5C444', marginTop: 2 }}>Needs details</div>
                          )}
                          {r.existing && (
                            <div style={{ fontSize: 11, color: '#8A8694', marginTop: 2 }}>
                              matches existing: {r.existing.name}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '6px 10px', fontFamily: "'JetBrains Mono', monospace", color: '#A09888' }}>
                          <ConfidenceDot level={r.sku.confidence} />{r.sku.value ?? '—'}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#A09888' }}>
                          <ConfidenceDot level={r.unitCost.confidence} />{r.unitCost.value ?? '—'}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#A09888' }}>
                          <ConfidenceDot level={r.unitText.confidence} />{r.unitText.value ?? '—'}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#A09888' }}>
                          <ConfidenceDot level={r.supplierName.confidence} />{r.supplierName.value ?? '—'}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#A09888' }}>
                          <ConfidenceDot level={r.categoryName.confidence} />{r.categoryName.value ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => { setStep('pick'); setRows(null) }}>Back</Button>
              <Button onClick={handleApply} disabled={applying || createdCount + updateCount === 0}>
                {applying ? 'Importing…' : `Import ${createdCount + updateCount} row${createdCount + updateCount === 1 ? '' : 's'}`}
              </Button>
            </div>
          </>
        )}

        {step === 'done' && result && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                onClick={() => { onImported?.(result.createdIds); onClose() }}
                style={{
                  padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                  background: '#1E2A15', color: '#C9F0C9', border: '1px solid #4CAF50',
                }}
              >
                {result.created} created
              </button>
              <button
                onClick={() => { onImported?.(result.updatedIds); onClose() }}
                style={{
                  padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                  background: '#2A2418', color: '#F5C444', border: '1px solid #F5C444',
                }}
              >
                {result.updated} updated
              </button>
              <Badge variant="info">{result.skipped} skipped</Badge>
              {result.createdSuppliers.length > 0 && (
                <Badge variant="success">{result.createdSuppliers.length} new supplier{result.createdSuppliers.length === 1 ? '' : 's'}: {result.createdSuppliers.join(', ')}</Badge>
              )}
              {result.createdCategories.length > 0 && (
                <Badge variant="info">{result.createdCategories.length} new categor{result.createdCategories.length === 1 ? 'y' : 'ies'}: {result.createdCategories.join(', ')}</Badge>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#A09888', marginBottom: 12 }}>
              Click a count to filter the product list to those rows. Imported products are normal, editable products — you can change anything afterwards.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="danger" onClick={handleUndo} disabled={undoing}>
                {undoing ? 'Undoing…' : 'Undo This Import'}
              </Button>
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}