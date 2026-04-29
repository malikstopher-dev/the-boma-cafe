'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cmsService } from '@/lib/client-cms';
import { BUSINESS_INFO } from '@/lib/whatsappConfig';
import styles from './Footer.module.css';

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
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Brand Column */}
          <div className={styles.brand}>
            <h3 className={styles.logoText}>The Boma Cafe</h3>
            <p className={styles.tagline}>
              Where rustic charm meets soulful dining in the heart of Sandton.
            </p>
            <div className={styles.social}>
              {b.facebook && (
                <a href={b.facebook} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
              )}
              {b.instagram && (
                <a href={b.instagram} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
              )}
              {b.twitter && (
                <a href={b.twitter} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="X/Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                </a>
              )}
              {b.tiktok && (
                <a href={b.tiktok} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="TikTok">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.12.02-2.23-.22-3.18-.79-.87-.5-1.51-1.24-1.91-2.12-.39-.84-.53-1.83-.39-2.76.16-1.11.87-2.08 1.89-2.57.96-.46 2.07-.42 3.02.08.52.27.97.67 1.32 1.18.33-.01.65-.01.98-.02.12-1.52.84-2.91 2.03-3.84.67-.53 1.5-.86 2.38-1.01V.02z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className={styles.links}>
            <h4>Quick Links</h4>
            <nav className={styles.nav}>
              {[
                { label: 'Home', href: '/' },
                { label: 'Menu', href: '/menu' },
                { label: 'Experience', href: '/experience' },
                { label: 'Entertainment', href: '/entertainment' },
                { label: 'Events & Venue Hire', href: '/events' },
                { label: 'Gallery', href: '/gallery' },
                { label: 'Contact', href: '/contact' },
              ].filter((link): link is { label: string; href: string } => !!(link && link.href)).map(link => (
                <Link key={link.href} href={link.href} className={styles.navLink}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact Info */}
          <div className={styles.contact}>
            <h4>Contact Info</h4>
            <div className={styles.contactInfo}>
              <a href={`tel:${BUSINESS_INFO.phone}`} className={styles.contactItem}>
                <span className={styles.icon}>📞</span>
                <span className={styles.contactText}>{BUSINESS_INFO.phone}</span>
              </a>
              <a href={`mailto:${BUSINESS_INFO.email}`} className={styles.contactItem}>
                <span className={styles.icon}>✉️</span>
                <span className={styles.contactText}>{BUSINESS_INFO.email}</span>
              </a>
              <div className={styles.contactItem}>
                <span className={styles.icon}>📍</span>
                <span className={styles.contactText}>
                  {BUSINESS_INFO.address.street}
                  <span className={styles.addressDetail}>{BUSINESS_INFO.address.suburb}, {BUSINESS_INFO.address.city}, {BUSINESS_INFO.address.postalCode}</span>
                </span>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.icon}>🕐</span>
                <span className={styles.contactText}>Mon-Sun: 8:00 AM - 10:00 PM</span>
              </div>
              <a href={`https://wa.me/${BUSINESS_INFO.phoneRaw}`} target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
                <span className={styles.icon}>💬</span>
                <span className={styles.contactText}>WhatsApp Order</span>
              </a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <div className={styles.divider}></div>
          <p className={styles.copyright}>{footerText}</p>
          <p className={styles.powered}>
            Designed with ♥ by <a href="https://www.stopher-malik.co.za" target="_blank" rel="noopener noreferrer" className={styles.poweredLink}>Stopher Malik</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
