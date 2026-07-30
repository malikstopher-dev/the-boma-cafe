'use client';

import { useState, useEffect } from 'react';
import AdminPage from '@/components/admin/design-system/AdminPage';
import Button from '@/components/admin/design-system/Button';
import { Input, Textarea } from '@/components/admin/design-system/Input';
import { SkeletonCard } from '@/components/admin/design-system/Skeleton';
import { useToast } from '@/components/admin/design-system/Toast';
import { cmsService } from '@/lib/client-cms';

export default function AdminAnnouncement() {
  const [formData, setFormData] = useState({ text: '', isEnabled: false, link: '', linkText: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    cmsService.getAnnouncement().then(data => {
      setFormData({ text: data.text || '', isEnabled: data.isEnabled || false, link: data.link || '', linkText: data.linkText || '' });
    }).catch(() => showError('Failed to load announcement')).finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try { await cmsService.saveAnnouncement(formData); success('Announcement saved'); }
    catch { showError('Failed to save announcement'); }
    setIsSaving(false);
  };

  if (isLoading) return <div style={{ display: 'grid', gap: 12 }}><SkeletonCard /></div>;

  return (
    <AdminPage title="Announcement Bar" description="Configure the announcement that appears at the top of the website">

      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Settings</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#475569' }}>
            <input type="checkbox" checked={formData.isEnabled} onChange={e => setFormData({ ...formData, isEnabled: e.target.checked })} />
            Enable
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Textarea label="Announcement Text" value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })} placeholder="Enter your announcement text..." />
          <Input label="Link (optional)" value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="/experience" />
          <Input label="Link Text (optional)" value={formData.linkText} onChange={e => setFormData({ ...formData, linkText: e.target.value })} placeholder="Learn more" />
        </div>

        <div style={{ marginTop: 24 }}>
          <Button variant="primary" onClick={handleSave} loading={isSaving}>Save Settings</Button>
        </div>
      </div>
    </AdminPage>
  );
}
