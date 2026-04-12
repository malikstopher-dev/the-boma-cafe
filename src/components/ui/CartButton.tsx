'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/lib/cart';
import { formatWhatsAppUrl, generateOrderMessage, BUSINESS_INFO } from '@/lib/whatsappConfig';

export default function CartButton() {
  const { items, total, addItem, removeItem, updateQuantity, clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
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
    setIsOpen(false);
    setCustomerInfo({ name: '', phone: '', orderType: 'Pickup', requestedTime: '', notes: '' });
  };

  return (
    <>
      {/* Sticky WhatsApp Button - Mobile */}
      <a
        href={`https://wa.me/${BUSINESS_INFO.phoneRaw}?text=${encodeURIComponent(BUSINESS_INFO.name + ' - I would like to place an order')}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(37, 211, 102, 0.4)',
          zIndex: 998,
          textDecoration: 'none',
        }}
        title="Order via WhatsApp"
      >
        <i className="fab fa-whatsapp" style={{ color: '#fff', fontSize: '1.75rem' }} />
      </a>

      {/* Cart Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          border: 'none',
          boxShadow: '0 4px 20px rgba(139, 69, 19, 0.4)',
          cursor: 'pointer',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i className="fas fa-shopping-cart" style={{ color: '#fff', fontSize: '1.2rem' }} />
        {itemCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: 'var(--fire-orange)',
            color: '#fff',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {itemCount}
          </span>
        )}
      </button>

      {/* Cart Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }} onClick={() => setIsOpen(false)}>
          <div style={{
            background: '#fff',
            width: '100%',
            maxWidth: '500px',
            borderRadius: '20px 20px 0 0',
            padding: '1.5rem',
            maxHeight: '90vh',
            overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--dark-brown)' }}>🛒 Your Order</h2>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 0.5rem' }}>✕</button>
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
                <p style={{ color: 'var(--text-light)', marginBottom: '0.5rem', fontWeight: 500 }}>Your cart is empty</p>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Add items from our menu to get started!</p>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', maxHeight: '35vh', overflowY: 'auto' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.75rem', background: 'var(--cream)', borderRadius: '10px', position: 'relative' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: 'var(--dark-brown)', fontSize: '0.9rem', paddingRight: '2rem' }}>{item.name}</p>
                        {item.selectedSize && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '2px' }}>Size: {item.selectedSize}</p>
                        )}
                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '2px' }}>Extras: {item.selectedAddOns.join(', ')}</p>
                        )}
                        <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px' }}>R{item.price} × {item.quantity} = R{item.price * item.quantity}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                        <button 
                          onClick={() => handleRemove(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc3545',
                            padding: '2px',
                            fontSize: '0.8rem',
                          }}
                          title="Remove"
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button onClick={() => handleDecrease(item)} style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--primary)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', lineHeight: 1 }}>−</button>
                          <span style={{ fontWeight: 600, minWidth: '18px', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</span>
                          <button onClick={() => handleIncrease(item)} style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--primary)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', lineHeight: 1 }}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer Details */}
                <div style={{ borderTop: '1px solid var(--cream)', paddingTop: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', color: 'var(--dark-brown)', marginBottom: '0.75rem' }}>📝 Your Details</h3>
                  
                  <div style={{ display: 'grid', gap: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="Your name (optional)"
                      value={customerInfo.name}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        border: '1px solid var(--cream)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="tel"
                      placeholder="Phone number (optional)"
                      value={customerInfo.phone}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        border: '1px solid var(--cream)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setCustomerInfo(prev => ({ ...prev, orderType: 'Pickup' }))}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          border: `2px solid ${customerInfo.orderType === 'Pickup' ? 'var(--primary)' : 'var(--cream)'}`,
                          background: customerInfo.orderType === 'Pickup' ? 'var(--cream)' : 'transparent',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: customerInfo.orderType === 'Pickup' ? 600 : 400,
                          color: customerInfo.orderType === 'Pickup' ? 'var(--primary)' : 'var(--text-light)',
                        }}
                      >
                        🏪 Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerInfo(prev => ({ ...prev, orderType: 'Delivery' }))}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          border: `2px solid ${customerInfo.orderType === 'Delivery' ? 'var(--primary)' : 'var(--cream)'}`,
                          background: customerInfo.orderType === 'Delivery' ? 'var(--cream)' : 'transparent',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: customerInfo.orderType === 'Delivery' ? 600 : 400,
                          color: customerInfo.orderType === 'Delivery' ? 'var(--primary)' : 'var(--text-light)',
                        }}
                      >
                        🚚 Delivery
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Requested time (e.g. 7:30 PM)"
                      value={customerInfo.requestedTime}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, requestedTime: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        border: '1px solid var(--cream)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                    <textarea
                      placeholder="Additional notes (optional)"
                      value={customerInfo.notes}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        border: '1px solid var(--cream)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>

                {/* Total & Order */}
                <div style={{ borderTop: '2px solid var(--cream)', paddingTop: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700 }}>
                    <span>Total:</span>
                    <span style={{ color: 'var(--primary)' }}>R{total}</span>
                  </div>
                </div>

                <button
                  onClick={handleOrder}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
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
