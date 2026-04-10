'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cmsService } from '@/lib/client-cms';

export default function PromotionsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [promotions, setPromotions] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allSettings, promos] = await Promise.all([
          cmsService.getAllSettings(),
          cmsService.getPromotions()
        ]);
        setSettings(allSettings);
        setPromotions(promos);
      } catch (error) {
        console.error('Error loading promotions data:', error);
      }
    };
    loadData();
  }, []);

  const activePromotions = promotions.filter((p: any) => p.isActive);

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
          <h1 style={{ fontSize: '3rem', color: 'var(--white)', marginBottom: '1rem' }}>Special Offers</h1>
          <p style={{ color: 'var(--cream)', maxWidth: '600px', margin: '0 auto' }}>
            Don&apos;t miss out on our latest promotions and deals
          </p>
        </section>

        {/* Featured Promo */}
        <section className="section" style={{ background: 'var(--cream)' }}>
          <div className="container">
            {activePromotions.filter((p: any) => p.isFeatured).map((promo: any) => (
              <div key={promo.id} style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                borderRadius: '24px',
                padding: '4rem',
                textAlign: 'center',
                maxWidth: '900px',
                margin: '0 auto 3rem',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <span style={{
                  background: 'var(--gold)',
                  color: 'var(--dark)',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '25px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: '1rem',
                  display: 'inline-block'
                }}>
                  Featured Offer
                </span>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--white)', marginBottom: '1rem' }}>
                  {promo.title}
                </h2>
                <p style={{ fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                  {promo.description}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <Link href={promo.ctaLink} className="btn" style={{ background: 'var(--white)', color: 'var(--primary)' }}>
                    {promo.ctaText}
                  </Link>
                </div>
                <p style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                  Valid until {new Date(promo.validUntil).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Other Promotions */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <div className="section-header">
              <h2>All Promotions</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
              {activePromotions.filter((p: any) => !p.isFeatured).map((promo: any) => (
                <div key={promo.id} style={{
                  background: 'var(--cream)',
                  borderRadius: '16px',
                  padding: '2rem',
                  borderLeft: '4px solid var(--primary)'
                }}>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--dark-brown)', marginBottom: '0.75rem' }}>
                    {promo.title}
                  </h3>
                  <p style={{ color: 'var(--text)', marginBottom: '1rem' }}>
                    {promo.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                      Valid: {new Date(promo.validFrom).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} - {new Date(promo.validUntil).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </span>
                    <Link href={promo.ctaLink} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {promo.ctaText} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {activePromotions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-light)' }}>
                No active promotions at the moment. Check back soon!
              </div>
            )}
          </div>
        </section>

        {/* Newsletter */}
        <section className="section" style={{ background: 'var(--dark-brown)', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ fontSize: '2rem', color: 'var(--white)', marginBottom: '1rem' }}>Stay Updated</h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2rem' }}>Subscribe to receive exclusive offers and updates</p>
            <form style={{ display: 'flex', gap: '1rem', justifyContent: 'center', maxWidth: '500px', margin: '0 auto' }}>
              <input 
                type="email" 
                placeholder="Your email address" 
                style={{
                  flex: 1,
                  padding: '1rem 1.5rem',
                  borderRadius: '30px',
                  border: 'none',
                  fontSize: '1rem'
                }}
              />
              <button type="submit" className="btn btn-primary">Subscribe</button>
            </form>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}