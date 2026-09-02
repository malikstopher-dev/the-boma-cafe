'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  PackagePlus,
  RefreshCw,
  X,
} from 'lucide-react'
import Button from '@/components/admin/design-system/Button'
import type { InventoryProduct, InventoryTransaction } from '@/inventory/engine/types'
import { useRealtimeRefresh } from '@/inventory/lib/use-realtime-refresh'
import SearchableSelect from './SearchableSelect'
import {
  ADD_STOCK_REALTIME_EVENTS,
  calculateAddStockPreview,
  linkedUoms,
  loadAddStockProduct,
  loadAddStockReferences,
  parseOptionalCost,
  submitAddStock,
  uomLabel,
  validateAddStockRequest,
  type AddStockPreview,
} from '../lib/add-stock'
import styles from './AddStockWorkspace.module.css'

type WorkflowStep = 'details' | 'review' | 'success'

interface AddStockWorkspaceProps {
  open: boolean
  onClose: () => void
  onReceived: (transaction: InventoryTransaction) => void
}

const quantityFormatter = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 4 })
const moneyFormatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })

function formatQuantity(value: number): string {
  return quantityFormatter.format(value)
}

function stepClass(current: WorkflowStep, step: WorkflowStep): string {
  const order: WorkflowStep[] = ['details', 'review', 'success']
  const currentIndex = order.indexOf(current)
  const stepIndex = order.indexOf(step)
  if (stepIndex < currentIndex) return `${styles.step} ${styles.stepDone}`
  if (stepIndex === currentIndex) return `${styles.step} ${styles.stepActive}`
  return styles.step
}

export default function AddStockWorkspace({ open, onClose, onReceived }: AddStockWorkspaceProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<WorkflowStep>('details')
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [locations, setLocations] = useState<Awaited<ReturnType<typeof loadAddStockReferences>>['locations']>([])
  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [uomId, setUomId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [notes, setNotes] = useState('')
  const [productDetail, setProductDetail] = useState<InventoryProduct | null>(null)
  const [loadingReferences, setLoadingReferences] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [productError, setProductError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [completedTransaction, setCompletedTransaction] = useState<InventoryTransaction | null>(null)

  const selectedProduct = productDetail ?? products.find(product => product.id === productId) ?? null
  const selectedLocation = locations.find(location => location.id === locationId) ?? null
  const uoms = linkedUoms(selectedProduct)
  const selectedUom = uoms.find(link => link.uom_id === uomId) ?? null
  const currentBaseBalance = Number(productDetail?.current_balance ?? 0)
  const currentSourceBalance = selectedUom
    ? currentBaseBalance / Number(selectedUom.conversion_factor)
    : currentBaseBalance
  const parsedQuantity = Number(quantity)
  const parsedCost = parseOptionalCost(unitCost)
  let preview: AddStockPreview | null = null
  if (selectedUom && Number.isFinite(parsedQuantity) && parsedQuantity > 0 && !Number.isNaN(parsedCost)) {
    try {
      preview = calculateAddStockPreview(
        currentBaseBalance,
        parsedQuantity,
        Number(selectedUom.conversion_factor),
        parsedCost,
      )
    } catch {
      preview = null
    }
  }

  function resetForm() {
    setStep('details')
    setProductId('')
    setLocationId('')
    setUomId('')
    setQuantity('')
    setUnitCost('')
    setNotes('')
    setProductDetail(null)
    setProductError('')
    setSubmitError('')
    setFieldErrors({})
    setCompletedTransaction(null)
  }

  async function loadReferences() {
    setLoadingReferences(true)
    setLoadError('')
    try {
      const references = await loadAddStockReferences()
      setProducts(references.products)
      setLocations(references.locations)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load receipt options')
    } finally {
      setLoadingReferences(false)
    }
  }

  async function refreshProduct(silent = false) {
    if (!productId || !locationId) return
    if (!silent) setLoadingProduct(true)
    setProductError('')
    try {
      const product = await loadAddStockProduct(productId, locationId)
      setProductDetail(product)
      if (!product.is_active || product.deleted_at) setProductError('This item is no longer active')
      const availableUoms = linkedUoms(product)
      if (!uomId && availableUoms[0]) setUomId(availableUoms[0].uom_id)
    } catch (error) {
      setProductError(error instanceof Error ? error.message : 'Could not refresh the item balance')
    } finally {
      if (!silent) setLoadingProduct(false)
    }
  }

  useEffect(() => {
    if (!open) return
    resetForm()
    void loadReferences()
    requestAnimationFrame(() => dialogRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open || !productId || !locationId) return
    let cancelled = false
    setLoadingProduct(true)
    setProductError('')
    void loadAddStockProduct(productId, locationId)
      .then(product => {
        if (cancelled) return
        setProductDetail(product)
        if (!product.is_active || product.deleted_at) setProductError('This item is no longer active')
        const availableUoms = linkedUoms(product)
        setUomId(current => current || availableUoms[0]?.uom_id || '')
      })
      .catch(error => {
        if (!cancelled) setProductError(error instanceof Error ? error.message : 'Could not load the item balance')
      })
      .finally(() => {
        if (!cancelled) setLoadingProduct(false)
      })
    return () => { cancelled = true }
  }, [open, productId, locationId])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, submitting])

  useRealtimeRefresh({
    channel: 'inv4b-add-stock',
    events: [...ADD_STOCK_REALTIME_EVENTS],
    enabled: open && Boolean(productId && locationId),
    onRefresh: () => { void refreshProduct(true) },
  })

  if (!open) return null

  function changeProduct(nextProductId: string) {
    setProductId(nextProductId)
    setProductDetail(null)
    setProductError('')
    setStep('details')
    setFieldErrors(current => ({ ...current, productId: '' }))
    const product = products.find(item => item.id === nextProductId)
    const preferredUom = linkedUoms(product)[0]
    setUomId(preferredUom?.uom_id ?? '')
  }

  function reviewReceipt() {
    const errors = validateAddStockRequest({
      productId,
      locationId,
      uomId,
      quantity: parsedQuantity,
      unitCost: parsedCost,
      notes,
    })
    if (productId && locationId && !productDetail && !productError) {
      errors.productId = 'Wait for the item balance to load'
    }
    if (productError) errors.productId = productError
    if (!selectedUom) errors.uomId = 'Select a valid UOM linked to this item'
    setFieldErrors(errors)
    setSubmitError('')
    if (Object.keys(errors).length === 0) setStep('review')
  }

  async function confirmReceipt() {
    if (!preview) {
      setSubmitError('Receipt values are incomplete. Go back and review the quantity and UOM.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const transaction = await submitAddStock({
        productId,
        locationId,
        uomId,
        quantity: parsedQuantity,
        unitCost: parsedCost,
        notes: notes.trim() || null,
      })
      setCompletedTransaction(transaction)
      setStep('success')
      onReceived(transaction)
      await refreshProduct(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not add stock')
    } finally {
      setSubmitting(false)
    }
  }

  const itemOptions = products.map(product => ({
    value: product.id,
    label: product.sku ? `${product.name} · ${product.sku}` : product.name,
  }))
  const locationOptions = locations.map(location => ({
    value: location.id,
    label: location.code ? `${location.name} · ${location.code}` : location.name,
  }))
  const uomOptions = uoms.map(link => ({ value: link.uom_id, label: uomLabel(link) }))

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
        aria-labelledby="add-stock-title"
        aria-describedby="add-stock-description"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Direct stock receipt</p>
            <h2 id="add-stock-title" className={styles.title}>Add stock with confidence</h2>
            <p id="add-stock-description" className={styles.subtitle}>
              Select an existing catalog item, confirm where it arrived, then review the exact ledger movement before posting.
            </p>
          </div>
          <button className={styles.close} onClick={onClose} disabled={submitting} aria-label="Close Add Stock">
            <X size={18} />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.steps} aria-label="Receipt progress">
            {([
              ['details', '1', 'Receipt details'],
              ['review', '2', 'Review movement'],
              ['success', '3', 'Ledger posted'],
            ] as const).map(([key, number, label]) => (
              <div key={key} className={stepClass(step, key)}>
                <span className={styles.stepNumber}>{step === 'success' || (key === 'details' && step !== 'details') ? <Check size={13} /> : number}</span>
                <span className={styles.stepText}>{label}</span>
              </div>
            ))}
          </div>

          <div className={styles.workspace}>
            <section className={styles.panel}>
              {step === 'details' && (
                <>
                  <h3 className={styles.sectionTitle}>Receipt details</h3>
                  <p className={styles.sectionHint}>Required fields are validated again by the atomic inventory engine.</p>

                  {loadError && (
                    <div className={styles.errorBanner} role="alert">
                      <span><AlertTriangle size={15} /> {loadError}</span>
                      <Button variant="ghost" size="sm" onClick={() => void loadReferences()}>
                        <RefreshCw size={14} /> Retry
                      </Button>
                    </div>
                  )}

                  {loadingReferences ? (
                    <div className={styles.grid} aria-label="Loading receipt options">
                      <div className={styles.skeleton} /><div className={styles.skeleton} />
                      <div className={styles.skeleton} /><div className={styles.skeleton} />
                    </div>
                  ) : products.length === 0 && !loadError ? (
                    <div className={styles.emptyState}>
                      No active inventory items are available. Add and configure the item in{' '}
                      <Link className={styles.link} href="/admin/operations/products">Item Master</Link> first.
                    </div>
                  ) : locations.length === 0 && !loadError ? (
                    <div className={styles.emptyState}>
                      No active receiving locations are configured. Manage locations in{' '}
                      <Link className={styles.link} href="/admin/operations/locations">Operations</Link>.
                    </div>
                  ) : (
                    <div className={styles.grid}>
                      <div className={styles.full}>
                        <SearchableSelect
                          label="Existing item"
                          required
                          options={itemOptions}
                          value={productId}
                          onChange={changeProduct}
                          placeholder="Search by item name or SKU"
                          error={fieldErrors.productId}
                        />
                      </div>
                      <div className={styles.full}>
                        <SearchableSelect
                          label="Receiving location"
                          required
                          options={locationOptions}
                          value={locationId}
                          onChange={value => {
                            setLocationId(value)
                            setProductDetail(null)
                            setStep('details')
                            setFieldErrors(current => ({ ...current, locationId: '' }))
                          }}
                          placeholder="Search active locations"
                          error={fieldErrors.locationId}
                        />
                      </div>

                      {loadingProduct && <div className={`${styles.inlineState} ${styles.full}`}>Loading current balance and linked UOMs…</div>}
                      {productError && (
                        <div className={`${styles.errorBanner} ${styles.full}`} role="alert">
                          <span>{productError}</span>
                          <Button variant="ghost" size="sm" onClick={() => void refreshProduct()}>
                            <RefreshCw size={14} /> Retry
                          </Button>
                        </div>
                      )}
                      {productId && !loadingProduct && !productError && uoms.length === 0 && (
                        <div className={`${styles.emptyState} ${styles.full}`}>
                          This item has no operational UOM. Configure it in{' '}
                          <Link className={styles.link} href={`/admin/operations/products/${productId}`}>Item Master</Link> before receiving stock.
                        </div>
                      )}

                      <div className={styles.field}>
                        <SearchableSelect
                          label="Receiving UOM"
                          required
                          options={uomOptions}
                          value={uomId}
                          onChange={value => {
                            setUomId(value)
                            setStep('details')
                            setFieldErrors(current => ({ ...current, uomId: '' }))
                          }}
                          placeholder="Select linked UOM"
                          disabled={!productId || uoms.length === 0}
                          error={fieldErrors.uomId}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="add-stock-quantity">Quantity <span className={styles.required}>*</span></label>
                        <input
                          id="add-stock-quantity"
                          className={`${styles.input} ${fieldErrors.quantity ? styles.inputError : ''}`}
                          inputMode="decimal"
                          type="number"
                          min="0"
                          step="any"
                          value={quantity}
                          onChange={event => {
                            setQuantity(event.target.value)
                            setStep('details')
                            setFieldErrors(current => ({ ...current, quantity: '' }))
                          }}
                          placeholder="0"
                        />
                        {fieldErrors.quantity && <span className={styles.errorText}>{fieldErrors.quantity}</span>}
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="add-stock-cost">Cost per {selectedUom ? uomLabel(selectedUom) : 'selected UOM'} (optional)</label>
                        <input
                          id="add-stock-cost"
                          className={`${styles.input} ${fieldErrors.unitCost ? styles.inputError : ''}`}
                          inputMode="decimal"
                          type="number"
                          min="0"
                          step="0.01"
                          value={unitCost}
                          onChange={event => {
                            setUnitCost(event.target.value)
                            setStep('details')
                            setFieldErrors(current => ({ ...current, unitCost: '' }))
                          }}
                          placeholder="0.00"
                        />
                        {fieldErrors.unitCost && <span className={styles.errorText}>{fieldErrors.unitCost}</span>}
                      </div>
                      <div className={`${styles.field} ${styles.full}`}>
                        <label htmlFor="add-stock-notes">Delivery note (optional)</label>
                        <textarea
                          id="add-stock-notes"
                          className={`${styles.textarea} ${fieldErrors.notes ? styles.inputError : ''}`}
                          maxLength={500}
                          value={notes}
                          onChange={event => setNotes(event.target.value)}
                          placeholder="Invoice, delivery reference, or receiving note"
                        />
                        {fieldErrors.notes && <span className={styles.errorText}>{fieldErrors.notes}</span>}
                      </div>
                    </div>
                  )}

                  <div className={styles.actions}>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                      onClick={reviewReceipt}
                      disabled={loadingReferences || loadingProduct || products.length === 0 || locations.length === 0}
                    >
                      Review receipt <ArrowRight size={15} />
                    </Button>
                  </div>
                </>
              )}

              {step === 'review' && (
                <>
                  <h3 className={styles.sectionTitle}>Review before posting</h3>
                  <p className={styles.sectionHint}>This confirmation creates one canonical purchase movement. It does not create or edit catalog data.</p>
                  {submitError && <div className={styles.errorBanner} role="alert">{submitError}</div>}
                  <div className={styles.reviewList}>
                    <div className={styles.reviewRow}><span>Item</span><strong>{selectedProduct?.name}</strong></div>
                    <div className={styles.reviewRow}><span>Location</span><strong>{selectedLocation?.name}</strong></div>
                    <div className={styles.reviewRow}><span>Receiving quantity</span><strong>{formatQuantity(parsedQuantity)} {uomLabel(selectedUom)}</strong></div>
                    <div className={styles.reviewRow}><span>Canonical ledger quantity</span><strong>+{formatQuantity(preview?.baseQuantity ?? 0)} base units</strong></div>
                    <div className={styles.reviewRow}><span>Receipt value</span><strong>{preview?.receiptValue == null ? 'Cost not supplied' : moneyFormatter.format(preview.receiptValue)}</strong></div>
                    {notes.trim() && <div className={styles.reviewRow}><span>Note</span><strong>{notes.trim()}</strong></div>}
                  </div>
                  <div className={styles.actions}>
                    <Button variant="secondary" onClick={() => setStep('details')} disabled={submitting}>
                      <ArrowLeft size={15} /> Back
                    </Button>
                    <Button onClick={() => void confirmReceipt()} loading={submitting}>
                      <PackagePlus size={16} /> Confirm and add stock
                    </Button>
                  </div>
                </>
              )}

              {step === 'success' && completedTransaction && (
                <div className={styles.success}>
                  <div className={styles.successIcon}><CheckCircle2 size={30} /></div>
                  <h3>Stock added to the ledger</h3>
                  <p>
                    {selectedProduct?.name} increased by {formatQuantity(completedTransaction.quantity)} base units at {selectedLocation?.name}.
                  </p>
                  <span className={styles.transactionId}>Movement {completedTransaction.id}</span>
                  <div className={styles.actions}>
                    <Button variant="secondary" onClick={resetForm}>Add another receipt</Button>
                    <Button onClick={onClose}>Close</Button>
                  </div>
                </div>
              )}
            </section>

            <aside className={styles.receipt} aria-label="Live stock movement preview">
              <div className={styles.receiptHeader}>
                <p>Live movement preview</p>
                <h3>{selectedProduct?.name || 'Awaiting an item'}</h3>
              </div>
              <div className={styles.receiptBody}>
                {!selectedProduct || !selectedLocation ? (
                  <div className={styles.receiptEmpty}>
                    <div>
                      <PackagePlus size={34} strokeWidth={1.5} />
                      <p>Select an item and location to see current stock and the projected movement.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <dl className={styles.facts}>
                      <div className={styles.fact}><dt>SKU</dt><dd>{selectedProduct.sku || 'Not assigned'}</dd></div>
                      <div className={styles.fact}><dt>Location</dt><dd>{selectedLocation.name}</dd></div>
                      <div className={styles.fact}><dt>Current stock</dt><dd>{formatQuantity(preview?.currentSourceBalance ?? currentSourceBalance)} {selectedUom ? uomLabel(selectedUom) : 'base units'}</dd></div>
                      <div className={styles.fact}><dt>Receiving</dt><dd>{preview ? `+${formatQuantity(preview.sourceQuantity)} ${uomLabel(selectedUom)}` : 'Enter quantity'}</dd></div>
                      <div className={styles.fact}><dt>Base conversion</dt><dd>{selectedUom ? `1 ${uomLabel(selectedUom)} = ${formatQuantity(Number(selectedUom.conversion_factor))} base` : 'Select UOM'}</dd></div>
                    </dl>
                    <div className={styles.movement}>
                      <span className={styles.movementLabel}>Projected on hand</span>
                      <strong>{preview ? formatQuantity(preview.projectedSourceBalance) : '—'} {selectedUom ? uomLabel(selectedUom) : ''}</strong>
                      <small>{preview ? `${formatQuantity(preview.currentBaseBalance)} → ${formatQuantity(preview.projectedBaseBalance)} canonical base units` : 'Waiting for a valid quantity'}</small>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
