'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { siteSettingsService } from '@/lib/siteSettings';

interface FooterProps {
  settings?: any;
  branding?: any;
}

export default function Footer({ settings, branding }: FooterProps) {
  const [siteBranding, setSiteBranding] = useState<any>(null);
  const [contactSettings, setContactSettings] = useState<any>(null);

  useEffect(() => {
    const siteSettings = siteSettingsService.getSiteSettings();
    setSiteBranding(siteSettings.branding);
    setContactSettings(siteSettings.contact);
  }, []);

  const b = branding || siteBranding || {};
  const c = settings || contactSettings || {};
  const siteName = b.siteName || 'The Boma Cafe';
  const currentYear = new Date().getFullYear();
  const footerText = (b.footerText || '© {year} The Boma Cafe. All rights reserved.').replace('{year}', currentYear.toString());

  return (
    <footer style={{ background: 'var(--dark)', padding: '4rem 5% 2rem', color: 'rgba(255,255,255,0.8)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '3rem', paddingBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--white)', marginBottom: '0.75rem' }}>
              The Boma Cafe
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
              Where the Rustic Meets the Soulful
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {b.facebook && (
                <a href={b.facebook} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                  background: 'rgba(255,255,255,0.1)', borderRadius: '50%', color: 'var(--white)', transition: 'all 0.3s ease'
                }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
              )}
              {b.instagram && (
                <a href={b.instagram} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                  background: 'rgba(255,255,255,0.1)', borderRadius: '50%', color: 'var(--white)', transition: 'all 0.3s ease'
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
              )}
              {b.twitter && (
                <a href={b.twitter} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                  background: 'rgba(255,255,255,0.1)', borderRadius: '50%', color: 'var(--white)', transition: 'all 0.3s ease'
                }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--white)', marginBottom: '1.25rem', fontWeight: 600 }}>Quick Links</h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: 'Home', href: '/' },
                { label: 'About', href: '/about' },
                { label: 'Menu', href: '/menu' },
                { label: 'Events', href: '/events' },
                { label: 'Gallery', href: '/gallery' },
                { label: 'Promotions', href: '/promotions' },
                { label: 'Contact', href: '/contact' },
              ].map(link => (
                <Link key={link.href} href={link.href} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>{link.label}</Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--white)', marginBottom: '1.25rem', fontWeight: 600 }}>Contact Us</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {c.phone && (
                <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  <span>📞</span> {c.phone}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  <span>✉️</span> {c.email}
                </a>
              )}
              {c.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                  <span>📍</span> {c.address}
                </div>
              )}
              {c.openingHours && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                  <span>🕐</span> {c.openingHours}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>© Copyright 2026 TheBomaCafe - All Rights Reserved.</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Website by <a href="https://www.stopher-malik.co.za" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--warm)', textDecoration: 'none' }}>Stopher Malik</a>
          </p>
        </div>
      </div>
    </footer>
  );
}