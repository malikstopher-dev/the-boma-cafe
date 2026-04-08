'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService } from '@/lib/data';

export default function MenuPage() {
  const [settings, setSettings] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    setSettings(dataService.getSettings());
    setCategories(dataService.getCategories());
    setMenuItems(dataService.getMenuItems());
  }, []);

  const filteredItems = activeCategory === 'All' 
    ? menuItems.filter((item: any) => !item.isOutOfStock)
    : menuItems.filter((item: any) => item.category === activeCategory && !item.isOutOfStock);

  return (
    <>
      <Header />
      <main style={{ paddingTop: '80px' }}>
        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
          padding: '6rem 5%',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '3rem', color: 'var(--white)', marginBottom: '1rem' }}>Our Menu</h1>
          <p style={{ color: 'var(--cream)', maxWidth: '600px', margin: '0 auto' }}>
            Discover our carefully crafted dishes made with love
          </p>
        </section>

        {/* Categories */}
        <section style={{ background: 'var(--cream)', padding: '2rem 5%', position: 'sticky', top: '80px', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto' }}>
            <button
              onClick={() => setActiveCategory('All')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '30px',
                border: 'none',
                background: activeCategory === 'All' ? 'var(--primary)' : 'var(--white)',
                color: activeCategory === 'All' ? 'var(--white)' : 'var(--text)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              All
            </button>
            {categories.filter((c: any) => c.isActive).map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '30px',
                  border: 'none',
                  background: activeCategory === cat.name ? 'var(--primary)' : 'var(--white)',
                  color: activeCategory === cat.name ? 'var(--white)' : 'var(--text)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>

        {/* Menu Items */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '2rem', 
              maxWidth: '1200px', 
              margin: '0 auto' 
            }}>
              {filteredItems.map((item: any) => (
                <div key={item.id} style={{
                  background: 'var(--cream)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform 0.3s ease',
                  position: 'relative'
                }}>
                  {item.isOnPromo && item.promoBadge && (
                    <span style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: 'var(--fire-orange)',
                      color: 'var(--white)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      zIndex: 10
                    }}>
                      {item.promoBadge}
                    </span>
                  )}
                  {item.isFeatured && (
                    <span style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      background: 'var(--gold)',
                      color: 'var(--dark)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      zIndex: 10
                    }}>
                      ★ Featured
                    </span>
                  )}
                  <div style={{
                    height: '200px',
                    background: item.image 
                      ? `url(${item.image}) center/cover` 
                      : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                  }} />
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.3rem', color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>
                      {item.name}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem', minHeight: '40px' }}>
                      {item.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                        R{item.price}
                      </span>
                      {item.category && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', background: 'var(--white)', padding: '0.25rem 0.75rem', borderRadius: '15px' }}>
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <p style={{ color: 'var(--text-light)' }}>No items in this category</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="section" style={{ background: 'var(--dark-brown)', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ fontSize: '2rem', color: 'var(--white)', marginBottom: '1rem' }}>Have a Question?</h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2rem' }}>Contact us for dietary requirements or special requests</p>
            <a href="/contact" className="btn btn-primary">Contact Us</a>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}