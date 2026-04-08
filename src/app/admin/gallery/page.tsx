'use client';

import { useState, useEffect } from 'react';
import { dataService, generateId } from '@/lib/data';

const categories = ['Events', 'Food', 'Venue', 'People', 'Promotions'];

export default function AdminGallery() {
  const [gallery, setGallery] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState({ type: 'image', url: '', title: '', category: 'Events', isFeatured: false });

  useEffect(() => {
    setGallery(dataService.getGallery());
  }, []);

  const saveGallery = (items: any[]) => {
    dataService.saveGallery(items);
    setGallery(items);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      const updated = gallery.map((item: any) => item.id === editItem.id ? { ...item, ...formData } : item);
      saveGallery(updated);
    } else {
      const newItem = { ...formData, id: generateId(), order: gallery.length + 1, createdAt: new Date().toISOString() };
      saveGallery([...gallery, newItem]);
    }
    setIsEditing(false);
    setEditItem(null);
    setFormData({ type: 'image', url: '', title: '', category: 'Events', isFeatured: false });
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setFormData({ type: item.type, url: item.url, title: item.title || '', category: item.category, isFeatured: item.isFeatured });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this item?')) {
      saveGallery(gallery.filter((item: any) => item.id !== id));
    }
  };

  const toggleFeatured = (id: string) => {
    const updated = gallery.map((item: any) => item.id === id ? { ...item, isFeatured: !item.isFeatured } : item);
    saveGallery(updated);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Gallery</h1>
          <p style={{ color: 'var(--text-light)' }}>{gallery.length} items</p>
        </div>
        <button onClick={() => { setIsEditing(true); setEditItem(null); setFormData({ type: 'image', url: '', title: '', category: 'Events', isFeatured: false }); }} className="btn btn-primary">+ Add Item</button>
      </div>

      {isEditing && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editItem ? 'Edit Item' : 'Add New Item'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            <input type="text" placeholder="Image/Video URL *" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <input type="text" placeholder="Title (optional)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} /> Featured on Homepage</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" onClick={() => { setIsEditing(false); setEditItem(null); }} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {gallery.map((item: any) => (
          <div key={item.id} style={{ background: 'var(--white)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ height: '150px', background: item.url ? `url(${item.url}) center/cover` : 'var(--cream)', position: 'relative' }}>
              {item.isFeatured && <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'var(--gold)', padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.7rem' }}>★</span>}
              {item.type === 'video' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', color: 'var(--white)', fontSize: '2rem' }}>▶</div>}
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ fontWeight: 600, color: 'var(--dark-brown)', marginBottom: '0.25rem' }}>{item.title || 'Untitled'}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>{item.category}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => toggleFeatured(item.id)} style={{ padding: '0.25rem 0.5rem', background: 'var(--cream)', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>{item.isFeatured ? 'Unfeature' : 'Feature'}</button>
                <button onClick={() => handleEdit(item)} style={{ padding: '0.25rem 0.5rem', background: 'var(--cream)', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(item.id)} style={{ padding: '0.25rem 0.5rem', background: '#fee2e2', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', color: '#dc2626' }}>Del</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}