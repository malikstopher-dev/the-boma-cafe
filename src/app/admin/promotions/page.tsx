'use client';

import { useState, useEffect } from 'react';
import { cmsService, generateId } from '@/lib/client-cms';

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editPromo, setEditPromo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ title: '', description: '', validFrom: '', validUntil: '', ctaText: '', ctaLink: '', isFeatured: false, isActive: true, displayOnHomepage: false, displayAsPopup: false, displayOnMenu: false, displayOnPromotionsPage: true });

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        const data = await cmsService.getPromotions();
        setPromotions(data);
      } catch (error) {
        console.error('Error loading promotions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPromotions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editPromo) {
        const updated = { ...editPromo, ...formData, updatedAt: new Date().toISOString() };
        await cmsService.savePromotion(updated);
        setPromotions(promotions.map((p: any) => p.id === editPromo.id ? updated : p));
      } else {
        const newPromo = { ...formData, id: generateId(), image: '', order: promotions.length + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const result = await cmsService.savePromotion(newPromo);
        setPromotions([...promotions, result.data]);
      }
      setIsEditing(false);
      setEditPromo(null);
      setFormData({ title: '', description: '', validFrom: '', validUntil: '', ctaText: '', ctaLink: '', isFeatured: false, isActive: true, displayOnHomepage: false, displayAsPopup: false, displayOnMenu: false, displayOnPromotionsPage: true });
    } catch (error) {
      console.error('Error saving promotion:', error);
    }
  };

  const handleEdit = (promo: any) => {
    setEditPromo(promo);
    setFormData({ title: promo.title, description: promo.description, validFrom: promo.validFrom || '', validUntil: promo.validUntil || '', ctaText: promo.ctaText || '', ctaLink: promo.ctaLink || '', isFeatured: promo.isFeatured || false, isActive: promo.isActive !== false, displayOnHomepage: promo.displayOnHomepage || false, displayAsPopup: promo.displayAsPopup || false, displayOnMenu: promo.displayOnMenu || false, displayOnPromotionsPage: promo.displayOnPromotionsPage !== false });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this promotion?')) {
      try {
        await cmsService.deletePromotion(id);
        setPromotions(promotions.filter((p: any) => p.id !== id));
      } catch (error) {
        console.error('Error deleting promotion:', error);
      }
    }
  };

  const toggleActive = async (id: string) => {
    const promo = promotions.find((p: any) => p.id === id);
    if (promo) {
      const updated = { ...promo, isActive: !promo.isActive };
      try {
        await cmsService.savePromotion(updated);
        setPromotions(promotions.map((p: any) => p.id === id ? updated : p));
      } catch (error) {
        console.error('Error toggling active:', error);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Promotions</h1>
          <p style={{ color: 'var(--text-light)' }}>{promotions.length} promotions</p>
        </div>
        <button onClick={() => { setIsEditing(true); setEditPromo(null); const today = new Date().toISOString().split('T')[0]; setFormData({ title: '', description: '', validFrom: today, validUntil: '', ctaText: '', ctaLink: '', isFeatured: false, isActive: true, displayOnHomepage: false, displayAsPopup: false, displayOnMenu: false, displayOnPromotionsPage: true }); }} className="btn btn-primary">+ Add Promotion</button>
      </div>

      {isEditing && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editPromo ? 'Edit Promotion' : 'Add New Promotion'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="text" placeholder="Title *" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', minHeight: '80px' }} />
            <input type="date" value={formData.validFrom} onChange={e => setFormData({...formData, validFrom: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <input type="date" value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <input type="text" placeholder="CTA Text" value={formData.ctaText} onChange={e => setFormData({...formData, ctaText: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <input type="text" placeholder="CTA Link" value={formData.ctaLink} onChange={e => setFormData({...formData, ctaLink: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <div style={{ gridColumn: 'span 2', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} /> Active</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} /> Featured</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.displayOnHomepage} onChange={e => setFormData({...formData, displayOnHomepage: e.target.checked})} /> Homepage</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.displayAsPopup} onChange={e => setFormData({...formData, displayAsPopup: e.target.checked})} /> Popup</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.displayOnPromotionsPage} onChange={e => setFormData({...formData, displayOnPromotionsPage: e.target.checked})} /> Promotions Page</label>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" onClick={() => { setIsEditing(false); setEditPromo(null); }} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {promotions.map((promo: any) => (
          <div key={promo.id} style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--dark-brown)' }}>{promo.title}</h3>
                {promo.isFeatured && <span style={{ background: 'var(--gold)', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem' }}>★ Featured</span>}
                <span style={{ background: promo.isActive ? '#dcfce7' : '#fee2e2', color: promo.isActive ? '#16a34a' : '#dc2626', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem' }}>{promo.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{promo.validFrom} - {promo.validUntil}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleEdit(promo)} style={{ padding: '0.5rem 1rem', background: 'var(--cream)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => handleDelete(promo.id)} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}