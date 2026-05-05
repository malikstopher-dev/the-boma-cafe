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
  // Beers
  { id: 'beer1', name: 'Corona Extra', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: 'beer2', name: 'Heineken 0.0', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: 'beer3', name: 'Amstel Lager', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: 'beer4', name: 'Castle Lager', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: 'beer5', name: 'Castle Milk Stout', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: 'beer6', name: 'Windhoek Lager', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: 'beer7', name: 'Hansa Pilsener', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: 'beer8', name: 'Black Label', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: 'beer9', name: 'Guinness Draught', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  { id: 'beer10', name: 'Miller Genuine Draft', price: 'Ask server', category: 'Beers', description: '', isFeatured: false, image: '' },
  // Ciders & Coolers
  { id: 'cider1', name: 'Bernini Classic', price: 'Ask server', category: 'Ciders & Coolers', description: '', isFeatured: false, image: '' },
  { id: 'cider2', name: 'Bernini Blush', price: 'Ask server', category: 'Ciders & Coolers', description: '', isFeatured: false, image: '' },
  { id: 'cider3', name: 'Brutal Fruit Spritzer', price: 'Ask server', category: 'Ciders & Coolers', description: '', isFeatured: false, image: '' },
  { id: 'cider4', name: 'Bacardi Breezer Blueberry', price: 'Ask server', category: 'Ciders & Coolers', description: '', isFeatured: false, image: '' },
  { id: 'cider5', name: 'Bacardi Breezer Blackberry', price: 'Ask server', category: 'Ciders & Coolers', description: '', isFeatured: false, image: '' },
  { id: 'cider6', name: 'Savanna', price: 'Ask server', category: 'Ciders & Coolers', description: '', isFeatured: false, image: '' },
  { id: 'cider7', name: 'Hunters Gold', price: 'Ask server', category: 'Ciders & Coolers', description: '', isFeatured: false, image: '' },
  // Gin & Ready-To-Drink
  { id: 'gin1', name: 'Belgravia Gin & Pink Tonic', price: 'Ask server', category: 'Gin & Ready-To-Drink', description: '', isFeatured: false, image: '' },
  { id: 'gin2', name: 'Belgravia Gin & Dark Cherry', price: 'Ask server', category: 'Gin & Ready-To-Drink', description: '', isFeatured: false, image: '' },
  { id: 'gin3', name: 'Belgravia Gin & Tonic', price: 'Ask server', category: 'Gin & Ready-To-Drink', description: '', isFeatured: false, image: '' },
  { id: 'gin4', name: 'Belgravia Gin & Passion', price: 'Ask server', category: 'Gin & Ready-To-Drink', description: '', isFeatured: false, image: '' },
  { id: 'gin5', name: "Gordon's Gin", price: 'Ask server', category: 'Gin & Ready-To-Drink', description: '', isFeatured: false, image: '' },
  { id: 'gin6', name: 'Beefeater London Pink Strawberry Gin', price: 'Ask server', category: 'Gin & Ready-To-Drink', description: '', isFeatured: false, image: '' },
  { id: 'gin7', name: 'Beefeater London Dry Gin', price: 'Ask server', category: 'Gin & Ready-To-Drink', description: '', isFeatured: false, image: '' },
  // Spirits
  { id: 'spirit1', name: "Jack Daniel's Tennessee Whiskey", price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit2', name: 'J&B Whisky', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit3', name: 'Klipdrift', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit4', name: 'Richelieu', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit5', name: 'KWV 3 Year', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit6', name: 'KWV 5 Year', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit7', name: 'KWV 10', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit8', name: 'Bacardi Carta Blanca', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit9', name: 'Captain Morgan', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit10', name: 'Skyy Vodka', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit11', name: 'Smirnoff', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit12', name: 'Amarula', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit13', name: 'Kahlúa Coffee Liqueur', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit14', name: 'Aperol', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit15', name: 'Malibu', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit16', name: 'Monate', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  { id: 'spirit17', name: 'Tipo Tinto Spiced', price: 'Ask server', category: 'Spirits', description: '', isFeatured: false, image: '' },
  // Wines
  { id: 'wine1', name: 'Spier', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine2', name: 'Alto Rouge', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine3', name: 'Guardian Peak', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine4', name: 'VRL / Van Loveren', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine5', name: 'Merlot', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine6', name: 'Pinotage', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine7', name: 'Sauvignon Blanc', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine8', name: 'Chenin Blanc', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine9', name: 'Chardonnay', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine10', name: 'Rosé', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine11', name: 'Nederburg', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine12', name: 'The Beach House', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine13', name: 'Optima', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  { id: 'wine14', name: 'PepperWind Syrah', price: 'Ask server', category: 'Wines', description: '', isFeatured: false, image: '' },
  // Sparkling & MCC
  { id: 'spark1', name: 'Krone', price: 'Ask server', category: 'Sparkling & MCC', description: '', isFeatured: false, image: '' },
  { id: 'spark2', name: 'Moët & Chandon', price: 'Ask server', category: 'Sparkling & MCC', description: '', isFeatured: false, image: '' },
  { id: 'spark3', name: 'Graham Beck', price: 'Ask server', category: 'Sparkling & MCC', description: '', isFeatured: false, image: '' },
  { id: 'spark4', name: 'Sparkling Rosé', price: 'Ask server', category: 'Sparkling & MCC', description: '', isFeatured: false, image: '' },
  { id: 'spark5', name: 'Assorted MCC / Sparkling Wine', price: 'Ask server', category: 'Sparkling & MCC', description: '', isFeatured: false, image: '' },
  // Soft Drinks & Mixers
  { id: 'soft1', name: 'Sprite', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
  { id: 'soft2', name: 'Sparletta Creme Soda', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
  { id: 'soft3', name: 'Schweppes / Mixers', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
  { id: 'soft4', name: 'Valpré Water', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
  { id: 'soft5', name: 'Still Water', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
  { id: 'soft6', name: 'Liqui Fruit', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
  { id: 'soft7', name: 'Tropika', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
  { id: 'soft8', name: 'Appletiser', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
  { id: 'soft9', name: 'Red Bull / Energy Drinks', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
  { id: 'soft10', name: 'Juice Dispensers / House Juice', price: 'Ask server', category: 'Soft Drinks & Mixers', description: '', isFeatured: false, image: '' },
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
    'Ciders & Coolers',
    'Gin & Ready-To-Drink',
    'Spirits',
    'Wines',
    'Sparkling & MCC',
    'Soft Drinks & Mixers'
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
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: 0 }}>{drink.category} • {drink.price === 'Ask server' ? 'Ask server' : `R${drink.price}`}</p>
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