'use client';

import { useState, useEffect } from 'react';
import AdminPage from '@/components/admin/design-system/AdminPage';
import Button from '@/components/admin/design-system/Button';
import { Input, Textarea } from '@/components/admin/design-system/Input';
import Badge from '@/components/admin/design-system/Badge';
import { SkeletonCard } from '@/components/admin/design-system/Skeleton';
import EmptyState from '@/components/admin/design-system/EmptyState';
import ConfirmDialog from '@/components/admin/design-system/ConfirmDialog';
import { useToast } from '@/components/admin/design-system/Toast';
import { cmsService, generateId } from '@/lib/client-cms';

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true });

  useEffect(() => {
    cmsService.getCategories().then(setCategories).catch(() => showError('Failed to load categories')).finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { showError('Name is required'); return; }
    setIsSaving(true);
    try {
      if (editCategory) {
        const updated = { ...editCategory, ...formData };
        await cmsService.saveCategory(updated);
        setCategories(categories.map((c: any) => c.id === editCategory.id ? updated : c));
        success('Category updated');
      } else {
        const newCat = { ...formData, id: generateId(), order: categories.length + 1 };
        const result = await cmsService.saveCategory(newCat);
        setCategories([...categories, result?.data || newCat]);
        success('Category created');
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
      await cmsService.deleteCategory(deleteTarget.id);
      setCategories(categories.filter((c: any) => c.id !== deleteTarget.id));
      success('Category deleted');
    } catch { showError('Failed to delete'); }
    setDeleteTarget(null);
  };

  const toggleActive = async (cat: any) => {
    const updated = { ...cat, isActive: !cat.isActive };
    try {
      await cmsService.saveCategory(updated);
      setCategories(categories.map((c: any) => c.id === cat.id ? updated : c));
      success(updated.isActive ? 'Category enabled' : 'Category disabled');
    } catch { showError('Failed to update'); }
  };

  const openEdit = (cat: any) => {
    setEditCategory(cat);
    setFormData({ name: cat.name || '', description: cat.description || '', isActive: cat.isActive !== false });
    setIsEditing(true);
  };

  const closeForm = () => { setIsEditing(false); setEditCategory(null); setFormData({ name: '', description: '', isActive: true }); };

  return (
    <AdminPage title="Menu Categories" description={`${categories.length} categories`} actions={<Button variant="primary" onClick={() => { setFormData({ name: '', description: '', isActive: true }); setIsEditing(true); }}>+ Add Category</Button>}>

      {isEditing && (
        <div style={{ background: '#12121A', border: '1px solid #1E1E2A', borderRadius: 12, padding: 24, marginBottom: 24, maxWidth: 480 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F0EDE8', marginBottom: 20 }}>{editCategory ? 'Edit Category' : 'Add Category'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Category Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Flame Grilled" />
            <Textarea label="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description..." />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#8A8694', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} style={{ background: '#0A0A0F', border: '1px solid #2A2A3A', color: '#F0EDE8', borderRadius: 8 }} />
              Active (visible on menu)
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="submit" variant="primary" loading={isSaving}>{editCategory ? 'Save' : 'Add'}</Button>
              <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? <div style={{ display: 'grid', gap: 12 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      : categories.length === 0 ? <EmptyState icon="🗂️" title="No categories yet" description="Create a category to organize your menu items" action="Add Category" onAction={() => { setFormData({ name: '', description: '', isActive: true }); setIsEditing(true); }} />
      : (
        <div style={{ display: 'grid', gap: 8 }}>
          {categories.map((cat: any) => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: '#12121A', border: '1px solid #1E1E2A', borderRadius: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8' }}>{cat.name}</span>
                  <Badge variant={cat.isActive ? 'success' : 'danger'}>{cat.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                {cat.description && <span style={{ fontSize: 13, color: '#5A5666' }}>{cat.description}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(cat)}>{cat.isActive ? 'Disable' : 'Enable'}</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(cat)} style={{ color: '#F87171' }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Category" message={`Delete "${deleteTarget?.name}"? All items in this category will also be deleted.`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </AdminPage>
  );
}
