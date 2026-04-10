'use client';

import { useState, useEffect } from 'react';
import { cmsService } from '@/lib/client-cms';

export default function AdminPopup() {
  const [formData, setFormData] = useState<{
    type: 'promotion' | 'event' | 'announcement';
    title: string;
    description: string;
    image: string;
    ctaText: string;
    ctaLink: string;
    isEnabled: boolean;
    showOncePerSession: boolean;
    startDate: string;
    endDate: string;
  }>({
    type: 'promotion',
    title: '',
    description: '',
    image: '',
    ctaText: '',
    ctaLink: '',
    isEnabled: false,
    showOncePerSession: true,
    startDate: '',
    endDate: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadPopup = async () => {
      try {
        const data = await cmsService.getPopup();
        setFormData({
          type: data.type || 'promotion',
          title: data.title || '',
          description: data.description || '',
          image: data.image || '',
          ctaText: data.ctaText || '',
          ctaLink: data.ctaLink || '',
          isEnabled: data.isEnabled || false,
          showOncePerSession: data.showOncePerSession !== false,
          startDate: data.startDate || '',
          endDate: data.endDate || ''
        });
      } catch (error) {
        console.error('Error loading popup:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPopup();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await cmsService.savePopup(formData);
      setSaveMessage('Popup settings saved!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving popup:', error);
      setSaveMessage('Error saving popup');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Homepage Popup</h1>
        <p style={{ color: 'var(--text-light)' }}>Configure the popup that appears on the homepage</p>
      </div>

      {saveMessage && (
        <div style={{ 
          background: saveMessage.includes('Error') ? '#fee2e2' : '#dcfce7', 
          color: saveMessage.includes('Error') ? '#dc2626' : '#16a34a',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          {saveMessage}
        </div>
      )}

      <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)' }}>Popup Settings</h2>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={formData.isEnabled} onChange={e => setFormData({...formData, isEnabled: e.target.checked})} style={{ width: '20px', height: '20px' }} />
            <span style={{ fontWeight: 600 }}>Enable Popup</span>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Popup Type</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as 'promotion' | 'event' | 'announcement'})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
              <option value="promotion">Promotion</option>
              <option value="event">Event</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Show Once Per Session</label>
            <select value={String(formData.showOncePerSession)} onChange={e => setFormData({...formData, showOncePerSession: e.target.value === 'true'})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
              <option value="true">Yes - Show once per browser session</option>
              <option value="false">No - Show on every visit</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Start Date</label>
            <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>End Date</label>
            <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Enter popup title" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Enter popup description" rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>CTA Button Text</label>
            <input type="text" value={formData.ctaText} onChange={e => setFormData({...formData, ctaText: e.target.value})} placeholder="e.g., View Menu" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>CTA Link</label>
            <input type="text" value={formData.ctaLink} onChange={e => setFormData({...formData, ctaLink: e.target.value})} placeholder="e.g., /menu" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '2rem' }}>{isSaving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </div>
  );
}