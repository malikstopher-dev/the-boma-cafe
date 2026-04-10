'use client';

import { useState, useEffect } from 'react';
import { cmsService, generateId } from '@/lib/client-cms';

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await cmsService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editCategory) {
        const updated = { ...editCategory, ...formData };
        await cmsService.saveCategory(updated);
        setCategories(categories.map((c: any) => c.id === editCategory.id ? updated : c));
      } else {
        const newCat = { ...formData, id: generateId(), order: categories.length + 1 };
        const result = await cmsService.saveCategory(newCat);
        setCategories([...categories, result.data]);
      }
      setIsEditing(false);
      setEditCategory(null);
      setFormData({ name: '', description: '', isActive: true });
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleEdit = (cat: any) => {
    setEditCategory(cat);
    setFormData({ name: cat.name, description: cat.description || '', isActive: cat.isActive !== false });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this category?')) {
      try {
        await cmsService.deleteCategory(id);
        setCategories(categories.filter((c: any) => c.id !== id));
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const toggleActive = async (id: string) => {
    const cat = categories.find((c: any) => c.id === id);
    if (cat) {
      const updated = { ...cat, isActive: !cat.isActive };
      try {
        await cmsService.saveCategory(updated);
        setCategories(categories.map((c: any) => c.id === id ? updated : c));
      } catch (error) {
        console.error('Error toggling category:', error);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Menu Categories</h1>
          <p style={{ color: 'var(--text-light)' }}>{categories.length} categories</p>
        </div>
        <button onClick={() => { setIsEditing(true); setEditCategory(null); setFormData({ name: '', description: '', isActive: true }); }} className="btn btn-primary">+ Add Category</button>
      </div>

      {isEditing && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editCategory ? 'Edit Category' : 'Add New Category'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            <input type="text" placeholder="Category Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', minHeight: '60px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} /> Active</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" onClick={() => { setIsEditing(false); setEditCategory(null); }} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {categories.map((cat: any) => (
          <div key={cat.id} style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--dark-brown)' }}>{cat.name}</h3>
                <span style={{ background: cat.isActive ? '#dcfce7' : '#fee2e2', color: cat.isActive ? '#16a34a' : '#dc2626', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem' }}>{cat.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              {cat.description && <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{cat.description}</p>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => toggleActive(cat.id)} style={{ padding: '0.5rem 1rem', background: 'var(--cream)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{cat.isActive ? 'Disable' : 'Enable'}</button>
              <button onClick={() => handleEdit(cat)} style={{ padding: '0.5rem 1rem', background: 'var(--cream)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => handleDelete(cat.id)} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}