'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { BUSINESS_INFO } from '@/lib/whatsappConfig';
import styles from './Footer.module.css';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';

interface FooterProps {
  settings?: any;
  branding?: any;
}

const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/people/The-Boma-Cafe/61552775920918/',
  instagram: 'https://www.instagram.com/the_boma_cafe',
  tiktok: 'https://www.tiktok.com/@thebomacafe',
};

export default function Footer({ settings: propSettings, branding: propBranding }: FooterProps) {
  const [fetchedSettings, setFetchedSettings] = useState<any>(null);
  const [fetchedBranding, setFetchedBranding] = useState<any>(null);

  useEffect(() => {
    if (propSettings) return;
    const load = async () => {
      try {
        const res = await fetch('/api/cms/public', { cache: 'no-cache' });
        const data = await res.json();
        if (data?.settings) {
          setFetchedSettings(data.settings);
          setFetchedBranding(data.settings?.branding);
        }
      } catch {}
    };
    load();
  }, [propSettings]);

  const settings = propSettings || fetchedSettings || {};
  const branding = propBranding || fetchedBranding || settings?.branding || {};
  const b = branding;
  const contact = settings?.contact || {};
  const phoneRaw = contact.phone?.replace(/\s/g, '') || BUSINESS_INFO.phoneRaw;
  const phone = contact.phone || BUSINESS_INFO.phone;
  const email = contact.email || BUSINESS_INFO.email;
  const address = contact.address || `${BUSINESS_INFO.address.street}, ${BUSINESS_INFO.address.suburb}, ${BUSINESS_INFO.address.city}, ${BUSINESS_INFO.address.postalCode}`;
  const openingHours = contact.openingHours || 'Open daily: 08:00 AM – Late';

  const currentYear = new Date().getFullYear();
  const footerCredit = `© ${currentYear} The Boma Café. Website by `;
  const footerCreditEnd = ` & `;

  const fbUrl = b.facebook || SOCIAL_LINKS.facebook;
  const igUrl = b.instagram || SOCIAL_LINKS.instagram;
  const tkUrl = b.tiktok || SOCIAL_LINKS.tiktok;

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Desktop Footer - Hidden on Mobile */}
        <div className={styles.desktopFooterContent}>
          <div className={styles.grid}>
          {/* Brand Column */}
          <div className={styles.brand}>
            <img src="/logo.png" alt="The Boma Cafe" className={styles.footerLogo} />
            <h3 className={styles.logoText}>The Boma Cafe</h3>
              <p className={styles.tagline}>
                Where rustic charm meets soulful dining in the heart of Sandton.
              </p>
              <div className={styles.social}>
                <a href={fbUrl} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href={igUrl} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a href={tkUrl} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="TikTok">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.12.02-2.23-.22-3.18-.79-.87-.5-1.51-1.24-1.91-2.12-.39-.84-.53-1.83-.39-2.76.16-1.11.87-2.08 1.89-2.57.96-.46 2.07-.42 3.02.08.52.27.97.67 1.32 1.18.33-.01.65-.01.98-.02.12-1.52.84-2.91 2.03-3.84.67-.53 1.5-.86 2.38-1.01V.02z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className={styles.links}>
              <h4>Quick Links</h4>
              <nav className={styles.nav}>
                {[
                  { label: 'Home', href: '/' },
                  { label: 'About', href: '/about' },
                  { label: 'Menu', href: '/menu' },
                  { label: 'Bar Menu', href: '/bar-menu' },
                  { label: 'Experience', href: '/experience' },
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
                <a href={`tel:+${phoneRaw}`} className={styles.contactItem}>
                  <span className={styles.icon}>📞</span>
                  <span className={styles.contactText}>{phone}</span>
                </a>
                <a href={`mailto:${email}`} className={styles.contactItem}>
                  <span className={styles.icon}>✉️</span>
                  <span className={styles.contactText}>{email}</span>
                </a>
                <div className={styles.contactItem}>
                  <span className={styles.icon}>📍</span>
                  <span className={styles.contactText}>{address}</span>
                </div>
                <div className={styles.contactItem}>
                  <span className={styles.icon}>🕐</span>
                  <span className={styles.contactText}>{openingHours}</span>
                </div>
                <a href={`https://wa.me/${phoneRaw}`} target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
                  <WhatsAppIcon size={18} color="#25D366" />
                  <span className={styles.contactText}>WhatsApp Order</span>
                </a>
              </div>
            </div>
          </div>

          <div className={styles.bottom}>
            <div className={styles.divider}></div>
            <p className={styles.copyright}>{footerCredit}<a href="https://stopher-malik.co.za" target="_blank" rel="noopener noreferrer" className={styles.poweredLink}>Stopher Malik</a>{footerCreditEnd}<a href="https://smk.stopher-malik.co.za" target="_blank" rel="noopener noreferrer" className={styles.poweredLink}>SMK Web Design</a></p>
          </div>
        </div>

        {/* Mobile Footer - Shown Only on Mobile */}
        <div className={styles.mobileFooterContent}>
          <img src="/logo.png" alt="The Boma Cafe" className={styles.footerLogo} />
          <h3 className={styles.mobileBrand}>The Boma Cafe</h3>
          <p className={styles.mobileTagline}>Where rustic charm meets soulful dining in Sandton.</p>

          <div className={styles.mobileContactRow}>
            <a href={`tel:+${phoneRaw}`} className={styles.mobileFooterLink}>Call</a>
            <a href={`mailto:${email}`} className={styles.mobileFooterLink}>Email</a>
            <a href={`https://wa.me/${phoneRaw}`} target="_blank" rel="noopener noreferrer" className={styles.mobileFooterLink}>WhatsApp</a>
          </div>

          <div className={styles.mobileLinksRow}>
            <Link href="/" className={styles.mobileFooterLink}>Home</Link>
            <Link href="/menu" className={styles.mobileFooterLink}>Menu</Link>
            <Link href="/bar-menu" className={styles.mobileFooterLink}>Bar Menu</Link>
            <Link href="/contact" className={styles.mobileFooterLink}>Contact</Link>
          </div>

          <div className={styles.mobileSocialRow}>
            <a href={fbUrl} target="_blank" rel="noopener noreferrer" className={styles.mobileSocialLink} title="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href={igUrl} target="_blank" rel="noopener noreferrer" className={styles.mobileSocialLink} title="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href={tkUrl} target="_blank" rel="noopener noreferrer" className={styles.mobileSocialLink} title="TikTok">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.12.02-2.23-.22-3.18-.79-.87-.5-1.51-1.24-1.91-2.12-.39-.84-.53-1.83-.39-2.76.16-1.11.87-2.08 1.89-2.57.96-.46 2.07-.42 3.02.08.52.27.97.67 1.32 1.18.33-.01.65-.01.98-.02.12-1.52.84-2.91 2.03-3.84.67-.53 1.5-.86 2.38-1.01V.02z"/>
              </svg>
            </a>
          </div>

          <div className={styles.mobileDivider}></div>

          <p className={styles.mobileCopyright}>{footerCredit}<a href="https://stopher-malik.co.za" target="_blank" rel="noopener noreferrer" className={styles.mobileFooterLink}>Stopher Malik</a>{footerCreditEnd}<a href="https://smk.stopher-malik.co.za" target="_blank" rel="noopener noreferrer" className={styles.mobileFooterLink}>SMK Web Design</a></p>
        </div>
      </div>
    </footer>
  );
}
