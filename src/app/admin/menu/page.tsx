'use client';

import { useState, useEffect, useRef } from 'react';
import { cmsService, generateId } from '@/lib/client-cms';

export default function AdminMenu() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    isFeatured: false,
    isOnPromo: false,
    promoBadge: '',
    isOutOfStock: false,
    image: '',
    isAvailable: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [items, cats] = await Promise.all([
          cmsService.getMenuItems(),
          cmsService.getCategories()
        ]);
        setMenuItems(items);
        setCategories(cats);
      } catch (error) {
        console.error('Error loading menu data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, image: base64 });
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setFormData({ ...formData, image: '' });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const category = categories.find((c: any) => c.name === formData.categoryId || c.id === formData.categoryId);
      const itemData = {
        ...formData,
        price: String(formData.price),
        categoryId: category?.id || formData.categoryId,
        isAvailable: !formData.isOutOfStock
      };
      
      if (editItem) {
        const updated = { ...editItem, ...itemData, updatedAt: new Date().toISOString() };
        await cmsService.saveMenuItem(updated);
        setMenuItems(menuItems.map((item: any) => item.id === editItem.id ? updated : item));
      } else {
        const newItem = {
          ...itemData,
          id: generateId(),
          order: menuItems.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const result = await cmsService.saveMenuItem(newItem);
        setMenuItems([...menuItems, result.data]);
      }
      setIsEditing(false);
      setEditItem(null);
      setFormData({ name: '', description: '', price: '', categoryId: '', isFeatured: false, isOnPromo: false, promoBadge: '', isOutOfStock: false, image: '', isAvailable: true });
      setImagePreview(null);
    } catch (error) {
      console.error('Error saving menu item:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    const category = categories.find((c: any) => c.id === item.categoryId);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: String(item.price).replace('R', ''),
      categoryId: category?.name || item.categoryId || '',
      isFeatured: item.isFeatured || false,
      isOnPromo: item.isOnPromo || false,
      promoBadge: item.promoBadge || '',
      isOutOfStock: !item.isAvailable,
      image: item.image || '',
      isAvailable: item.isAvailable !== false
    });
    setImagePreview(item.image || null);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this item?')) {
      try {
        await cmsService.deleteMenuItem(id);
        setMenuItems(menuItems.filter((item: any) => item.id !== id));
      } catch (error) {
        console.error('Error deleting menu item:', error);
      }
    }
  };

  const handleAddNew = () => {
    setIsEditing(true);
    setEditItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: categories[0]?.id || '',
      isFeatured: false,
      isOnPromo: false,
      promoBadge: '',
      isOutOfStock: false,
      image: '',
      isAvailable: true
    });
    setImagePreview(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Menu Items</h1>
          <p style={{ color: 'var(--text-light)' }}>{menuItems.length} items</p>
        </div>
        <button onClick={handleAddNew} className="btn btn-primary">+ Add Item</button>
      </div>

      {isEditing && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editItem ? 'Edit Item' : 'Add New Item'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="text" placeholder="Item Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <input type="number" placeholder="Price (R) *" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            
            <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
              {categories.filter((c: any) => c.isActive).map((cat: any) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
            
            <input type="text" placeholder="Promo Badge (e.g., Special, New)" value={formData.promoBadge} onChange={e => setFormData({...formData, promoBadge: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />

            {/* Image Upload */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--dark-brown)' }}>Item Image</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', width: '100%' }}
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>Upload an image (recommended: 400x300px)</p>
                </div>
                {imagePreview && (
                  <div style={{ position: 'relative', width: '120px', height: '90px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={clearImage}
                      style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: 'white', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', minHeight: '80px' }} />
            
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} /> Featured</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isOnPromo} onChange={e => setFormData({...formData, isOnPromo: e.target.checked})} /> On Promo</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isOutOfStock} onChange={e => setFormData({...formData, isOutOfStock: e.target.checked})} /> Out of Stock</label>
            </div>
            
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" onClick={() => { setIsEditing(false); setEditItem(null); setImagePreview(null); }} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {menuItems.map((item: any) => (
          <div key={item.id} style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {item.image ? (
                <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--text-light)' }}>
                  {item.name.charAt(0)}
                </div>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--dark-brown)' }}>{item.name}</h3>
                  {item.isFeatured && <span style={{ background: 'var(--gold)', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem' }}>★ Featured</span>}
                  {item.isOnPromo && item.promoBadge && <span style={{ background: 'var(--fire-orange)', color: 'var(--white)', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem' }}>{item.promoBadge}</span>}
                  {item.isOutOfStock && <span style={{ background: '#dc2626', color: 'var(--white)', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem' }}>Out of Stock</span>}
                </div>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{item.category} • R{item.price}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleEdit(item)} style={{ padding: '0.5rem 1rem', background: 'var(--cream)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => handleDelete(item.id)} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}