'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/lib/cart';
import { formatWhatsAppUrl, generateOrderMessage, BUSINESS_INFO } from '@/lib/whatsappConfig';
import styles from './CartButton.module.css';

export default function CartButton() {
  const { items, total, addItem, removeItem, updateQuantity, clearCart, isCartOpen, openCart, closeCart } = useCart();
  const [isClient, setIsClient] = useState(false);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    orderType: 'Pickup' as 'Pickup' | 'Delivery' | 'Dine-in',
    requestedTime: '',
    notes: '',
    tableNumber: '',
    deliveryAddress: '',
  });
  const [orderRef, setOrderRef] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleDecrease = (item: typeof items[0]) => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    } else {
      removeItem(item.id);
    }
  };

  const handleIncrease = (item: typeof items[0]) => {
    addItem({ 
      id: item.id, 
      menuItemId: item.menuItemId,
      name: item.name, 
      price: item.price, 
      quantity: 1, 
      category: item.category, 
      selectedSize: item.selectedSize, 
      selectedAddOns: item.selectedAddOns, 
      notes: item.notes 
    });
  };

  const handleRemove = (id: string) => {
    removeItem(id);
  };

  const submitOrderToSupabase = async () => {
    const itemsPayload = items.map(item => ({
      id: item.menuItemId || item.id,
      quantity: item.quantity,
      notes: item.notes,
      ...(item.selectedSize ? { selectedSize: { name: item.selectedSize } } : {}),
      ...(item.selectedAddOns && item.selectedAddOns.length > 0
        ? { selectedAddOns: item.selectedAddOns.map(name => ({ name })) }
        : {}),
    }));

    const res = await fetch('/api/supabase/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerInfo.name || 'Guest',
        phone: customerInfo.phone || 'No phone',
        order_type: customerInfo.orderType.toLowerCase(),
        requested_time: customerInfo.requestedTime || 'ASAP',
        items: itemsPayload,
        ...(customerInfo.orderType === 'Dine-in' && customerInfo.tableNumber ? { table_number: customerInfo.tableNumber } : {}),
        ...(customerInfo.orderType === 'Delivery' && customerInfo.deliveryAddress ? { delivery_address: customerInfo.deliveryAddress } : {}),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to submit order');
    }

    const data = await res.json();
    return data.order?.order_ref || '';
  };

  const handleWhatsAppOrder = async () => {
    if (isOrderSubmitting) return;
    setOrderError('');
    setIsOrderSubmitting(true);

    let ref = '';
    try {
      ref = await submitOrderToSupabase();
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Failed to save order');
    }

    const message = generateOrderMessage(items, total, customerInfo);
    if (ref) {
      setOrderRef(ref);
    }
    const url = formatWhatsAppUrl(message);
    window.open(url, '_blank');
    clearCart();
    closeCart();
    setCustomerInfo({ name: '', phone: '', orderType: 'Pickup', requestedTime: '', notes: '', tableNumber: '', deliveryAddress: '' });
    setIsOrderSubmitting(false);
  };

  const handleOnlineOrder = async () => {
    if (isOrderSubmitting) return;
    setOrderError('');
    setIsOrderSubmitting(true);

    try {
      const ref = await submitOrderToSupabase();
      setOrderRef(ref);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Failed to save order');
    }

    setIsOrderSubmitting(false);
  };

  const handleBackToCart = () => {
    setOrderRef('');
    setOrderError('');
  };

  return (
    <>
      {/* Sticky WhatsApp Button - Mobile */}
       <a
          href={`https://wa.me/${BUSINESS_INFO.phoneRaw}?text=${encodeURIComponent(BUSINESS_INFO.name + ' - I would like to place an order')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-cta-button"
          title="Order via WhatsApp"
        >
          <i className="fab fa-whatsapp" style={{ color: '#fff', fontSize: '1.75rem' }} />
       </a>

      {/* Cart Button */}
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

{/* Cart Modal */}
      {isCartOpen && (
        <div className={styles.overlay} onClick={closeCart}>
           <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.header}>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--dark-brown)' }}>🛒 Your Order</h2>
              {!orderRef && <button className={styles.closeBtn} onClick={closeCart}>✕</button>}
            </div>

            {orderRef ? (
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
                    onClick={() => { clearCart(); closeCart(); setOrderRef(''); setCustomerInfo({ name: '', phone: '', orderType: 'Pickup', requestedTime: '', notes: '', tableNumber: '', deliveryAddress: '' }); }}
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
                  {items.map(item => {
                    const itemTotal = item.price * item.quantity;
                    const extras = [];
                    if (item.selectedSize) extras.push(`Size: ${item.selectedSize}`);
                    if (item.selectedAddOns && item.selectedAddOns.length > 0) extras.push(`+${item.selectedAddOns.join(', +')}`);
                    
                    return (
                      <div key={item.id} className={styles.itemRow}>
                        <div className={styles.qtyControls}>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => handleDecrease(item)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className={styles.qtyValue}>{item.quantity}</span>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => handleIncrease(item)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <div className={styles.itemName}>
                          {item.name}
                          {extras.length > 0 && (
                            <span className={styles.itemNameSub}>{extras.join(' | ')}</span>
                          )}
                        </div>
                        <span className={styles.itemPrice}>R{itemTotal}</span>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleRemove(item.id)}
                          aria-label="Remove item"
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Customer Details */}
                <div className={styles.detailsSection}>
                  <h3>📝 Your Details</h3>
                  
                  <div className={styles.formGrid}>
                    <input
                      type="text"
                      placeholder="Your name (optional)"
                      value={customerInfo.name}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      className={styles.input}
                    />
                    <input
                      type="tel"
                      placeholder="Phone number (optional)"
                      value={customerInfo.phone}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className={styles.input}
                    />
                    <div className={styles.toggleRow}>
                      <button
                        type="button"
                        onClick={() => setCustomerInfo(prev => ({ ...prev, orderType: 'Pickup' }))}
                        className={`${styles.toggleBtn} ${customerInfo.orderType === 'Pickup' ? styles.toggleBtnActive : ''}`}
                      >
                        🏪 Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerInfo(prev => ({ ...prev, orderType: 'Delivery' }))}
                        className={`${styles.toggleBtn} ${customerInfo.orderType === 'Delivery' ? styles.toggleBtnActive : ''}`}
                      >
                        🚚 Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerInfo(prev => ({ ...prev, orderType: 'Dine-in' }))}
                        className={`${styles.toggleBtn} ${customerInfo.orderType === 'Dine-in' ? styles.toggleBtnActive : ''}`}
                      >
                        🍽️ Dine-in
                      </button>
                    </div>
                    {customerInfo.orderType === 'Delivery' && (
                      <input
                        type="text"
                        placeholder="Delivery address *"
                        value={customerInfo.deliveryAddress}
                        onChange={e => setCustomerInfo(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                        className={styles.input}
                      />
                    )}
                    {customerInfo.orderType === 'Dine-in' && (
                      <input
                        type="text"
                        placeholder="Table number *"
                        value={customerInfo.tableNumber}
                        onChange={e => setCustomerInfo(prev => ({ ...prev, tableNumber: e.target.value }))}
                        className={styles.input}
                      />
                    )}
                    <input
                      type="text"
                      placeholder="Requested time (e.g. 7:30 PM)"
                      value={customerInfo.requestedTime}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, requestedTime: e.target.value }))}
                      className={styles.input}
                    />
                    <textarea
                      placeholder="Additional notes (optional)"
                      value={customerInfo.notes}
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

                {/* Checkout method selection */}
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
    </>
  );
}
