'use client';

import { useState, useEffect } from 'react';
import { dataService } from '@/lib/data';

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState<any[]>([]);

  useEffect(() => {
    setInquiries(dataService.getInquiries());
  }, []);

  const markAsRead = (id: string) => {
    const updated = inquiries.map((i: any) => i.id === id ? { ...i, isRead: true } : i);
    dataService.saveInquiries(updated);
    setInquiries(updated);
  };

  const deleteInquiry = (id: string) => {
    if (confirm('Delete this inquiry?')) {
      const updated = inquiries.filter((i: any) => i.id !== id);
      dataService.saveInquiries(updated);
      setInquiries(updated);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Contact Inquiries</h1>
        <p style={{ color: 'var(--text-light)' }}>{inquiries.length} messages</p>
      </div>

      {inquiries.length === 0 ? (
        <div style={{ background: 'var(--white)', padding: '3rem', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-light)' }}>No inquiries yet. Messages from the contact form will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {inquiries.map((inquiry: any) => (
            <div 
              key={inquiry.id} 
              style={{ 
                background: 'var(--white)', 
                padding: '1.5rem', 
                borderRadius: '12px', 
                boxShadow: 'var(--shadow-sm)',
                borderLeft: inquiry.isRead ? 'none' : '4px solid var(--primary)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--dark-brown)', marginBottom: '0.25rem' }}>{inquiry.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{inquiry.email} {inquiry.phone && `• ${inquiry.phone}`}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!inquiry.isRead && (
                    <button onClick={() => markAsRead(inquiry.id)} style={{ padding: '0.5rem 1rem', background: 'var(--cream)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Mark Read</button>
                  )}
                  <button onClick={() => deleteInquiry(inquiry.id)} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', fontSize: '0.85rem' }}>Delete</button>
                </div>
              </div>
              {inquiry.subject && (
                <p style={{ fontWeight: 600, color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>Subject: {inquiry.subject}</p>
              )}
              <p style={{ color: 'var(--text)', lineHeight: 1.6 }}>{inquiry.message}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '1rem' }}>
                {new Date(inquiry.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}