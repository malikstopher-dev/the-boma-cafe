'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/admin/BackButton';

interface BarCategory {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
}

interface BarItem {
  id: string;
  categoryId: string;
  name: string;
  bottle: number | null;
  singlePrice: number | null;
  glassPrice: number | null;
  shotPrice: number | null;
  price: string | null;
  order: number;
  isAvailable: boolean;
  availableForPickup: boolean;
  isAlcohol: boolean;
}

export default function AdminBarMenu() {
  const [categories, setCategories] = useState<BarCategory[]>([]);
  const [items, setItems] = useState<BarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<BarCategory | null>(null);
  const [editingItem, setEditingItem] = useState<BarItem | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [catForm, setCatForm] = useState({ name: '' });
  const [itemForm, setItemForm] = useState({
    name: '',
    categoryId: '',
    bottle: '',
    singlePrice: '',
    glassPrice: '',
    shotPrice: '',
    price: '',
    isAvailable: true,
    availableForPickup: true,
    isAlcohol: false,
  });

  const loadData = async () => {
    try {
      const res = await fetch('/api/cms/bar');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
      if (data.items) setItems(data.items);
    } catch (err) {
      console.error('Error loading bar menu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetCatForm = () => {
    setCatForm({ name: '' });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const resetItemForm = () => {
    setItemForm({ name: '', categoryId: '', bottle: '', singlePrice: '', glassPrice: '', shotPrice: '', price: '', isAvailable: true, availableForPickup: true, isAlcohol: false });
    setEditingItem(null);
    setShowItemForm(false);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      const payload: any = { name: catForm.name };
      if (editingCategory) {
        payload.id = editingCategory.id;
        payload.order = editingCategory.order;
        payload.isActive = editingCategory.isActive;
      }
      const res = await fetch('/api/cms/bar', {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        resetCatForm();
        loadData();
      } else {
        setSaveError(result.error || 'Failed to save category');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const handleCatDelete = async (id: string) => {
    if (!confirm('Delete this category and all its items?')) return;
    setSaveError(null);
    try {
      const res = await fetch(`/api/cms/bar?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        setSaveError(result.error || 'Failed to delete category');
        return;
      }
      loadData();
    } catch (err) {
      console.error('Error deleting category:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleCatToggle = async (cat: BarCategory) => {
    setSaveError(null);
    try {
      const res = await fetch('/api/cms/bar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cat, isActive: !cat.isActive }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        setSaveError(result.error || 'Failed to update category');
        return;
      }
      loadData();
    } catch (err) {
      console.error('Error toggling category:', err);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      const payload: any = {
        categoryId: itemForm.categoryId,
        name: itemForm.name,
        bottle: itemForm.bottle ? Number(itemForm.bottle) : null,
        singlePrice: itemForm.singlePrice ? Number(itemForm.singlePrice) : null,
        glassPrice: itemForm.glassPrice ? Number(itemForm.glassPrice) : null,
        shotPrice: itemForm.shotPrice ? Number(itemForm.shotPrice) : null,
        price: itemForm.price || null,
        isAvailable: itemForm.isAvailable,
        availableForPickup: itemForm.availableForPickup,
        isAlcohol: itemForm.isAlcohol,
      };
      if (editingItem) {
        payload.id = editingItem.id;
        payload.order = editingItem.order;
      }
      const res = await fetch('/api/cms/bar', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        resetItemForm();
        loadData();
      } else {
        setSaveError(result.error || 'Failed to save drink');
      }
    } catch (err) {
      console.error('Error saving item:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save drink');
    }
  };

  const handleItemDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    setSaveError(null);
    try {
      const res = await fetch(`/api/cms/bar?itemId=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        setSaveError(result.error || 'Failed to delete drink');
        return;
      }
      loadData();
    } catch (err) {
      console.error('Error deleting item:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to delete drink');
    }
  };

  const editCatHandler = (cat: BarCategory) => {
    setEditingCategory(cat);
    setCatForm({ name: cat.name });
    setShowCategoryForm(true);
  };

  const editItemHandler = (item: BarItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      categoryId: item.categoryId,
      bottle: item.bottle?.toString() || '',
      singlePrice: item.singlePrice?.toString() || '',
      glassPrice: item.glassPrice?.toString() || '',
      shotPrice: item.shotPrice?.toString() || '',
      price: item.price || '',
      isAvailable: item.isAvailable,
      availableForPickup: item.availableForPickup !== false,
      isAlcohol: item.isAlcohol === true,
    });
    setShowItemForm(true);
  };

  const inputStyle = { padding: '0.75rem', borderRadius: '8px', border: '1px solid #3A3428', width: '100%', boxSizing: 'border-box' as const, background: '#2A261E', color: '#F0EBE3' };
  const labelStyle = { fontSize: '0.85rem', fontWeight: 600, color: '#F0EBE3', marginBottom: '0.25rem' };
  const formSectionStyle = { background: '#1E1A14', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' };

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  const itemsByCategory = (catId: string) => items.filter(i => i.categoryId === catId).sort((a, b) => a.order - b.order);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <BackButton />
          <h1 style={{ fontSize: '2rem', color: '#F0EBE3' }}>Bar Menu</h1>
          <p style={{ color: '#A09888' }}>{items.length} drinks in {categories.length} categories</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => { resetCatForm(); setShowCategoryForm(true); }} className="btn btn-secondary">+ Category</button>
          <button onClick={() => { resetItemForm(); setShowItemForm(true); }} className="btn btn-primary">+ Drink</button>
        </div>
      </div>

      {saveError && (
        <div style={{ padding: '0.75rem', background: 'rgba(232,84,84,0.15)', color: '#E85454', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {saveError}
        </div>
      )}

      {showCategoryForm && (
        <div style={formSectionStyle}>
          <h3 style={{ marginBottom: '1rem' }}>{editingCategory ? 'Edit Category' : 'New Category'}</h3>
          <form onSubmit={handleCatSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category Name</label>
              <input type="text" value={catForm.name} onChange={e => setCatForm({ name: e.target.value })} required style={inputStyle} />
            </div>
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" onClick={resetCatForm} className="btn btn-ghost">Cancel</button>
          </form>
        </div>
      )}

      {showItemForm && (
        <div style={formSectionStyle}>
          <h3 style={{ marginBottom: '1rem' }}>{editingItem ? 'Edit Drink' : 'New Drink'}</h3>
          <form onSubmit={handleItemSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Drink Name *</label>
              <input type="text" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Category *</label>
              <select value={itemForm.categoryId} onChange={e => setItemForm({...itemForm, categoryId: e.target.value})} required style={inputStyle}>
                <option value="">Select...</option>
                {categories.filter(c => c.isActive).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Text Price (optional, e.g. "Ask server")</label>
              <input type="text" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} style={inputStyle} placeholder="Overrides numeric prices" />
            </div>
            <div>
              <label style={labelStyle}>Bottle Price (R)</label>
              <input type="number" step="0.01" value={itemForm.bottle} onChange={e => setItemForm({...itemForm, bottle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Single Price (R)</label>
              <input type="number" step="0.01" value={itemForm.singlePrice} onChange={e => setItemForm({...itemForm, singlePrice: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Glass Price (R)</label>
              <input type="number" step="0.01" value={itemForm.glassPrice} onChange={e => setItemForm({...itemForm, glassPrice: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Shot Price (R)</label>
              <input type="number" step="0.01" value={itemForm.shotPrice} onChange={e => setItemForm({...itemForm, shotPrice: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="isAvail" checked={itemForm.isAvailable} onChange={e => setItemForm({...itemForm, isAvailable: e.target.checked})} />
              <label htmlFor="isAvail">Available</label>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="availPickup" checked={itemForm.availableForPickup} onChange={e => setItemForm({...itemForm, availableForPickup: e.target.checked})} />
              <label htmlFor="availPickup">Available for Pickup (uncheck to block pickup orders for this item)</label>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="isAlcohol" checked={itemForm.isAlcohol} onChange={e => setItemForm({...itemForm, isAlcohol: e.target.checked})} />
              <label htmlFor="isAlcohol">Alcoholic (dine-in only — shown as "Available for dine-in only", blocked for pickup/delivery)</label>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" onClick={resetItemForm} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {categories.filter(c => c.isActive).map(cat => (
        <div key={cat.id} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#242018', borderRadius: '12px 12px 0 0' }}>
            <div>
              <strong style={{ fontSize: '1.1rem', color: '#F0EBE3' }}>{cat.name}</strong>
              <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#A09888' }}>{itemsByCategory(cat.id).length} items</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={() => editCatHandler(cat)} style={{ padding: '0.3rem 0.6rem', background: '#1E1A14', border: '1px solid #3A3428', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', color: '#F0EBE3' }}>Edit</button>
              <button onClick={() => handleCatDelete(cat.id)} style={{ padding: '0.3rem 0.6rem', background: 'rgba(232,84,84,0.15)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#E85454', fontSize: '0.75rem' }}>Delete</button>
            </div>
          </div>
          <div style={{ background: '#1E1A14', borderRadius: '0 0 12px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {itemsByCategory(cat.id).map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #3A3428', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#F0EBE3', fontSize: '0.95rem' }}>{item.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#A09888', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {item.price && <span>{item.price}</span>}
                    {!item.price && (
                      <>
                        {item.bottle && <span>Bottle R{item.bottle}</span>}
                        {item.singlePrice && <span>Single R{item.singlePrice}</span>}
                        {item.glassPrice && <span>Glass R{item.glassPrice}</span>}
                        {item.shotPrice && <span>Shot R{item.shotPrice}</span>}
                      </>
                    )}
                    {!item.isAvailable && <span style={{ color: '#E85454' }}>● Unavailable</span>}
                    {item.isAlcohol && <span style={{ color: '#f59e0b' }}>🍷 Dine-in only</span>}
                    {!item.availableForPickup && !item.isAlcohol && <span style={{ color: '#C8A04E' }}>● No pickup</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button onClick={() => editItemHandler(item)} style={{ padding: '0.3rem 0.6rem', background: '#242018', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', color: '#F0EBE3' }}>Edit</button>
                  <button onClick={() => handleItemDelete(item.id)} style={{ padding: '0.3rem 0.6rem', background: 'rgba(232,84,84,0.15)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#E85454', fontSize: '0.75rem' }}>Delete</button>
                </div>
              </div>
            ))}
            {itemsByCategory(cat.id).length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#A09888', fontSize: '0.85rem' }}>No drinks in this category</div>
            )}
          </div>
        </div>
      ))}

      {categories.filter(c => !c.isActive).length > 0 && (
        <details style={{ marginTop: '2rem' }}>
          <summary style={{ cursor: 'pointer', color: '#A09888', fontWeight: 600 }}>Hidden Categories ({categories.filter(c => !c.isActive).length})</summary>
          {categories.filter(c => !c.isActive).map(cat => (
            <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#1E1A14', borderRadius: '8px', marginTop: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              <span style={{ color: '#A09888' }}>{cat.name}</span>
              <button onClick={() => handleCatToggle(cat)} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>Show</button>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
