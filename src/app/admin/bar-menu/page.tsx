'use client';

import { useState, useEffect } from 'react';
import { cmsService } from '@/lib/client-cms';

interface BarDrink {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  isFeatured: boolean;
  image?: string;
}

const defaultDrinks: BarDrink[] = [
  { id: '1', name: 'Boma Sunset', description: 'Aged rum, passion fruit, lime, hint of chilli', price: '125', category: 'Signature Cocktails', isFeatured: true, image: '' },
  { id: '2', name: 'Safari Sour', description: 'Amarula, honey, citrus, vanilla bean', price: '115', category: 'Signature Cocktails', isFeatured: true, image: '' },
  { id: '3', name: 'Thatched Toddy', description: 'Spiced rum, warm spices, fresh ginger', price: '135', category: 'Signature Cocktails', isFeatured: false, image: '' },
  { id: '4', name: 'Garden Spritz', description: 'Gin, elderflower, cucumber, prosecco', price: '110', category: 'Signature Cocktails', isFeatured: false, image: '' },
  { id: '5', name: 'Classic Mojito', description: 'White rum, fresh mint, lime, soda', price: '85', category: 'Classic Cocktails', isFeatured: true, image: '' },
  { id: '6', name: 'Margarita', description: 'Tequila, triple sec, lime juice', price: '90', category: 'Classic Cocktails', isFeatured: false, image: '' },
  { id: '7', name: 'Whiskey Sour', description: 'Whiskey, lemon juice, sugar, egg white', price: '95', category: 'Classic Cocktails', isFeatured: false, image: '' },
  { id: '8', name: 'Old Fashioned', description: 'Bourbon, sugar, angostura bitters', price: '100', category: 'Classic Cocktails', isFeatured: false, image: '' },
  { id: '9', name: 'Virgin Mojito', description: 'Fresh mint, lime, soda water', price: '55', category: 'Non-Alcoholic', isFeatured: false, image: '' },
  { id: '10', name: 'Shirley Temple', description: 'Ginger ale, grenadine, fresh lime', price: '50', category: 'Non-Alcoholic', isFeatured: false, image: '' },
  { id: '11', name: 'Mango Freezo', description: 'Frozen mango, ice, vanilla', price: '65', category: 'Freezos', isFeatured: false, image: '' },
  { id: '12', name: 'Chocolate Freezo', description: 'Chocolate, ice, milk', price: '65', category: 'Freezos', isFeatured: false, image: '' },
  { id: '13', name: 'Strawberry Milkshake', description: 'Fresh strawberries, vanilla ice cream', price: '75', category: 'Milkshakes', isFeatured: true, image: '' },
  { id: '14', name: 'Chocolate Milkshake', description: 'Rich chocolate, ice cream', price: '75', category: 'Milkshakes', isFeatured: false, image: '' },
  { id: '15', name: 'Castle Lager', price: '45', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: '16', name: 'Heineken', price: '50', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: '17', name: 'Savanna Light', price: '45', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: '18', name: 'Redds', price: '40', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: '19', name: 'Strongbow', price: '55', category: 'Ciders', description: '', isFeatured: false, image: '' },
  { id: '20', name: 'Savanna Dry', price: '55', category: 'Ciders', description: '', isFeatured: false, image: '' },
  { id: '21', name: 'House Red', description: 'Glass of our selection', price: '55', category: 'Wine', isFeatured: false, image: '' },
  { id: '22', name: 'House White', description: 'Glass of our selection', price: '55', category: 'Wine', isFeatured: false, image: '' },
  { id: '23', name: 'Prosecco', description: 'Glass of bubbly', price: '75', category: 'Wine', isFeatured: false, image: '' },
  { id: '24', name: 'Coca Cola', price: '30', category: 'Soft Drinks', description: '', isFeatured: false, image: '' },
  { id: '25', name: 'Sprite', price: '30', category: 'Soft Drinks', description: '', isFeatured: false, image: '' },
  { id: '26', name: 'Tonic Water', price: '25', category: 'Mixers', description: '', isFeatured: false, image: '' },
  { id: '27', name: 'Ginger Ale', price: '25', category: 'Mixers', description: '', isFeatured: false, image: '' },
];

export default function AdminBarMenu() {
  const [drinks, setDrinks] = useState<BarDrink[]>(defaultDrinks);
  const [isEditing, setIsEditing] = useState(false);
  const [editDrink, setEditDrink] = useState<BarDrink | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Signature Cocktails',
    isFeatured: false,
    image: ''
  });

  const categories = [
    'Signature Cocktails',
    'Classic Cocktails',
    'Non-Alcoholic',
    'Freezos',
    'Milkshakes',
    'Beers',
    'Ciders',
    'Wine',
    'Soft Drinks',
    'Mixers'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editDrink) {
      setDrinks(drinks.map(d => d.id === editDrink.id ? { ...formData, id: editDrink.id } : d));
    } else {
      setDrinks([...drinks, { ...formData, id: Date.now().toString() }]);
    }
    resetForm();
  };

  const handleEdit = (drink: BarDrink) => {
    setEditDrink(drink);
    setFormData({
      name: drink.name,
      description: drink.description || '',
      price: drink.price,
      category: drink.category,
      isFeatured: drink.isFeatured || false,
      image: drink.image || ''
    });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this drink?')) {
      setDrinks(drinks.filter(d => d.id !== id));
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditDrink(null);
    setFormData({ name: '', description: '', price: '', category: 'Signature Cocktails', isFeatured: false, image: '' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Bar Menu</h1>
          <p style={{ color: 'var(--text-light)' }}>{drinks.length} drinks</p>
        </div>
        <button onClick={() => { resetForm(); setIsEditing(true); }} className="btn btn-primary">
          + Add Drink
        </button>
      </div>

      {isEditing && (
        <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editDrink ? 'Edit Drink' : 'Add New Drink'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Drink Name *"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', minHeight: '60px' }}
            />
            <input
              type="text"
              placeholder="Price *"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
              required
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}
            />
            <select
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={e => setFormData({...formData, isFeatured: e.target.checked})}
              />
              Featured
            </label>
            <input
              type="text"
              placeholder="Image URL (optional)"
              value={formData.image}
              onChange={e => setFormData({...formData, image: e.target.value})}
              style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}
            />
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" onClick={resetForm} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {drinks.map(drink => (
          <div key={drink.id} style={{ background: 'var(--white)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--dark-brown)', fontWeight: 600, margin: 0 }}>{drink.name}</h4>
                {drink.isFeatured && <span style={{ background: 'var(--gold)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>★ Featured</span>}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: 0 }}>{drink.category} • R{drink.price}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleEdit(drink)} style={{ padding: '0.4rem 0.8rem', background: 'var(--cream)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
              <button onClick={() => handleDelete(drink.id)} style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#dc2626', fontSize: '0.8rem' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}