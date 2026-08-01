'use client';

import { useState, useEffect } from 'react';
import AdminPage from '@/components/admin/design-system/AdminPage';
import Button from '@/components/admin/design-system/Button';
import { Input, Textarea } from '@/components/admin/design-system/Input';
import { SkeletonCard } from '@/components/admin/design-system/Skeleton';
import { useToast } from '@/components/admin/design-system/Toast';
import { cmsService } from '@/lib/client-cms';
import MediaPicker from '@/components/admin/MediaPicker';
import ImageUpload from '@/components/admin/ImageUpload';

export default function AdminPopup() {
  const [formData, setFormData] = useState({
    type: 'promotion' as 'promotion' | 'event' | 'announcement',
    title: 'Weekend Breakfast Buffet',
    description: 'Join us this Saturday and Sunday from 9:30 AM to 12:30 PM for our breakfast buffet.',
    image: '', ctaText: 'View Events & Promotions', ctaLink: '/experience',
    isEnabled: false, showOncePerSession: true,
    startDate: '', endDate: '', startTime: '09:30', endTime: '12:30',
    activeDays: [6, 0] as number[], adultPrice: 'R89', kidsPrice: 'R45',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    cmsService.getPopup().then(data => {
      if (data) setFormData({
        type: data.type || 'promotion', title: data.title || 'Weekend Breakfast Buffet',
        description: data.description || '', image: data.image || '',
        ctaText: data.ctaText || 'View Events & Promotions', ctaLink: data.ctaLink || '/experience',
        isEnabled: data.isEnabled || false, showOncePerSession: data.showOncePerSession !== false,
        startDate: data.startDate || '', endDate: data.endDate || '',
        startTime: data.startTime || '09:30', endTime: data.endTime || '12:30',
        activeDays: data.activeDays || [6, 0], adultPrice: data.adultPrice || 'R89', kidsPrice: data.kidsPrice || 'R45',
      });
    }).catch(() => showError('Failed to load popup')).finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try { await cmsService.savePopup(formData); success('Popup saved'); }
    catch { showError('Failed to save popup'); }
    setIsSaving(false);
  };

  const toggleDay = (day: number) => {
    const days = formData.activeDays.includes(day) ? formData.activeDays.filter(d => d !== day) : [...formData.activeDays, day].sort();
    setFormData({ ...formData, activeDays: days });
  };

  const dayNames: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

  if (isLoading) return <div style={{ display: 'grid', gap: 12 }}><SkeletonCard /><SkeletonCard /></div>;

  return (
    <AdminPage title="Weekend Popup" description="Configure the weekend breakfast buffet popup">

      <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F0EBE3' }}>Popup Settings</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#A09888' }}>
            <input type="checkbox" checked={formData.isEnabled} onChange={e => setFormData({ ...formData, isEnabled: e.target.checked })} />
            Enable Popup
          </label>
        </div>

        <div style={{ background: '#242018', border: '1px solid #3A3428', borderRadius: 8, padding: 14, marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#A09888' }}>
            <strong style={{ color: '#F0EBE3' }}>Note:</strong> Shows on {formData.activeDays.map(d => dayNames[d]).join(', ')} between {formData.startTime}–{formData.endTime}.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#F0EBE3', marginBottom: 6 }}>Active Days</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[6, 0, 1, 2, 3, 4, 5].map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)} style={{
                  padding: '6px 12px', borderRadius: 8,
                  border: formData.activeDays.includes(day) ? '1px solid #C8A04E' : '1px solid #3A3428',
                  background: formData.activeDays.includes(day) ? '#C8A04E' : '#1E1A14',
                  color: formData.activeDays.includes(day) ? '#1A1610' : '#A09888',
                  fontWeight: 500, fontSize: 13, cursor: 'pointer',
                }}>{dayNames[day]}</button>
              ))}
            </div>
          </div>
          <Input label="Start Time" type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
          <Input label="End Time" type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
          <Input label="Adult Price" value={formData.adultPrice} onChange={e => setFormData({ ...formData, adultPrice: e.target.value })} placeholder="R89" />
          <Input label="Kids Price" value={formData.kidsPrice} onChange={e => setFormData({ ...formData, kidsPrice: e.target.value })} placeholder="R45" />
          <div style={{ gridColumn: '1 / -1' }}><Input label="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Weekend Breakfast Buffet" /></div>
          <div style={{ gridColumn: '1 / -1' }}><Textarea label="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Join us this weekend..." /></div>
          <Input label="CTA Text" value={formData.ctaText} onChange={e => setFormData({ ...formData, ctaText: e.target.value })} placeholder="View Menu" />
          <Input label="CTA Link" value={formData.ctaLink} onChange={e => setFormData({ ...formData, ctaLink: e.target.value })} placeholder="/menu" />
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <ImageUpload module="promotions" value={formData.image} onChange={url => setFormData({ ...formData, image: url })} label="Popup Image" />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}><MediaPicker module="promotions" type="campaign_image" value={formData.image} onChange={url => setFormData({ ...formData, image: url })} /></div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Button variant="primary" onClick={handleSave} loading={isSaving}>Save Settings</Button>
        </div>
      </div>
    </AdminPage>
  );
}
