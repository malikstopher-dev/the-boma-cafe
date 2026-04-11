'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cmsService } from '@/lib/client-cms';

interface FooterProps {
  settings?: any;
  branding?: any;
}

export default function Footer({ settings, branding }: FooterProps) {
  const [siteBranding, setSiteBranding] = useState<any>(null);
  const [contactSettings, setContactSettings] = useState<any>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const allSettings = await cmsService.getAllSettings();
        setSiteBranding(allSettings.branding);
        setContactSettings(allSettings.contact);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const b = branding || siteBranding || {};
  const c = settings || contactSettings || {};
  const siteName = b.siteName || 'The Boma Cafe';
  const currentYear = new Date().getFullYear();
  const footerText = (b.footerText || '© {year} The Boma Cafe. All rights reserved.').replace('{year}', currentYear.toString());

  return (
    <footer style={{ background: 'var(--dark-brown)', padding: '4.5rem 5% 2rem', color: 'rgba(255,255,255,0.8)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr', gap: '3rem', paddingBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--white)'
              }}>
                B
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--white)' }}>
                The Boma Cafe
              </h3>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Where the Rustic Meets the Soulful. Escape the city and experience authentic rustic charm in the heart of Sandton.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {b.facebook && (
                <a href={b.facebook} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px',
                  background: 'rgba(255,255,255,0.08)', borderRadius: '10px', color: 'var(--white)', transition: 'all 0.3s ease',
                  textDecoration: 'none'
                }} title="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
              )}
              {b.instagram && (
                <a href={b.instagram} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px',
                  background: 'rgba(255,255,255,0.08)', borderRadius: '10px', color: 'var(--white)', transition: 'all 0.3s ease',
                  textDecoration: 'none'
                }} title="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
              )}
              {b.twitter && (
                <a href={b.twitter} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px',
                  background: 'rgba(255,255,255,0.08)', borderRadius: '10px', color: 'var(--white)', transition: 'all 0.3s ease',
                  textDecoration: 'none'
                }} title="X/Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                </a>
              )}
              {b.tiktok && (
                <a href={b.tiktok} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px',
                  background: 'rgba(255,255,255,0.08)', borderRadius: '10px', color: 'var(--white)', transition: 'all 0.3s ease',
                  textDecoration: 'none'
                }} title="TikTok">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.12.02-2.23-.22-3.18-.79-.87-.5-1.51-1.24-1.91-2.12-.39-.84-.53-1.83-.39-2.76.16-1.11.87-2.08 1.89-2.57.96-.46 2.07-.42 3.02.08.52.27.97.67 1.32 1.18.33-.01.65-.01.98-.02.12-1.52.84-2.91 2.03-3.84.67-.53 1.5-.86 2.38-1.01V.02z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--white)', marginBottom: '1.25rem', fontWeight: 600, letterSpacing: '0.5px' }}>QUICK LINKS</h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {[
                { label: 'Home', href: '/' },
                { label: 'About Us', href: '/about' },
                { label: 'Menu', href: '/menu' },
                { label: 'Events', href: '/events' },
                { label: 'Gallery', href: '/gallery' },
                { label: 'Promotions', href: '/promotions' },
                { label: 'Contact', href: '/contact' },
              ].map(link => (
                <Link key={link.href} href={link.href} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}>{link.label}</Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--white)', marginBottom: '1.25rem', fontWeight: 600, letterSpacing: '0.5px' }}>CONTACT INFO</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <a href={`tel:${c.phone || '0729962212'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--warm)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
                <span style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}>📞</span> 
                <span>{c.phone || '072 996 2212'}</span>
              </a>
              <a href={`mailto:${c.email || 'info@thebomacafe.co.za'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--warm)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
                <span style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}>✉️</span> 
                <span>{c.email || 'info@thebomacafe.co.za'}</span>
              </a>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                <span style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}>📍</span> 
                <span>{c.address || 'Sandton, Johannesburg, South Africa'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                <span style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}>🕐</span> 
                <span>{c.openingHours || 'Mon-Sun: 8:00 AM - 10:00 PM'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', lineHeight: 1.6 }}>© {currentYear} The Boma Cafe. All rights reserved.</p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
            Designed with ♥ by <a href="https://www.stopher-malik.co.za" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--warm)', textDecoration: 'none', fontWeight: 500 }}>Stopher Malik</a>
          </p>
        </div>
      </div>
    </footer>
  );
}