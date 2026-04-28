'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cmsService } from '@/lib/client-cms';
import { BUSINESS_INFO } from '@/lib/whatsappConfig';

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
    <footer style={{ 
      background: 'linear-gradient(180deg, var(--beige-dark) 0%, #D9C4A9 100%)', 
      padding: '5rem 5% 2.5rem', 
      color: 'var(--brown-secondary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute',
        top: '-30%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        height: '80%',
        background: 'radial-gradient(ellipse at center top, rgba(201,169,98,0.15) 0%, transparent 60%)',
        pointerEvents: 'none'
      }}></div>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.4fr 1fr 1.4fr', 
          gap: '4rem', 
          paddingBottom: '3rem', 
          borderBottom: '1px solid rgba(107,94,74,0.2)'
        }}>
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 700, color: 'var(--brown-heading)', letterSpacing: '1px' }}>
                The Boma Cafe
              </h3>
            </div>
            <p style={{ color: 'var(--brown-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.7 }}>
              Where the Rustic Meets the Soulful. Escape the city and experience authentic rustic charm in the heart of Sandton.
            </p>
            <div style={{ display: 'flex', gap: '0.875rem' }}>
              {b.facebook && (
                <a href={b.facebook} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px',
                  background: 'rgba(107,94,74,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', color: 'var(--brown-heading)', 
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  textDecoration: 'none', border: '1px solid rgba(107,94,74,0.2)'
                }} 
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(107,94,74,0.25)';
                  e.currentTarget.style.borderColor = 'rgba(107,94,74,0.4)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }} 
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(107,94,74,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(107,94,74,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                title="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
              )}
              {b.instagram && (
                <a href={b.instagram} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px',
                  background: 'rgba(107,94,74,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', color: 'var(--brown-heading)', 
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  textDecoration: 'none', border: '1px solid rgba(107,94,74,0.2)'
                }} 
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(107,94,74,0.25)';
                  e.currentTarget.style.borderColor = 'rgba(107,94,74,0.4)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }} 
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(107,94,74,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(107,94,74,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                title="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
              )}
              {b.twitter && (
                <a href={b.twitter} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px',
                  background: 'rgba(107,94,74,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', color: 'var(--brown-heading)', 
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  textDecoration: 'none', border: '1px solid rgba(107,94,74,0.2)'
                }} 
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(107,94,74,0.25)';
                  e.currentTarget.style.borderColor = 'rgba(107,94,74,0.4)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }} 
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(107,94,74,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(107,94,74,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                title="X/Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                </a>
              )}
              {b.tiktok && (
                <a href={b.tiktok} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px',
                  background: 'rgba(107,94,74,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', color: 'var(--brown-heading)', 
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  textDecoration: 'none', border: '1px solid rgba(107,94,74,0.2)'
                }} 
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(107,94,74,0.25)';
                  e.currentTarget.style.borderColor = 'rgba(107,94,74,0.4)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }} 
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(107,94,74,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(107,94,74,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                title="TikTok">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.12.02-2.23-.22-3.18-.79-.87-.5-1.51-1.24-1.91-2.12-.39-.84-.53-1.83-.39-2.76.16-1.11.87-2.08 1.89-2.57.96-.46 2.07-.42 3.02.08.52.27.97.67 1.32 1.18.33-.01.65-.01.98-.02.12-1.52.84-2.91 2.03-3.84.67-.53 1.5-.86 2.38-1.01V.02z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--brown-heading)', marginBottom: '1.5rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Quick Links</h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                { label: 'Home', href: '/' },
                { label: 'Menu', href: '/menu' },
                { label: 'Experience', href: '/experience' },
                { label: 'Entertainment', href: '/entertainment' },
                { label: 'Events & Venue Hire', href: '/events' },
                { label: 'Gallery', href: '/gallery' },
                { label: 'Contact', href: '/contact' },
              ].filter((link): link is { label: string; href: string } => !!(link && link.href)).map(link => (
                <Link key={link.href} href={link.href} 
                  style={{ color: 'var(--brown-secondary)', textDecoration: 'none', fontSize: '0.925rem', transition: 'all 0.3s ease' }} 
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateX(6px)';
                  }} 
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--brown-secondary)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >{link.label}</Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--brown-heading)', marginBottom: '1.5rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Contact Info</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <a href={`tel:${BUSINESS_INFO.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', color: 'var(--brown-secondary)', textDecoration: 'none', fontSize: '0.925rem', transition: 'color 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--brown-secondary)'}>
                <span style={{ 
                  width: '36px', 
                  height: '36px', 
                  background: 'rgba(107,94,74,0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  border: '1px solid rgba(107,94,74,0.15)'
                }}>📞</span> 
                <span>{BUSINESS_INFO.phone}</span>
              </a>
              <a href={`mailto:${BUSINESS_INFO.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', color: 'var(--brown-secondary)', textDecoration: 'none', fontSize: '0.925rem', transition: 'color 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--brown-secondary)'}>
                <span style={{ 
                  width: '36px', 
                  height: '36px', 
                  background: 'rgba(107,94,74,0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  border: '1px solid rgba(107,94,74,0.15)'
                }}>✉️</span> 
                <span>{BUSINESS_INFO.email}</span>
              </a>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', color: 'var(--brown-secondary)', fontSize: '0.925rem' }}>
                <span style={{ 
                  width: '36px', 
                  height: '36px', 
                  background: 'rgba(107,94,74,0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  border: '1px solid rgba(107,94,74,0.15)'
                }}>📍</span> 
                <div>
                  <div>{BUSINESS_INFO.address.street}</div>
                  <div style={{ opacity: 0.8 }}>{BUSINESS_INFO.address.suburb}, {BUSINESS_INFO.address.city}, {BUSINESS_INFO.address.postalCode}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', color: 'var(--brown-secondary)', fontSize: '0.925rem' }}>
                <span style={{ 
                  width: '36px', 
                  height: '36px', 
                  background: 'rgba(107,94,74,0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  border: '1px solid rgba(107,94,74,0.15)'
                }}>🕐</span> 
                <span>Mon-Sun: 8:00 AM - 10:00 PM</span>
              </div>
              <a 
                href={`https://wa.me/${BUSINESS_INFO.phoneRaw}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', color: 'var(--brown-secondary)', textDecoration: 'none', fontSize: '0.925rem', transition: 'color 0.3s ease' }} 
                onMouseEnter={e => e.currentTarget.style.color = '#25D366'} 
                onMouseLeave={e => e.currentTarget.style.color = 'var(--brown-secondary)'}
              >
                <span style={{ 
                  width: '36px', 
                  height: '36px', 
                  background: 'rgba(37, 211, 102, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  border: '1px solid rgba(37, 211, 102, 0.25)'
                }}>💬</span> 
                <span>WhatsApp Order</span>
              </a>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '2.25rem', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(107,94,74,0.2), transparent)', margin: '0 auto 2rem' }}></div>
          <p style={{ color: 'var(--brown-secondary)', fontSize: '0.8rem', lineHeight: 1.6, opacity: 0.75 }}>© {currentYear} The Boma Cafe. All rights reserved.</p>
          <p style={{ color: 'var(--brown-secondary)', fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.75 }}>
            Designed with ♥ by <a href="https://www.stopher-malik.co.za" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, transition: 'opacity 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Stopher Malik</a>
          </p>
        </div>
      </div>
    </footer>
  );
}