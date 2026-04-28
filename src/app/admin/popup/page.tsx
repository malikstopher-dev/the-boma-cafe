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
    startTime: string;
    endTime: string;
    activeDays: number[];
    adultPrice: string;
    kidsPrice: string;
  }>({
    type: 'promotion',
    title: 'Weekend Breakfast Buffet',
    description: 'Join us this Saturday and Sunday from 9:30 AM to 12:30 PM for our breakfast buffet.',
    image: '',
    ctaText: 'View Menu',
    ctaLink: '/menu',
    isEnabled: false,
    showOncePerSession: true,
    startDate: '',
    endDate: '',
    startTime: '09:30',
    endTime: '12:30',
    activeDays: [6, 0],
    adultPrice: 'R89',
    kidsPrice: 'R45'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadPopup = async () => {
      try {
        const data = await cmsService.getPopup();
        if (data) {
          setFormData({
            type: data.type || 'promotion',
            title: data.title || 'Weekend Breakfast Buffet',
            description: data.description || 'Join us this Saturday and Sunday from 9:30 AM to 12:30 PM for our breakfast buffet.',
            image: data.image || '',
            ctaText: data.ctaText || 'View Menu',
            ctaLink: data.ctaLink || '/menu',
            isEnabled: data.isEnabled || false,
            showOncePerSession: data.showOncePerSession !== false,
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            startTime: data.startTime || '09:30',
            endTime: data.endTime || '12:30',
            activeDays: data.activeDays || [6, 0],
            adultPrice: data.adultPrice || 'R89',
            kidsPrice: data.kidsPrice || 'R45'
          });
        }
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

  const toggleDay = (day: number) => {
    const days = formData.activeDays.includes(day)
      ? formData.activeDays.filter(d => d !== day)
      : [...formData.activeDays, day].sort();
    setFormData({ ...formData, activeDays: days });
  };

  const dayNames: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Weekend Breakfast Popup</h1>
        <p style={{ color: 'var(--text-light)' }}>Configure the weekend breakfast buffet popup</p>
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

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--cream)', borderRadius: '12px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
            <strong style={{ color: 'var(--dark-brown)' }}>Note:</strong> This popup shows automatically on Saturdays and Sundays between {formData.startTime} and {formData.endTime}. No date range needed.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Active Days</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[6, 0, 1, 2, 3, 4, 5].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--cream)',
                    background: formData.activeDays.includes(day) ? 'var(--primary)' : 'var(--white)',
                    color: formData.activeDays.includes(day) ? 'var(--white)' : 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {dayNames[day]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Show Once Per Session</label>
            <select value={String(formData.showOncePerSession)} onChange={e => setFormData({...formData, showOncePerSession: e.target.value === 'true'})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
              <option value="true">Yes - Show once per browser session</option>
              <option value="false">No - Show on every visit</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Start Time</label>
            <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>End Time</label>
            <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Adult Price</label>
            <input type="text" value={formData.adultPrice} onChange={e => setFormData({...formData, adultPrice: e.target.value})} placeholder="e.g., R89" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Kids Price</label>
            <input type="text" value={formData.kidsPrice} onChange={e => setFormData({...formData, kidsPrice: e.target.value})} placeholder="e.g., R45" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Weekend Breakfast Buffet" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Join us this weekend..." rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Primary CTA Text</label>
            <input type="text" value={formData.ctaText} onChange={e => setFormData({...formData, ctaText: e.target.value})} placeholder="View Menu" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Primary CTA Link</label>
            <input type="text" value={formData.ctaLink} onChange={e => setFormData({...formData, ctaLink: e.target.value})} placeholder="/menu" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Image URL (optional)</label>
            <input type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="/images/buffet.jpg" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '2rem' }}>{isSaving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </div>
  );
}