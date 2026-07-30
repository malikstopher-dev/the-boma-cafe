'use client';

import { useState, useEffect, useRef } from 'react';
import AdminPage from '@/components/admin/design-system/AdminPage';
import Button from '@/components/admin/design-system/Button';
import { Input, Select } from '@/components/admin/design-system/Input';
import Badge from '@/components/admin/design-system/Badge';
import { SkeletonCard } from '@/components/admin/design-system/Skeleton';
import EmptyState from '@/components/admin/design-system/EmptyState';
import ConfirmDialog from '@/components/admin/design-system/ConfirmDialog';
import { useToast } from '@/components/admin/design-system/Toast';
import { cmsService, generateId } from '@/lib/client-cms';
import MediaPicker from '@/components/admin/MediaPicker';
import ImageUpload from '@/components/admin/ImageUpload';

const categories = ['Events', 'Food', 'Venue', 'People', 'Promotions'];
const categoryFolders: Record<string, string> = { 'Events': 'events', 'Food': 'food', 'Venue': 'venue', 'People': 'people', 'Promotions': 'promotions' };

interface LocalImage { name: string; url: string; folder: string }

export default function AdminGallery() {
  const [gallery, setGallery] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState({ type: 'image', url: '', title: '', category: 'Events', isFeatured: false });
  const [activeTab, setActiveTab] = useState<'main' | 'local'>('main');
  const [localCategory, setLocalCategory] = useState('Events');
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError } = useToast();

  useEffect(() => {
    cmsService.getGallery().then(setGallery).catch(() => showError('Failed to load gallery')).finally(() => setIsLoading(false));
    loadLocalImages('Events');
  }, []);

  const loadLocalImages = async (category: string) => {
    const folder = categoryFolders[category];
    try {
      const response = await fetch(`/api/gallery/${folder}`);
      if (response.ok) {
        const data = await response.json();
        setLocalImages(data.images.map((url: string) => ({ name: url.split('/').pop() || '', url, folder })));
      }
    } catch { setLocalImages([]); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const folder = categoryFolders[localCategory];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      try {
        await fetch('/api/upload/gallery', { method: 'POST', body: fd });
      } catch { /* continue */ }
    }
    setIsUploading(false);
    loadLocalImages(localCategory);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url.trim()) { showError('URL is required'); return; }
    setIsSaving(true);
    try {
      if (editItem) {
        const updated = { ...editItem, ...formData };
        await cmsService.saveGalleryItem(updated);
        setGallery(gallery.map((item: any) => item.id === editItem.id ? updated : item));
        success('Item updated');
      } else {
        const newItem = { ...formData, id: generateId(), order: gallery.length + 1 } as any;
        const result = await cmsService.saveGalleryItem(newItem);
        setGallery([...gallery, result?.data || newItem]);
        success('Item added');
      }
      closeForm();
    } catch (err) { showError('Failed to save', err instanceof Error ? err.message : undefined); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await cmsService.deleteGalleryItem(deleteTarget.id);
      setGallery(gallery.filter((item: any) => item.id !== deleteTarget.id));
      success('Item deleted');
    } catch { showError('Failed to delete'); }
    setDeleteTarget(null);
  };

  const toggleFeatured = async (item: any) => {
    const updated = { ...item, isFeatured: !item.isFeatured };
    try {
      await cmsService.saveGalleryItem(updated);
      setGallery(gallery.map((i: any) => i.id === item.id ? updated : i));
      success(updated.isFeatured ? 'Marked as featured' : 'Removed from featured');
    } catch { showError('Failed to update'); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setFormData({ type: item.type || 'image', url: item.url || '', title: item.title || '', category: item.category || 'Events', isFeatured: item.isFeatured || false });
    setIsEditing(true);
  };

  const closeForm = () => { setIsEditing(false); setEditItem(null); setFormData({ type: 'image', url: '', title: '', category: 'Events', isFeatured: false }); };

  const tabs = [
    { key: 'main' as const, label: `Main Gallery (${gallery.length})` },
    { key: 'local' as const, label: 'Local Boards' },
  ];

  return (
    <AdminPage title="Gallery" description={`${gallery.length} items`} actions={<Button variant="primary" onClick={() => { closeForm(); setIsEditing(true); }}>+ Add Item</Button>}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F1F3F7', borderRadius: 10, padding: 4 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === tab.key ? '#FFFFFF' : 'transparent',
            color: activeTab === tab.key ? '#0F172A' : '#94A3B8',
            fontWeight: activeTab === tab.key ? 600 : 500, fontSize: 14, cursor: 'pointer',
            boxShadow: activeTab === tab.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'main' ? (
        <>
          {isEditing && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24, maxWidth: 480 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 20 }}>{editItem ? 'Edit Item' : 'Add Item'}</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Select label="Type" options={[{ value: 'image', label: 'Image' }, { value: 'video', label: 'Video' }]} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <ImageUpload module="gallery" value={formData.url} onChange={url => setFormData({ ...formData, url })} label="Image" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}><MediaPicker module="gallery" type="food_image" value={formData.url} onChange={url => setFormData({ ...formData, url })} /></div>
                </div>
                <Input label="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Optional title" />
                <Select label="Category" options={categories.map(c => ({ value: c, label: c }))} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} />
                  Featured on Homepage
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button type="submit" variant="primary" loading={isSaving}>{editItem ? 'Save' : 'Add'}</Button>
                  <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          : gallery.length === 0 ? <EmptyState icon="🖼️" title="No gallery items" description="Add images or videos to get started" action="Add Item" onAction={() => { closeForm(); setIsEditing(true); }} />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {gallery.map((item: any) => (
                <div key={item.id} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 150, background: item.url ? `url(${item.url}) center/cover` : '#F1F3F7', position: 'relative' }}>
                    {item.isFeatured && <span style={{ position: 'absolute', top: 8, right: 8 }}><Badge variant="accent">★</Badge></span>}
                    {item.type === 'video' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 24 }}>▶</div>}
                  </div>
                  <div style={{ padding: 12 }}>
                    <p style={{ fontWeight: 600, color: '#0F172A', fontSize: 14, marginBottom: 4 }}>{item.title || 'Untitled'}</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>{item.category}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => toggleFeatured(item)}>{item.isFeatured ? 'Unfeature' : 'Feature'}</Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} style={{ color: '#EF4444' }}>Del</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Local Boards Gallery */
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => { setLocalCategory(cat); loadLocalImages(cat); }} style={{
                padding: '6px 14px', borderRadius: 20, border: 'none',
                background: localCategory === cat ? '#0F766E' : '#F1F3F7',
                color: localCategory === cat ? '#FFFFFF' : '#475569',
                fontWeight: 500, fontSize: 13, cursor: 'pointer',
              }}>{cat}</button>
            ))}
          </div>

          <div style={{ background: '#F8F9FB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Upload to {localCategory}</h3>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Upload images to <code style={{ background: '#E5E7EB', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>public/gallery/{categoryFolders[localCategory]}</code></p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} loading={isUploading}>+ Upload Images</Button>
          </div>

          {localImages.length === 0 ? (
            <EmptyState icon="📁" title="No images in this folder" description="Upload some images to get started" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {localImages.map((img, idx) => (
                <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 150, background: `url(${img.url}) center/cover` }} />
                  <div style={{ padding: 10 }}>
                    <p style={{ fontSize: 11, color: '#94A3B8', wordBreak: 'break-all', marginBottom: 8 }}>{img.name}</p>
                    <Button variant="ghost" size="sm" style={{ color: '#EF4444' }} onClick={() => showError('Delete not available in production')}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Gallery Item" message="Are you sure you want to delete this item?" confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </AdminPage>
  );
}
