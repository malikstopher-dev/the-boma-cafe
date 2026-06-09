'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/lib/cart';
import { formatWhatsAppUrl, generateOrderMessage, BUSINESS_INFO } from '@/lib/whatsappConfig';
import styles from './CartButton.module.css';

export default function CartButton() {
  const { items, total, addItem, removeItem, updateQuantity, clearCart, isCartOpen, openCart, closeCart } = useCart();
  const [isClient, setIsClient] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    orderType: 'Pickup' as 'Pickup' | 'Delivery',
    requestedTime: '',
    notes: '',
  });

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

  const handleOrder = () => {
    const message = generateOrderMessage(items, total, customerInfo);
    const url = formatWhatsAppUrl(message);
    window.open(url, '_blank');
    clearCart();
    closeCart();
    setCustomerInfo({ name: '', phone: '', orderType: 'Pickup', requestedTime: '', notes: '' });
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
              <button className={styles.closeBtn} onClick={closeCart}>✕</button>
            </div>

            {items.length === 0 ? (
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
                    </div>
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

                <button
                  onClick={handleOrder}
                  className={styles.orderBtn}
                >
                  <i className="fab fa-whatsapp" /> Order via WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
