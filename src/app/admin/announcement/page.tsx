'use client';

import { useState, useEffect } from 'react';
import { dataService } from '@/lib/data';

export default function AdminAnnouncement() {
  const [announcement, setAnnouncement] = useState<any>(null);
  const [formData, setFormData] = useState({
    id: '',
    text: '',
    isEnabled: false,
    link: '',
    linkText: '',
    createdAt: '',
    updatedAt: ''
  });

  useEffect(() => {
    const a = dataService.getAnnouncement();
    setAnnouncement(a);
    setFormData({
      id: a.id || '',
      text: a.text || '',
      isEnabled: a.isEnabled || false,
      link: a.link || '',
      linkText: a.linkText || '',
      createdAt: a.createdAt || new Date().toISOString(),
      updatedAt: a.updatedAt || new Date().toISOString()
    });
  }, []);

  const handleSave = () => {
    dataService.saveAnnouncement({
      ...formData,
      updatedAt: new Date().toISOString()
    });
    alert('Announcement saved!');
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Announcement Bar</h1>
        <p style={{ color: 'var(--text-light)' }}>Configure the announcement that appears at the top of the website</p>
      </div>

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

        <button onClick={handleSave} className="btn btn-primary" style={{ marginTop: '2rem' }}>Save Settings</button>
      </div>
    </div>
  );
}