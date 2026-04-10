'use client';

import { useState, useEffect } from 'react';
import { cmsService } from '@/lib/client-cms';

export default function AdminAnnouncement() {
  const [formData, setFormData] = useState({
    text: '',
    isEnabled: false,
    link: '',
    linkText: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const data = await cmsService.getAnnouncement();
        setFormData({
          text: data.text || '',
          isEnabled: data.isEnabled || false,
          link: data.link || '',
          linkText: data.linkText || '',
        });
      } catch (error) {
        console.error('Error loading announcement:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAnnouncement();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await cmsService.saveAnnouncement(formData);
      setSaveMessage('Announcement saved!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving announcement:', error);
      setSaveMessage('Error saving announcement');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Announcement Bar</h1>
        <p style={{ color: 'var(--text-light)' }}>Configure the announcement that appears at the top of the website</p>
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
            <h2 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)' }}>Announcement Settings</h2>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={formData.isEnabled} onChange={e => setFormData({...formData, isEnabled: e.target.checked})} style={{ width: '20px', height: '20px' }} />
            <span style={{ fontWeight: 600 }}>Enable Announcement</span>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Announcement Text</label>
            <textarea value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} placeholder="Enter your announcement text" rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Link (optional)</label>
              <input type="text" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="e.g., /events" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Link Text (optional)</label>
              <input type="text" value={formData.linkText} onChange={e => setFormData({...formData, linkText: e.target.value})} placeholder="e.g., Learn more" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '2rem' }}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
