'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';

export default function CartButton() {
  const { items, total } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
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
            padding: '2rem',
            maxHeight: '80vh',
            overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--dark-brown)' }}>Your Order</h2>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            {items.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>Your cart is empty</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem', background: 'var(--cream)', borderRadius: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: 'var(--dark-brown)' }}>{item.name}</p>
                        {item.selectedSize && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>Size: {item.selectedSize}</p>
                        )}
                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>Extras: {item.selectedAddOns.join(', ')}</p>
                        )}
                        {item.notes && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontStyle: 'italic', marginTop: '2px' }}>Note: {item.notes}</p>
                        )}
                        <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '4px' }}>R{item.price} each</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button onClick={() => useCart().updateQuantity(item.id, item.quantity - 1)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--primary)', background: 'none', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: 600 }}>{item.quantity}</span>
                        <button onClick={() => useCart().addItem({ id: item.id, name: item.name, price: item.price, quantity: 1 })} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--primary)', background: 'none', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '2px solid var(--cream)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 700 }}>
                    <span>Total:</span>
                    <span style={{ color: 'var(--primary)' }}>R{total}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const formatItem = (item: typeof items[0]) => {
                      let details = `• ${item.name}`;
                      if (item.selectedSize) details += ` (${item.selectedSize})`;
                      if (item.selectedAddOns && item.selectedAddOns.length > 0) {
                        details += ` + ${item.selectedAddOns.join(', ')}`;
                      }
                      if (item.notes) details += ` [Note: ${item.notes}]`;
                      details += ` x${item.quantity} - R${item.price * item.quantity}`;
                      return details;
                    };
                    const message = items.map(item => formatItem(item)).join('%0A');
                    const whatsappMessage = `Hello! I would like to order:%0A%0A${message}%0A%0A📋 Total: R${total}%0A%0APlease confirm my order. Thank you!`;
                    window.open(`https://wa.me/27729962212?text=${whatsappMessage}`, '_blank');
                    useCart().clearCart();
                    setIsOpen(false);
                  }}
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