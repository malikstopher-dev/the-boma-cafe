'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AdminPage from '@/components/admin/design-system/AdminPage';
import Button from '@/components/admin/design-system/Button';
import { Input, Textarea, Select } from '@/components/admin/design-system/Input';
import Badge from '@/components/admin/design-system/Badge';
import { SkeletonCard } from '@/components/admin/design-system/Skeleton';
import EmptyState from '@/components/admin/design-system/EmptyState';
import ConfirmDialog from '@/components/admin/design-system/ConfirmDialog';
import { useToast } from '@/components/admin/design-system/Toast';
import { cmsService } from '@/lib/client-cms';
import ImageUpload from '@/components/admin/ImageUpload';

export default function AdminMenu() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { success, error: showError } = useToast();

  const [formData, setFormData] = useState({
    name: '', description: '', price: '', categoryId: '',
    isFeatured: false, isOnPromo: false, promoBadge: '',
    isOutOfStock: false, image: '', isAvailable: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [items, cats] = await Promise.all([
          cmsService.getMenuItems(),
          cmsService.getCategories(),
        ]);
        setMenuItems(items);
        setCategories(cats);
      } catch {
        showError('Failed to load menu data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item: any) => {
      const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || item.category === categoryFilter || item.categoryId === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [menuItems, search, categoryFilter]);

  const activeCategories = categories.filter((c: any) => c.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { showError('Item name is required'); return; }
    setIsSaving(true);
    try {
      const category = categories.find((c: any) => c.name === formData.categoryId || c.id === formData.categoryId);
      const itemData = {
        ...formData,
        price: String(formData.price),
        categoryId: category?.id || formData.categoryId,
        isAvailable: !formData.isOutOfStock,
      };

      if (editItem) {
        const updated = { ...editItem, ...itemData, updatedAt: new Date().toISOString() };
        await cmsService.saveMenuItem(updated);
        setMenuItems(menuItems.map((item: any) => item.id === editItem.id ? updated : item));
        success('Item updated', `${formData.name} has been saved`);
      } else {
        const newItem = {
          ...itemData,
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          order: menuItems.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const result = await cmsService.saveMenuItem(newItem);
        setMenuItems([...menuItems, result?.data || newItem]);
        success('Item created', `${formData.name} has been added`);
      }
      closeForm();
    } catch (err) {
      showError('Failed to save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await cmsService.deleteMenuItem(deleteTarget.id);
      setMenuItems(menuItems.filter((item: any) => item.id !== deleteTarget.id));
      success('Item deleted', `${deleteTarget.name} has been removed`);
    } catch {
      showError('Failed to delete item');
    }
    setDeleteTarget(null);
  };

  const openEdit = (item: any) => {
    const category = categories.find((c: any) => c.id === item.categoryId);
    setEditItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: String(item.price || '').replace('R', ''),
      categoryId: category?.name || item.categoryId || '',
      isFeatured: item.isFeatured || false,
      isOnPromo: item.isOnPromo || false,
      promoBadge: item.promoBadge || '',
      isOutOfStock: !item.isAvailable,
      image: item.image || '',
      isAvailable: item.isAvailable !== false,
    });
    setIsEditing(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setFormData({
      name: '', description: '', price: '',
      categoryId: activeCategories[0]?.id || '',
      isFeatured: false, isOnPromo: false, promoBadge: '',
      isOutOfStock: false, image: '', isAvailable: true,
    });
    setIsEditing(true);
  };

  const closeForm = () => {
    setIsEditing(false);
    setEditItem(null);
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...activeCategories.map((c: any) => ({ value: c.name, label: c.name })),
  ];

  return (
    <AdminPage
      title="Menu Items"
      description={`${menuItems.length} items across ${activeCategories.length} categories`}
      actions={<Button variant="primary" onClick={openAdd}>+ Add Item</Button>}
    >

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div style={{
          background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12,
          padding: 24, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 20 }}>
            {editItem ? 'Edit Item' : 'Add New Item'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <Input label="Item Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Boma Pastry Platter" />
            <Input label="Price (R)" required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="85" />
            <Select label="Category" options={activeCategories.map((c: any) => ({ value: c.name, label: c.name }))} value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} />
            <Input label="Promo Badge" value={formData.promoBadge} onChange={e => setFormData({ ...formData, promoBadge: e.target.value })} placeholder="e.g., Special, New" helperText="Optional badge shown on menu" />
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea label="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe this item..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <ImageUpload module="food" value={formData.image} onChange={url => setFormData({ ...formData, image: url })} label="Item Image" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} />
                Featured
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.isOnPromo} onChange={e => setFormData({ ...formData, isOnPromo: e.target.checked })} />
                On Promo
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.isOutOfStock} onChange={e => setFormData({ ...formData, isOutOfStock: e.target.checked })} />
                Out of Stock
              </label>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
              <Button type="submit" variant="primary" loading={isSaving}>
                {editItem ? 'Save Changes' : 'Add Item'}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Item List */}
      {isLoading ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title={search || categoryFilter ? 'No items match your search' : 'No menu items yet'}
          description={search || categoryFilter ? 'Try adjusting your search or filters' : 'Add your first menu item to get started'}
          action={!search && !categoryFilter ? 'Add Item' : undefined}
          onAction={openAdd}
        />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredItems.map((item: any) => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 16px', background: '#FFFFFF',
              border: '1px solid #E5E7EB', borderRadius: 12,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
            >
              {/* Thumbnail */}
              {item.image ? (
                <img src={item.image} alt={item.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: '#F1F3F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#94A3B8', flexShrink: 0 }}>
                  {item.name?.charAt(0) || '?'}
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  {item.isFeatured && <Badge variant="accent">Featured</Badge>}
                  {item.isOnPromo && item.promoBadge && <Badge variant="warning">{item.promoBadge}</Badge>}
                  {!item.isAvailable && <Badge variant="danger">Out of Stock</Badge>}
                </div>
                <span style={{ fontSize: 13, color: '#94A3B8' }}>
                  {item.category || 'Uncategorized'} · R{item.price}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} style={{ color: '#EF4444' }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminPage>
  );
}
