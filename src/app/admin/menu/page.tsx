'use client';

import { useState, useEffect } from 'react';
import { dataService, generateId } from '@/lib/data';

export default function AdminMenu() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', category: '', isFeatured: false, isOnPromo: false, promoBadge: '', isOutOfStock: false });

  useEffect(() => {
    setMenuItems(dataService.getMenuItems());
    setCategories(dataService.getCategories());
  }, []);

  const saveItems = (items: any[]) => {
    dataService.saveMenuItems(items);
    setMenuItems(items);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      const updated = menuItems.map((item: any) => item.id === editItem.id ? { ...item, ...formData, price: Number(formData.price), updatedAt: new Date().toISOString() } : item);
      saveItems(updated);
    } else {
      const newItem = { ...formData, price: Number(formData.price), id: generateId(), showOnHomepage: false, order: menuItems.length + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      saveItems([...menuItems, newItem]);
    }
    setIsEditing(false);
    setEditItem(null);
    setFormData({ name: '', description: '', price: '', category: '', isFeatured: false, isOnPromo: false, promoBadge: '', isOutOfStock: false });
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setFormData({ name: item.name, description: item.description, price: String(item.price), category: item.category, isFeatured: item.isFeatured, isOnPromo: item.isOnPromo, promoBadge: item.promoBadge || '', isOutOfStock: item.isOutOfStock });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this item?')) {
      saveItems(menuItems.filter((item: any) => item.id !== id));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Menu Items</h1>
          <p style={{ color: 'var(--text-light)' }}>{menuItems.length} items</p>
        </div>
        <button onClick={() => { setIsEditing(true); setEditItem(null); setFormData({ name: '', description: '', price: '', category: categories[0]?.name || '', isFeatured: false, isOnPromo: false, promoBadge: '', isOutOfStock: false }); }} className="btn btn-primary">+ Add Item</button>
      </div>

      {isEditing && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editItem ? 'Edit Item' : 'Add New Item'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="text" placeholder="Item Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <input type="number" placeholder="Price (R) *" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
              {categories.filter((c: any) => c.isActive).map((cat: any) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
            <input type="text" placeholder="Promo Badge (e.g., Special, New)" value={formData.promoBadge} onChange={e => setFormData({...formData, promoBadge: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', minHeight: '80px' }} />
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} /> Featured</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isOnPromo} onChange={e => setFormData({...formData, isOnPromo: e.target.checked})} /> On Promo</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isOutOfStock} onChange={e => setFormData({...formData, isOutOfStock: e.target.checked})} /> Out of Stock</label>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" onClick={() => { setIsEditing(false); setEditItem(null); }} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {menuItems.map((item: any) => (
          <div key={item.id} style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--dark-brown)' }}>{item.name}</h3>
                {item.isFeatured && <span style={{ background: 'var(--gold)', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem' }}>★ Featured</span>}
                {item.isOnPromo && item.promoBadge && <span style={{ background: 'var(--fire-orange)', color: 'var(--white)', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem' }}>{item.promoBadge}</span>}
                {item.isOutOfStock && <span style={{ background: '#dc2626', color: 'var(--white)', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem' }}>Out of Stock</span>}
              </div>
              <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{item.category} • R{item.price}</p>
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