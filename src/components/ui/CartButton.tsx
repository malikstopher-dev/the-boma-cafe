'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from '@/lib/cart'
import { formatWhatsAppUrl, generateOrderMessage, BUSINESS_INFO } from '@/lib/whatsappConfig'
import { enqueueOrder, syncPendingOrders } from '@/lib/offline-queue'
import type { OrderType } from '@/lib/pos/types'
import styles from './CartButton.module.css'
import ValidationModal, { type ValidationError } from './ValidationModal'

interface FieldErrors {
  name?: string
  phone?: string
  tableNumber?: string
  deliveryAddress?: string
  items?: string
}

const SUBMISSION_COOLDOWN_MS = 3000

export default function CartButton() {
  const pathname = usePathname()
  const cartCtx = useCart()
  const [isClient, setIsClient] = useState(false)
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [modalErrors, setModalErrors] = useState<ValidationError[]>([])
  const [modalTitle, setModalTitle] = useState('')
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    requestedTime: '',
    notes: '',
    tableNumber: '',
    deliveryAddress: '',
    waiterName: '',
  })
  const [orderRef, setOrderRef] = useState('')
  const [pendingSync, setPendingSync] = useState(0)
  const lastSubmitRef = useRef(0)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLInputElement>(null)
  const deliveryRef = useRef<HTMLInputElement>(null)
  const waiterRef = useRef<HTMLInputElement>(null)

  const items = Array.isArray(cartCtx?.items) ? cartCtx.items : []
  const total = cartCtx?.total ?? 0
  const clearCart = cartCtx?.clearCart ?? (() => {})
  const isCartOpen = cartCtx?.isCartOpen ?? false
  const openCart = cartCtx?.openCart ?? (() => {})
  const closeCart = cartCtx?.closeCart ?? (() => {})
  const orderType = cartCtx?.orderType ?? 'pickup'
  const setOrderType = cartCtx?.setOrderType ?? (() => {})

  useEffect(() => {
    setIsClient(true)
    syncPendingOrders().then(r => {
      if (r.synced > 0 || r.failed > 0) setPendingSync(r.synced)
    })
  }, [])

  const validateForm = useCallback((): boolean => {
    const errs: FieldErrors = {}
    const name = customerInfo?.name ?? ''
    const phone = customerInfo?.phone ?? ''
    const tableNumber = customerInfo?.tableNumber ?? ''
    const deliveryAddress = customerInfo?.deliveryAddress ?? ''

    if (!name.trim()) {
      errs.name = 'Name is required'
    }

    if (!phone.trim()) {
      errs.phone = 'Phone number is required'
    } else if (!/^[\d\s+\-()]{7,20}$/.test(phone.trim())) {
      errs.phone = 'Enter a valid phone number (7-20 digits)'
    }

    if (items.length === 0) {
      errs.items = 'Your cart is empty'
    }

    if (orderType === 'dine-in' && !tableNumber.trim()) {
      errs.tableNumber = 'Table number is required for dine-in'
    }

    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      errs.deliveryAddress = 'Delivery address is required'
    }

    // Bar items (drinks) cannot be delivered
    if (orderType === 'delivery') {
      const barItems = items.filter((item: any) => item.station === 'bar')
      if (barItems.length > 0) {
        errs.items = `Drinks cannot be delivered (${barItems.map((i: any) => i.name).join(', ')}). Please switch to pickup or remove drinks.`
      }
    }

    // Pickup restriction: Hot Beverages, DRNK Freezos, Milkshakes, Cocktails, Ice Cream cannot be picked up
    if (orderType === 'pickup') {
      const restrictedItems = items.filter((item: any) => item.station === 'bar' && item.availableForPickup === false)
      if (restrictedItems.length > 0) {
        errs.items = `${restrictedItems.map((i: any) => i.name).join(', ')} cannot be picked up. Please switch to delivery or dine-in, or remove them.`
      }
    }

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }, [customerInfo, items.length, orderType])

  const focusField = useCallback((field: string) => {
    const refMap: Record<string, React.RefObject<HTMLInputElement | null>> = {
      name: nameRef,
      phone: phoneRef,
      tableNumber: tableRef,
      table_number: tableRef,
      deliveryAddress: deliveryRef,
      delivery_address: deliveryRef,
      waiterName: waiterRef,
      waiter_name: waiterRef,
    }
    const ref = refMap[field]
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => ref.current?.focus(), 300)
    }
  }, [])

  const showValidationPopup = useCallback((title: string, errors: ValidationError[]) => {
    setModalTitle(title)
    setModalErrors(errors)
  }, [])

  const closeValidationPopup = useCallback(() => {
    setModalErrors([])
    setModalTitle('')
  }, [])

  const submitOrder = useCallback(async (): Promise<string> => {
    const now = Date.now()
    if (now - lastSubmitRef.current < SUBMISSION_COOLDOWN_MS) {
      throw new Error('Please wait before submitting again')
    }
    lastSubmitRef.current = now

    const idempotencyKey = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const itemsPayload = items.map(item => ({
      ...(item?.menuItemId ? { menu_item_id: item.menuItemId } : {}),
      ...(item?.barItemId ? { bar_item_id: item.barItemId } : {}),
      quantity: item?.quantity ?? 1,
      ...(item?.station ? { station: item.station } : {}),
      ...(item?.selectedSize ? { selected_size: item.selectedSize } : {}),
      ...(item?.selectedAddOns && item.selectedAddOns.length > 0
        ? { selected_add_ons: item.selectedAddOns }
        : {}),
    }))

    const cName = customerInfo?.name?.trim() || 'Guest'
    const cPhone = customerInfo?.phone?.trim() || 'No phone'
    const cOrderType = orderType
    const cTableNumber = customerInfo?.tableNumber?.trim() ?? ''
    const cDeliveryAddress = customerInfo?.deliveryAddress?.trim() ?? ''
    const cWaiterName = customerInfo?.waiterName?.trim() ?? ''
    const cRequestedTime = customerInfo?.requestedTime || 'ASAP'

    const payload = {
      customer_name: cName,
      phone: cPhone,
      order_type: cOrderType,
      requested_time: cRequestedTime,
      idempotency_key: idempotencyKey,
      items: itemsPayload,
      ...(cOrderType === 'dine-in' && cTableNumber ? { table_number: cTableNumber } : {}),
      ...(cOrderType === 'dine-in' && cWaiterName ? { waiter_name: cWaiterName } : {}),
      ...(cOrderType === 'delivery' && cDeliveryAddress ? { delivery_address: cDeliveryAddress } : {}),
    }

    const res = await fetch('/api/supabase/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      enqueueOrder(payload)
      let errorMsg = 'Failed to save order'
      try {
        const errorData = await res.json()
        errorMsg = errorData?.error || errorMsg
      } catch { /* ignore parse error */ }
      throw new Error(errorMsg)
    }

    let data: any = {}
    try {
      data = await res.json()
    } catch { /* ignore parse error */ }

    const order = data?.order ?? null
    return order?.order_ref || ''
  }, [items, customerInfo])

  const resetCart = useCallback(() => {
    clearCart()
    closeCart()
    setOrderRef('')
    setOrderError('')
    setFieldErrors({})
    setCustomerInfo({ name: '', phone: '', requestedTime: '', notes: '', tableNumber: '', deliveryAddress: '', waiterName: '' })
  }, [clearCart, closeCart])

  const addItem = cartCtx?.addItem ?? (() => {})
  const removeItem = cartCtx?.removeItem ?? (() => {})
  const updateQuantity = cartCtx?.updateQuantity ?? (() => {})

  if (!isClient) return null
  if (!Array.isArray(items)) return null

  const itemCount = items.reduce((sum, item) => sum + (item?.quantity ?? 0), 0)

  const handleDecrease = (item: any) => {
    if (!item?.id) return
    const qty = item?.quantity ?? 1
    if (qty > 1) {
      updateQuantity(item.id, qty - 1)
    } else {
      removeItem(item.id)
    }
  }

  const handleIncrease = (item: any) => {
    if (!item?.id) return
    addItem({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.name ?? '',
      price: item.price ?? 0,
      quantity: 1,
      category: item.category,
      selectedSize: item.selectedSize,
      selectedAddOns: item.selectedAddOns,
      notes: item.notes,
    })
  }

  const handleRemove = (id: string) => {
    if (id) removeItem(id)
  }

  const handleWhatsAppOrder = async () => {
    if (isOrderSubmitting) return
    setOrderError('')
    setFieldErrors({})

    if (!validateForm()) {
      const errs: ValidationError[] = Object.entries(fieldErrors).map(([field, message]) => ({
        field, message: message || `${field} is required`,
      }))
      if (errs.length > 0) showValidationPopup('Order Incomplete', errs)
      return
    }

    setIsOrderSubmitting(true)

    try {
      const ref = await submitOrder()
      setOrderRef(ref)

      const cName = customerInfo?.name ?? ''
      const cPhone = customerInfo?.phone ?? ''
      const cOrderType = orderType
      const cRequestedTime = customerInfo?.requestedTime ?? ''
      const cNotes = customerInfo?.notes ?? ''
      const cTableNumber = customerInfo?.tableNumber ?? ''
      const cDeliveryAddress = customerInfo?.deliveryAddress ?? ''

      const message = generateOrderMessage(items, total, {
        name: cName,
        phone: cPhone,
        orderType: cOrderType === 'pickup' ? 'Pickup' : cOrderType === 'delivery' ? 'Delivery' : 'Dine-in',
        requestedTime: cRequestedTime,
        notes: cNotes,
        tableNumber: cTableNumber,
        deliveryAddress: cDeliveryAddress,
      })
      const url = formatWhatsAppUrl(message)
      window.open(url, '_blank')

      clearCart()
      setCustomerInfo({ name: '', phone: '', requestedTime: '', notes: '', tableNumber: '', deliveryAddress: '', waiterName: '' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save order'
      setOrderError(msg)
      showValidationPopup('Could Not Place Order', [{ field: 'items', message: msg }])
    } finally {
      setIsOrderSubmitting(false)
    }
  }

  const handleOnlineOrder = async () => {
    if (isOrderSubmitting) return
    setOrderError('')
    setFieldErrors({})

    if (!validateForm()) {
      const errs: ValidationError[] = Object.entries(fieldErrors).map(([field, message]) => ({
        field, message: message || `${field} is required`,
      }))
      if (errs.length > 0) showValidationPopup('Order Incomplete', errs)
      return
    }

    setIsOrderSubmitting(true)

    try {
      const ref = await submitOrder()
      setOrderRef(ref)

      clearCart()
      setCustomerInfo({ name: '', phone: '', requestedTime: '', notes: '', tableNumber: '', deliveryAddress: '', waiterName: '' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save order'
      setOrderError(msg)
      showValidationPopup('Could Not Place Order', [{ field: 'items', message: msg }])
    } finally {
      setIsOrderSubmitting(false)
    }
  }

  const showOrderSuccess = !!orderRef && items.length === 0

  // Hide on staff/admin/waiter pages (they have their own POS)
  if (pathname.startsWith('/staff') || pathname.startsWith('/admin') || pathname.startsWith('/waiter')) return null

  return (
    <>
      <a
        href={formatWhatsAppUrl(`${BUSINESS_INFO.name} - I would like to place an order`)}
        target="_blank"
        rel="noopener noreferrer"
        className="mobile-cta-button"
        title="Order via WhatsApp"
      >
        <i className="fab fa-whatsapp" style={{ color: '#fff', fontSize: '1.75rem' }} />
      </a>

      <button
        onClick={openCart}
        className="mobile-cart-button"
      >
        <i className="fas fa-shopping-cart" style={{ color: '#fff', fontSize: '1.2rem' }} />
        {itemCount > 0 && (
          <span className="mobile-cart-badge">
            {itemCount}
          </span>
        )}
      </button>

      {isCartOpen && (
        <div className={styles.overlay} onClick={closeCart}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.header}>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--dark-brown)' }}>🛒 Your Order</h2>
              {!showOrderSuccess && <button className={styles.closeBtn} onClick={closeCart} aria-label="Close cart">✕</button>}
            </div>

            {showOrderSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{
                  width: '72px', height: '72px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem', fontSize: '2rem', color: '#fff',
                }}>
                  ✓
                </div>
                <h3 style={{ color: 'var(--dark-brown)', marginBottom: '0.5rem', fontSize: '1.35rem' }}>
                  Order Placed!
                </h3>
                <p style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700, color: 'var(--warm)', marginBottom: '1rem' }}>
                  {orderRef}
                </p>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Save your order reference to track the status.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <a
                    href={`/track-order?ref=${orderRef}`}
                    style={{
                      display: 'block', padding: '0.85rem', borderRadius: '12px',
                      background: 'var(--warm)', color: '#fff', textDecoration: 'none',
                      fontWeight: 600, fontSize: '0.95rem',
                    }}
                  >
                    Track Order
                  </a>
                  <button
                    onClick={resetCart}
                    style={{
                      padding: '0.85rem', borderRadius: '12px',
                      border: '2px solid var(--beige-dark)', background: 'transparent',
                      color: 'var(--text)', fontWeight: 500, cursor: 'pointer', fontSize: '0.95rem',
                    }}
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🛒</div>
                <p className={styles.emptyTitle}>Your cart is empty</p>
                <p className={styles.emptySub}>Add items from our menu to get started!</p>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className={styles.itemsList}>
                  {items.map((item: any, idx: number) => {
                    const qty = item?.quantity ?? 1
                    const price = item?.price ?? 0
                    const itemTotal = price * qty
                    const itemName = item?.name ?? ''
                    const itemId = item?.id ?? `item-${idx}`
                    const extras: string[] = []
                    if (item?.selectedSize) extras.push(`Size: ${item.selectedSize}`)
                    if (item?.selectedAddOns && item.selectedAddOns.length > 0) extras.push(`+${item.selectedAddOns.join(', +')}`)

                    return (
                      <div key={itemId} className={styles.itemRow}>
                        <div className={styles.qtyControls}>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => handleDecrease(item)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className={styles.qtyValue}>{qty}</span>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => handleIncrease(item)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <div className={styles.itemName}>
                          {itemName}
                          {extras.length > 0 && (
                            <span className={styles.itemNameSub}>{extras.join(' | ')}</span>
                          )}
                        </div>
                        <span className={styles.itemPrice}>R{itemTotal}</span>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleRemove(itemId)}
                          aria-label="Remove item"
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Validation error banner */}
                {fieldErrors.items && (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0', padding: '0.5rem', background: 'rgba(239,68,68,0.08)', borderRadius: '8px' }}>
                    {fieldErrors.items}
                  </p>
                )}

                {/* Customer Details */}
                <div className={styles.detailsSection}>
                  <h3>📝 Your Details</h3>

                  <div className={styles.formGrid}>
                    <div>
                      <input
                        ref={nameRef}
                        type="text"
                        placeholder="Your name *"
                        value={customerInfo?.name ?? ''}
                        onChange={e => {
                          setCustomerInfo(prev => ({ ...prev, name: e.target.value }))
                          if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }))
                        }}
                        className={`${styles.input} ${fieldErrors.name ? styles.inputError : ''}`}
                      />
                      {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
                    </div>
                    <div>
                      <input
                        ref={phoneRef}
                        type="tel"
                        placeholder="Phone number *"
                        value={customerInfo?.phone ?? ''}
                        onChange={e => {
                          setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))
                          if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: undefined }))
                        }}
                        className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ''}`}
                      />
                      {fieldErrors.phone && <span className={styles.fieldError}>{fieldErrors.phone}</span>}
                    </div>
                    <div className={styles.toggleRow}>
                      <button
                        type="button"
                        onClick={() => { setOrderType('pickup'); setOrderError(''); setFieldErrors({}) }}
                        className={`${styles.toggleBtn} ${orderType === 'pickup' ? styles.toggleBtnActive : ''}`}
                      >
                        🏪 Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOrderType('delivery'); setOrderError(''); setFieldErrors({}) }}
                        className={`${styles.toggleBtn} ${orderType === 'delivery' ? styles.toggleBtnActive : ''}`}
                      >
                        🚚 Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOrderType('dine-in'); setOrderError(''); setFieldErrors({}) }}
                        className={`${styles.toggleBtn} ${orderType === 'dine-in' ? styles.toggleBtnActive : ''}`}
                      >
                        🍽️ Dine-in
                      </button>
                    </div>
                    {orderType === 'delivery' && (
                      <div>
                        <input
                          ref={deliveryRef}
                          type="text"
                          placeholder="Delivery address *"
                          value={customerInfo?.deliveryAddress ?? ''}
                          onChange={e => {
                            setCustomerInfo(prev => ({ ...prev, deliveryAddress: e.target.value }))
                            if (fieldErrors.deliveryAddress) setFieldErrors(prev => ({ ...prev, deliveryAddress: undefined }))
                          }}
                          className={`${styles.input} ${fieldErrors.deliveryAddress ? styles.inputError : ''}`}
                        />
                        {fieldErrors.deliveryAddress && <span className={styles.fieldError}>{fieldErrors.deliveryAddress}</span>}
                      </div>
                    )}
                    {orderType === 'dine-in' && (
                      <>
                        <div>
                          <input
                            ref={tableRef}
                            type="text"
                            placeholder="Table number *"
                            value={customerInfo?.tableNumber ?? ''}
                            onChange={e => {
                              setCustomerInfo(prev => ({ ...prev, tableNumber: e.target.value }))
                              if (fieldErrors.tableNumber) setFieldErrors(prev => ({ ...prev, tableNumber: undefined }))
                            }}
                            className={`${styles.input} ${fieldErrors.tableNumber ? styles.inputError : ''}`}
                          />
                          {fieldErrors.tableNumber && <span className={styles.fieldError}>{fieldErrors.tableNumber}</span>}
                        </div>
                        <div>
                          <input
                            ref={waiterRef}
                            type="text"
                            placeholder="Waiter name (optional)"
                            value={customerInfo?.waiterName ?? ''}
                            onChange={e => {
                              setCustomerInfo(prev => ({ ...prev, waiterName: e.target.value }))
                            }}
                            className={styles.input}
                          />
                        </div>
                      </>
                    )}
                    <input
                      type="text"
                      placeholder="Requested time (e.g. 7:30 PM)"
                      value={customerInfo?.requestedTime ?? ''}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, requestedTime: e.target.value }))}
                      className={styles.input}
                    />
                    <textarea
                      placeholder="Additional notes (optional)"
                      value={customerInfo?.notes ?? ''}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className={styles.textarea}
                    />
                  </div>
                </div>

                {/* Total & Order */}
                <div className={styles.totalSection}>
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Total:</span>
                    <span className={styles.totalValue}>R{total}</span>
                  </div>
                </div>

                {/* Order method selection */}
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.75rem', fontWeight: 600, textAlign: 'center' }}>
                    Order Method
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      onClick={handleWhatsAppOrder}
                      disabled={isOrderSubmitting}
                      className={styles.orderBtn}
                      style={{ opacity: isOrderSubmitting ? 0.7 : 1, cursor: isOrderSubmitting ? 'not-allowed' : 'pointer' }}
                    >
                      {isOrderSubmitting ? 'Submitting...' : <><i className="fab fa-whatsapp" /> Order via WhatsApp</>}
                    </button>
                    <button
                      onClick={handleOnlineOrder}
                      disabled={isOrderSubmitting}
                      style={{
                        width: '100%', minHeight: '48px',
                        padding: '0.85rem', borderRadius: '14px',
                        border: '2px solid var(--beige-dark)', background: 'var(--white)',
                        color: 'var(--dark-brown)', fontSize: '0.95rem', fontWeight: 600, cursor: isOrderSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isOrderSubmitting ? 0.7 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      }}
                    >
                      <span>🌐</span> Place Online Order
                    </button>
                  </div>
                </div>

                {orderError && (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', margin: '0.75rem 0 0' }}>{orderError}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <ValidationModal
        open={modalErrors.length > 0}
        title={modalTitle || 'Order Incomplete'}
        errors={modalErrors}
        onClose={closeValidationPopup}
        onFixField={focusField}
      />
    </>
  )
}
