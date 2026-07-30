'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/admin/design-system/PageHeader';
import Button from '@/components/admin/design-system/Button';
import { Input, Textarea } from '@/components/admin/design-system/Input';
import Badge from '@/components/admin/design-system/Badge';
import { SkeletonCard } from '@/components/admin/design-system/Skeleton';
import EmptyState from '@/components/admin/design-system/EmptyState';
import ConfirmDialog from '@/components/admin/design-system/ConfirmDialog';
import { useToast } from '@/components/admin/design-system/Toast';
import { cmsService, generateId } from '@/lib/client-cms';
import MediaPicker from '@/components/admin/MediaPicker';
import ImageUpload from '@/components/admin/ImageUpload';

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editPromo, setEditPromo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { success, error: showError } = useToast();

  const defaultForm = { title: '', description: '', validFrom: new Date().toISOString().split('T')[0], validUntil: '', ctaText: '', ctaLink: '', image: '', isFeatured: false, isActive: true, displayOnHomepage: false, displayAsPopup: false, displayOnMenu: false, displayOnPromotionsPage: true };
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    cmsService.getPromotions().then(setPromotions).catch(() => showError('Failed to load promotions')).finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { showError('Title is required'); return; }
    setIsSaving(true);
    try {
      if (editPromo) {
        const updated = { ...editPromo, ...formData, updatedAt: new Date().toISOString() };
        await cmsService.savePromotion(updated);
        setPromotions(promotions.map((p: any) => p.id === editPromo.id ? updated : p));
        success('Promotion updated');
      } else {
        const newPromo = { ...formData, id: generateId(), order: promotions.length + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const result = await cmsService.savePromotion(newPromo);
        setPromotions([...promotions, result?.data || newPromo]);
        success('Promotion created');
      }
      closeForm();
    } catch (err) {
      showError('Failed to save', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await cmsService.deletePromotion(deleteTarget.id);
      setPromotions(promotions.filter((p: any) => p.id !== deleteTarget.id));
      success('Promotion deleted');
    } catch { showError('Failed to delete'); }
    setDeleteTarget(null);
  };

  const toggleActive = async (promo: any) => {
    const updated = { ...promo, isActive: !promo.isActive };
    try {
      await cmsService.savePromotion(updated);
      setPromotions(promotions.map((p: any) => p.id === promo.id ? updated : p));
      success(updated.isActive ? 'Promotion activated' : 'Promotion deactivated');
    } catch { showError('Failed to update'); }
  };

  const openEdit = (promo: any) => {
    setEditPromo(promo);
    setFormData({ title: promo.title || '', description: promo.description || '', validFrom: promo.validFrom || '', validUntil: promo.validUntil || '', ctaText: promo.ctaText || '', ctaLink: promo.ctaLink || '', image: promo.image || '', isFeatured: promo.isFeatured || false, isActive: promo.isActive !== false, displayOnHomepage: promo.displayOnHomepage || false, displayAsPopup: promo.displayAsPopup || false, displayOnMenu: promo.displayOnMenu || false, displayOnPromotionsPage: promo.displayOnPromotionsPage !== false });
    setIsEditing(true);
  };

  const closeForm = () => { setIsEditing(false); setEditPromo(null); setFormData(defaultForm); };

  return (
    <div>
      <PageHeader title="Promotions" description={`${promotions.length} promotions`} actions={<Button variant="primary" onClick={() => { setFormData(defaultForm); setIsEditing(true); }}>+ Add Promotion</Button>} />

      {isEditing && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 20 }}>{editPromo ? 'Edit Promotion' : 'Add Promotion'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}><Input label="Title" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Happy Hour Specials" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Textarea label="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe this promotion..." /></div>
            <Input label="Valid From" type="date" value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })} />
            <Input label="Valid Until" type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} />
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <ImageUpload module="promotions" value={formData.image} onChange={url => setFormData({ ...formData, image: url })} label="Promotion Image" />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}><MediaPicker module="promotions" type="campaign_image" value={formData.image} onChange={url => setFormData({ ...formData, image: url })} /></div>
              </div>
            </div>
            <Input label="CTA Text" value={formData.ctaText} onChange={e => setFormData({ ...formData, ctaText: e.target.value })} placeholder="View Menu" />
            <Input label="CTA Link" value={formData.ctaLink} onChange={e => setFormData({ ...formData, ctaLink: e.target.value })} placeholder="/menu" />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {([['isActive', 'Active'], ['isFeatured', 'Featured'], ['displayOnHomepage', 'Homepage'], ['displayAsPopup', 'Popup'], ['displayOnPromotionsPage', 'Promotions Page']] as const).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={(formData as any)[key]} onChange={e => setFormData({ ...formData, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
              <Button type="submit" variant="primary" loading={isSaving}>{editPromo ? 'Save Changes' : 'Add Promotion'}</Button>
              <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? <div style={{ display: 'grid', gap: 12 }}><SkeletonCard /><SkeletonCard /></div>
      : promotions.length === 0 ? <EmptyState icon="🎁" title="No promotions yet" description="Create a promotion to get started" action="Add Promotion" onAction={() => { setFormData(defaultForm); setIsEditing(true); }} />
      : (
        <div style={{ display: 'grid', gap: 8 }}>
          {promotions.map((promo: any) => (
            <div key={promo.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{promo.title}</span>
                  {promo.isFeatured && <Badge variant="accent">Featured</Badge>}
                  <Badge variant={promo.isActive ? 'success' : 'danger'}>{promo.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <span style={{ fontSize: 13, color: '#94A3B8' }}>{promo.validFrom} — {promo.validUntil}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(promo)}>{promo.isActive ? 'Deactivate' : 'Activate'}</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(promo)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(promo)} style={{ color: '#EF4444' }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Promotion" message={`Are you sure you want to delete "${deleteTarget?.title}"?`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
