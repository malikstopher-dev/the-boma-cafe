'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  PackagePlus,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import Button from '@/components/admin/design-system/Button'
import type { InventoryProduct } from '@/inventory/engine/types'
import { useRealtimeRefresh } from '@/inventory/lib/use-realtime-refresh'
import SearchableSelect from './SearchableSelect'
import {
  ADD_STOCK_REALTIME_EVENTS,
  linkedUoms,
  uomLabel,
} from '../lib/add-stock'
import {
  linePreview,
  lineTotal,
  loadReceiptReferences,
  newIdempotencyKey,
  newReceiptLine,
  postReceipt,
  quickCreateProduct,
  receiptTotal,
  validateReceiptDraft,
  type PostedReceipt,
  type ReceiptLineDraft,
} from '../lib/receipt'
import styles from './MultiReceiptWorkspace.module.css'

type WorkflowStep = 'lines' | 'review' | 'success'

interface MultiReceiptWorkspaceProps {
  open: boolean
  onClose: () => void
  onPosted: (receipt: PostedReceipt) => void
}

const moneyFormatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
const qtyFormatter = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 4 })

const INVENTORY_TYPES = [
  { value: 'BEVERAGE', label: 'Beverage' },
  { value: 'FOOD', label: 'Food' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'GENERAL', label: 'General' },
  { value: 'GAS', label: 'Gas' },
]

const BLANK_QUICK_CREATE = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  inventoryType: 'BEVERAGE',
  supplierId: '',
  unitCost: '',
  baseUomId: '',
}

export default function MultiReceiptWorkspace({ open, onClose, onPosted }: MultiReceiptWorkspaceProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<WorkflowStep>('lines')

  // Shared header fields
  const [locationId, setLocationId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [deliveryReference, setDeliveryReference] = useState('')
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  // Lines
  const [lines, setLines] = useState<ReceiptLineDraft[]>([newReceiptLine()])

  // References
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [locations, setLocations] = useState<Array<{ id: string; name: string; code?: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [uoms, setUoms] = useState<Array<{ id: string; name: string; symbol: string | null }>>([])

  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey())
  const [loadingReferences, setLoadingReferences] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [headerErrors, setHeaderErrors] = useState<Record<string, string>>({})
  const [lineErrors, setLineErrors] = useState<Record<string, Record<string, string>>>({})
  const [posted, setPosted] = useState<PostedReceipt | null>(null)

  // Quick-create nested view
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [quickCreateForLine, setQuickCreateForLine] = useState<string | null>(null)
  const [quickCreateForm, setQuickCreateForm] = useState(BLANK_QUICK_CREATE)
  const [quickCreating, setQuickCreating] = useState(false)
  const [quickCreateError, setQuickCreateError] = useState('')

  const productsById = useMemo(() => {
    const map: Record<string, InventoryProduct> = {}
    for (const product of products) map[product.id] = product
    return map
  }, [products])

  const selectedLocation = locations.find(location => location.id === locationId) ?? null

  const loadReferences = useCallback(async (silent = false) => {
    if (!silent) setLoadingReferences(true)
    setLoadError('')
    try {
      const refs = await loadReceiptReferences()
      setProducts(refs.products)
      setLocations(refs.locations)
      setCategories(refs.categories)
      setSuppliers(refs.suppliers)
      setUoms(refs.uoms)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load receipt options')
    } finally {
      if (!silent) setLoadingReferences(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    // Reset the draft
    setStep('lines')
    setLocationId('')
    setSupplierId('')
    setDeliveryReference('')
    setReceiptDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setLines([newReceiptLine()])
    setIdempotencyKey(newIdempotencyKey())
    setSubmitError('')
    setHeaderErrors({})
    setLineErrors({})
    setPosted(null)
    setQuickCreateOpen(false)
    setQuickCreateForm(BLANK_QUICK_CREATE)
    setQuickCreateError('')
    void loadReferences()
    requestAnimationFrame(() => dialogRef.current?.focus())
  }, [open, loadReferences])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting && !quickCreating) {
        if (quickCreateOpen) closeQuickCreate()
        else onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submitting, quickCreateOpen, quickCreating])

  useRealtimeRefresh({
    channel: 'gateb-multi-receipt',
    events: [...ADD_STOCK_REALTIME_EVENTS],
    enabled: open,
    onRefresh: () => { void loadReferences(true) },
  })

  if (!open) return null

  // ----- line management ----------------------------------------------------
  function addLine() {
    setLines(current => [...current, newReceiptLine()])
    setStep('lines')
  }

  function removeLine(key: string) {
    setLines(current => current.length <= 1 ? current : current.filter(line => line.key !== key))
    setLineErrors(current => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function updateLine(key: string, patch: Partial<ReceiptLineDraft>) {
    setLines(current => current.map(line => {
      if (line.key !== key) return line
      const next = { ...line, ...patch }
      if (patch.productId !== undefined && patch.productId !== line.productId) {
        // Changing the product resets the row's UOM - unless the caller
        // supplies an explicit UOM (e.g. the quick-create return selects
        // the new product's base UOM directly).
        if (patch.uomId === undefined) {
          const product = productsById[patch.productId]
          next.uomId = linkedUoms(product)[0]?.uom_id ?? ''
        }
      }
      return next
    }))
    setStep('lines')
    if (key in lineErrors) {
      setLineErrors(current => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  // ----- quick create -------------------------------------------------------
  function openQuickCreate(lineKey: string) {
    setQuickCreateOpen(true)
    setQuickCreateForLine(lineKey)
    setQuickCreateForm(BLANK_QUICK_CREATE)
    setQuickCreateError('')
  }

  function closeQuickCreate() {
    setQuickCreateOpen(false)
    setQuickCreateForLine(null)
    setQuickCreateError('')
  }

  async function submitQuickCreate() {
    if (!quickCreateForm.name.trim()) {
      setQuickCreateError('Item name is required')
      return
    }
    if (!quickCreateForm.baseUomId) {
      setQuickCreateError('Select the base unit for this item')
      return
    }
    setQuickCreating(true)
    setQuickCreateError('')
    try {
      const product = await quickCreateProduct({
        name: quickCreateForm.name,
        sku: quickCreateForm.sku,
        barcode: quickCreateForm.barcode,
        categoryId: quickCreateForm.categoryId,
        inventoryType: quickCreateForm.inventoryType,
        supplierId: quickCreateForm.supplierId,
        unitCost: quickCreateForm.unitCost,
        baseUomId: quickCreateForm.baseUomId,
      })
      // Add to the in-memory catalogue, select on the launching row.
      setProducts(current => [product, ...current])
      if (quickCreateForLine) {
        updateLine(quickCreateForLine, {
          productId: product.id,
          uomId: linkedUoms(product)[0]?.uom_id ?? '',
        })
      }
      closeQuickCreate()
    } catch (error) {
      setQuickCreateError(error instanceof Error ? error.message : 'Could not create the item')
    } finally {
      setQuickCreating(false)
    }
  }

  // ----- review + post ------------------------------------------------------
  function reviewReceipt() {
    const { headerErrors: headers, lineErrors: lineErrs } = validateReceiptDraft({
      locationId,
      lines,
      productsById,
      deliveryReference,
      notes,
    })
    setHeaderErrors(headers)
    setLineErrors(lineErrs)
    setSubmitError('')
    if (Object.keys(headers).length === 0 && Object.keys(lineErrs).length === 0) setStep('review')
  }

  async function confirmReceipt() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await postReceipt({
        locationId,
        supplierId: supplierId || null,
        deliveryReference,
        receiptDate,
        notes,
        idempotencyKey,
        lines: lines.map(line => {
          const preview = linePreview(line, productsById[line.productId])
          const qty = Number(line.quantity)
          const cost = line.unitCost.trim() === '' ? null : Number(line.unitCost)
          return {
            productId: line.productId,
            uomId: line.uomId,
            quantity: qty,
            unitCost: cost,
            lineValue: lineTotal(line),
          }
        }),
      })
      setPosted(result)
      setStep('success')
      onPosted(result)
      void loadReferences(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not post the receipt')
    } finally {
      setSubmitting(false)
    }
  }

  function startNewReceipt() {
    setStep('lines')
    setLocationId('')
    setSupplierId('')
    setDeliveryReference('')
    setReceiptDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setLines([newReceiptLine()])
    setIdempotencyKey(newIdempotencyKey())
    setSubmitError('')
    setHeaderErrors({})
    setLineErrors({})
    setPosted(null)
  }

  // ----- render helpers -----------------------------------------------------
  const itemOptions = products.map(product => ({
    value: product.id,
    label: product.sku ? `${product.name} · ${product.sku}` : product.name,
  }))
  const locationOptions = locations.map(location => ({
    value: location.id,
    label: location.code ? `${location.name} · ${location.code}` : location.name,
  }))
  const supplierOptions = [
    { value: '', label: 'No supplier' },
    ...suppliers.map(supplier => ({ value: supplier.id, label: supplier.name })),
  ]
  const total = receiptTotal(lines)
  const totalQuantity = posted?.posted_count

  return (
    <div
      className={styles.overlay}
      onMouseDown={event => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="multi-receipt-title"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Direct stock receipt</p>
            <h2 id="multi-receipt-title" className={styles.title}>Receive stock</h2>
            <p className={styles.subtitle}>
              Enter the shared delivery details once, add every item on the delivery, review the complete receipt, and post it as one atomic document.
            </p>
          </div>
          <button className={styles.close} onClick={onClose} disabled={submitting} aria-label="Close receipt">
            <X size={18} />
          </button>
        </header>

        <div className={styles.body}>
          {step === 'lines' && (
            <>
              <h3 className={styles.sectionTitle}>Delivery details</h3>
              <p className={styles.sectionHint}>These apply to every line on this receipt.</p>

              {loadError && (
                <div className={styles.errorBanner} role="alert">
                  <span><AlertTriangle size={15} /> {loadError}</span>
                  <Button variant="ghost" size="sm" onClick={() => void loadReferences()}>
                    <RefreshCw size={14} /> Retry
                  </Button>
                </div>
              )}

              {loadingReferences ? (
                <p className={styles.sectionHint}>Loading receipt options…</p>
              ) : locations.length === 0 && !loadError ? (
                <div className={styles.emptyState}>
                  No active receiving locations are configured. Manage locations in Operations first.
                </div>
              ) : (
                <div className={styles.grid3}>
                  <div className={styles.field}>
                    <label htmlFor="receipt-location">Receiving location <span className={styles.required}>*</span></label>
                    <select
                      id="receipt-location"
                      className={`${styles.select} ${headerErrors.locationId ? styles.inputError : ''}`}
                      value={locationId}
                      onChange={event => {
                        setLocationId(event.target.value)
                        setHeaderErrors(current => ({ ...current, locationId: '' }))
                      }}
                    >
                      <option value="">Select location…</option>
                      {locationOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {headerErrors.locationId && <span className={styles.errorText}>{headerErrors.locationId}</span>}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="receipt-supplier">Supplier</label>
                    <select
                      id="receipt-supplier"
                      className={styles.select}
                      value={supplierId}
                      onChange={event => setSupplierId(event.target.value)}
                    >
                      {supplierOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="receipt-date">Receipt date</label>
                    <input
                      id="receipt-date"
                      className={styles.input}
                      type="date"
                      value={receiptDate}
                      onChange={event => setReceiptDate(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="receipt-reference">Reference / invoice (optional)</label>
                    <input
                      id="receipt-reference"
                      className={`${styles.input} ${headerErrors.deliveryReference ? styles.inputError : ''}`}
                      value={deliveryReference}
                      maxLength={120}
                      onChange={event => setDeliveryReference(event.target.value)}
                      placeholder="e.g. INV-2043"
                    />
                    {headerErrors.deliveryReference && <span className={styles.errorText}>{headerErrors.deliveryReference}</span>}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="receipt-notes">Notes (optional)</label>
                    <input
                      id="receipt-notes"
                      className={`${styles.input} ${headerErrors.notes ? styles.inputError : ''}`}
                      value={notes}
                      maxLength={500}
                      onChange={event => setNotes(event.target.value)}
                      placeholder="Shared receiving note"
                    />
                    {headerErrors.notes && <span className={styles.errorText}>{headerErrors.notes}</span>}
                  </div>
                </div>
              )}

              <h3 className={styles.sectionTitle}>Items on this delivery</h3>
              <p className={styles.sectionHint}>
                Search for each item, choose its unit, and enter the delivered quantity and cost. Cannot find an item? Use + Create new item.
              </p>

              {quickCreateOpen && (
                <div className={styles.quickCreate}>
                  <div className={styles.quickCreateHeader}>
                    <div>
                      <h4>Create new inventory item</h4>
                      <p>The unfinished receipt is preserved; the new item will be selected on return.</p>
                    </div>
                    <button className={styles.close} onClick={closeQuickCreate} disabled={quickCreating} aria-label="Cancel create item">
                      <X size={16} />
                    </button>
                  </div>
                  <div className={styles.grid3}>
                    <div className={styles.field}>
                      <label htmlFor="qc-name">Item name <span className={styles.required}>*</span></label>
                      <input
                        id="qc-name"
                        className={styles.input}
                        value={quickCreateForm.name}
                        maxLength={200}
                        onChange={event => setQuickCreateForm(current => ({ ...current, name: event.target.value }))}
                        placeholder="e.g. Triple Sec 750ml"
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="qc-sku">SKU / item code</label>
                      <input
                        id="qc-sku"
                        className={styles.input}
                        value={quickCreateForm.sku}
                        maxLength={64}
                        onChange={event => setQuickCreateForm(current => ({ ...current, sku: event.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="qc-barcode">Barcode</label>
                      <input
                        id="qc-barcode"
                        className={styles.input}
                        value={quickCreateForm.barcode}
                        maxLength={64}
                        onChange={event => setQuickCreateForm(current => ({ ...current, barcode: event.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="qc-category">Category</label>
                      <select
                        id="qc-category"
                        className={styles.select}
                        value={quickCreateForm.categoryId}
                        onChange={event => setQuickCreateForm(current => ({ ...current, categoryId: event.target.value }))}
                      >
                        <option value="">No category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="qc-type">Inventory type</label>
                      <select
                        id="qc-type"
                        className={styles.select}
                        value={quickCreateForm.inventoryType}
                        onChange={event => setQuickCreateForm(current => ({ ...current, inventoryType: event.target.value }))}
                      >
                        {INVENTORY_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="qc-uom">Base unit <span className={styles.required}>*</span></label>
                      <select
                        id="qc-uom"
                        className={styles.select}
                        value={quickCreateForm.baseUomId}
                        onChange={event => setQuickCreateForm(current => ({ ...current, baseUomId: event.target.value }))}
                      >
                        <option value="">Select unit…</option>
                        {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.symbol ? `${uom.name} (${uom.symbol})` : uom.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="qc-supplier">Preferred supplier</label>
                      <select
                        id="qc-supplier"
                        className={styles.select}
                        value={quickCreateForm.supplierId}
                        onChange={event => setQuickCreateForm(current => ({ ...current, supplierId: event.target.value }))}
                      >
                        <option value="">No supplier</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="qc-cost">Unit cost (optional)</label>
                      <input
                        id="qc-cost"
                        className={styles.input}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.01"
                        value={quickCreateForm.unitCost}
                        onChange={event => setQuickCreateForm(current => ({ ...current, unitCost: event.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {quickCreateError && <div className={styles.errorBanner} role="alert">{quickCreateError}</div>}
                  <div className={styles.actions}>
                    <Button variant="secondary" size="sm" onClick={closeQuickCreate} disabled={quickCreating}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => void submitQuickCreate()} loading={quickCreating}>
                      <Check size={14} /> Create item
                    </Button>
                  </div>
                </div>
              )}

              <table className={styles.linesTable}>
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>Item</th>
                    <th style={{ width: '18%' }}>UOM</th>
                    <th style={{ width: '12%' }}>Qty</th>
                    <th style={{ width: '14%' }}>Unit cost</th>
                    <th style={{ width: '12%' }}>Line total</th>
                    <th style={{ width: '6%' }}><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => {
                    const errors = lineErrors[line.key] ?? {}
                    const product = productsById[line.productId] ?? null
                    const rowUoms = linkedUoms(product)
                    const value = lineTotal(line)
                    return (
                      <tr key={line.key}>
                        <td data-label="Item">
                          <SearchableSelect
                            options={itemOptions}
                            value={line.productId}
                            onChange={value => {
                              if (value === '__create__') {
                                openQuickCreate(line.key)
                                return
                              }
                              updateLine(line.key, { productId: value })
                            }}
                            placeholder="Search by name or SKU"
                            allowCreate
                            createLabel="+ Create new item"
                            error={errors.productId}
                          />
                        </td>
                        <td data-label="UOM">
                          <select
                            className={`${styles.cellInput} ${errors.uomId ? styles.cellInputError : ''}`}
                            value={line.uomId}
                            onChange={event => updateLine(line.key, { uomId: event.target.value })}
                            disabled={!line.productId || rowUoms.length === 0}
                            aria-label={`Unit for line ${lines.indexOf(line) + 1}`}
                          >
                            <option value="">{rowUoms.length === 0 ? '—' : 'Select…'}</option>
                            {rowUoms.map(link => (
                              <option key={link.uom_id} value={link.uom_id}>{uomLabel(link)}</option>
                            ))}
                          </select>
                          {errors.uomId && <span className={styles.errorText}>{errors.uomId}</span>}
                        </td>
                        <td data-label="Qty">
                          <input
                            className={`${styles.cellInput} ${errors.quantity ? styles.cellInputError : ''}`}
                            inputMode="decimal"
                            type="number"
                            min="0"
                            step="any"
                            value={line.quantity}
                            onChange={event => updateLine(line.key, { quantity: event.target.value })}
                            aria-label={`Quantity for line ${lines.indexOf(line) + 1}`}
                          />
                          {errors.quantity && <span className={styles.errorText}>{errors.quantity}</span>}
                        </td>
                        <td data-label="Unit cost">
                          <input
                            className={`${styles.cellInput} ${errors.unitCost ? styles.cellInputError : ''}`}
                            inputMode="decimal"
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            onChange={event => updateLine(line.key, { unitCost: event.target.value })}
                            aria-label={`Unit cost for line ${lines.indexOf(line) + 1}`}
                          />
                          {errors.unitCost && <span className={styles.errorText}>{errors.unitCost}</span>}
                        </td>
                        <td data-label="Line total" className={styles.lineTotal}>
                          {value === null ? '—' : moneyFormatter.format(value)}
                        </td>
                        <td>
                          <button
                            className={styles.removeBtn}
                            onClick={() => removeLine(line.key)}
                            disabled={lines.length <= 1 || submitting}
                            aria-label={`Remove line ${lines.indexOf(line) + 1}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <button className={styles.addRow} onClick={addLine} disabled={submitting}>
                <Plus size={14} style={{ verticalAlign: '-2px' }} /> Add another item
              </button>

              {headerErrors.lines && <span className={styles.errorText}>{headerErrors.lines}</span>}

              {total !== null && (
                <div className={styles.summary}>
                  <span className={styles.summaryLabel}>Receipt total ({lines.filter(line => lineTotal(line) !== null).length} priced lines)</span>
                  <span className={styles.summaryValue}>{moneyFormatter.format(total)}</span>
                </div>
              )}

              <div className={styles.actions}>
                <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                <Button onClick={reviewReceipt} disabled={loadingReferences || locations.length === 0}>
                  Review receipt <ArrowRight size={15} />
                </Button>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <h3 className={styles.sectionTitle}>Review before posting</h3>
              <p className={styles.sectionHint}>
                One confirmation posts the entire receipt atomically — either every line lands in the ledger or nothing does.
              </p>
              {submitError && <div className={styles.errorBanner} role="alert">{submitError}</div>}

              <div className={styles.reviewMeta} style={{ marginBottom: 14 }}>
                <div className={styles.grid3} style={{ marginBottom: 0 }}>
                  <div><strong>Location:</strong> {selectedLocation?.name}</div>
                  <div><strong>Supplier:</strong> {suppliers.find(s => s.id === supplierId)?.name ?? 'No supplier'}</div>
                  <div><strong>Date:</strong> {receiptDate}</div>
                </div>
                {deliveryReference.trim() && <p style={{ margin: '8px 0 0', fontSize: 13 }}><strong>Reference:</strong> {deliveryReference}</p>}
                {notes.trim() && <p style={{ margin: '4px 0 0', fontSize: 13 }}><strong>Notes:</strong> {notes}</p>}
              </div>

              <table className={styles.reviewTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Receiving</th>
                    <th>Base units</th>
                    <th>Unit cost</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const product = productsById[line.productId]
                    const preview = linePreview(line, product)
                    const link = linkedUoms(product).find(u => u.uom_id === line.uomId) ?? null
                    const value = lineTotal(line)
                    return (
                      <tr key={line.key}>
                        <td data-label="Item">{product?.name ?? '—'}</td>
                        <td data-label="Receiving">{qtyFormatter.format(Number(line.quantity))} {link ? uomLabel(link) : ''}</td>
                        <td data-label="Base units">{preview ? `+${qtyFormatter.format(preview.baseQuantity)}` : '—'}</td>
                        <td data-label="Unit cost">{line.unitCost.trim() === '' ? '—' : moneyFormatter.format(Number(line.unitCost))}</td>
                        <td data-label="Line total">{value === null ? '—' : moneyFormatter.format(value)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {total !== null && (
                <div className={styles.summary}>
                  <span className={styles.summaryLabel}>Receipt total</span>
                  <span className={styles.summaryValue}>{moneyFormatter.format(total)}</span>
                </div>
              )}

              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => setStep('lines')} disabled={submitting}>
                  <ArrowLeft size={15} /> Back
                </Button>
                <Button onClick={() => void confirmReceipt()} loading={submitting}>
                  <PackagePlus size={16} /> Post receipt ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
                </Button>
              </div>
            </>
          )}

          {step === 'success' && posted && (
            <div className={styles.success}>
              <div className={styles.successIcon}><CheckCircle2 size={30} /></div>
              <h3>Receipt posted</h3>
              <p>
                {totalQuantity} {totalQuantity === 1 ? 'movement' : 'movements'} recorded at {selectedLocation?.name}.
                {total !== null ? ` Total received: ${moneyFormatter.format(total)}.` : ''}
              </p>
              <span className={styles.transactionId}>Receipt {String(posted.receipt_id).slice(0, 8).toUpperCase()}</span>
              <div className={styles.actions}>
                <Button variant="secondary" onClick={startNewReceipt}>Receive another delivery</Button>
                <Button onClick={onClose}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
