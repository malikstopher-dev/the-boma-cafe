'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { BUSINESS_INFO } from '@/lib/whatsappConfig';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/cms/public', { cache: 'no-cache' });
        const data = await res.json();
        if (data?.settings) setSettings(data.settings);
      } catch {}
    };
    load();
  }, []);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/menu', label: 'Menu' },
    { href: '/bar-menu', label: 'Bar Menu' },
    { href: '/experience', label: 'Experience' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/contact', label: 'Contact' },
  ];

  const leftLinks = navLinks.slice(0, 4);
  const rightLinks = navLinks.slice(4);

  const contact = settings?.contact || {};
  const phoneRaw = contact.phone?.replace(/\s/g, '') || BUSINESS_INFO.phoneRaw;
  const email = contact.email || 'info@thebomacafe.co.za';
  const mapUrl = contact.mapEmbedUrl ? `https://www.google.com/maps/embed?pb=${contact.mapEmbedUrl}` : 'https://maps.app.goo.gl/Xca93TRsznn9GN8K7';

  return (
    <>
      <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.container}>
          <nav className={styles.navLeft}>
            {leftLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </Link>
            ))}
          </nav>

          <Link href="/" className={styles.logo}>
            <img 
              src="/logo.png" 
              alt="The Boma Cafe" 
              className={styles.logoImg}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </Link>

          <div className={styles.navRight}>
            {rightLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </Link>
            ))}
            <div className={styles.icons}>
              <a href={`tel:${phoneRaw}`} className={styles.icon} title="Call Us">
                <i className="fas fa-phone" style={{ fontSize: '0.8rem' }} />
              </a>
              <a href={`mailto:${email}`} className={styles.icon} title="Email Us">
                <i className="fas fa-envelope" style={{ fontSize: '0.8rem' }} />
              </a>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={styles.icon} title="Find Us">
                <i className="fas fa-map-marker-alt" style={{ fontSize: '0.8rem' }} />
              </a>
            </div>
          </div>
        </div>
      </header>

      <button 
        className={styles.mobileToggle}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} ${styles.toggleIcon}`} />
      </button>

      {mobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.mobileMenu} onClick={e => e.stopPropagation()}>
            <nav className={styles.mobileNav}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={styles.mobileNavLink}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className={styles.mobileCtaRow}>
              <a href={`tel:${phoneRaw}`} className={styles.mobileCtaBtn}>
                <i className="fas fa-phone" />
                <span>Call</span>
              </a>
              <a href={`https://wa.me/${phoneRaw}`} target="_blank" rel="noopener noreferrer" className={styles.mobileCtaBtn}>
                <WhatsAppIcon size={20} ariaLabel="Chat on WhatsApp" />
                <span>WhatsApp</span>
              </a>
            </div>
            <div className={styles.mobileIcons}>
              <a href={`mailto:${email}`} className={styles.mobileIcon} title="Email">
                <i className="fas fa-envelope" />
              </a>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={styles.mobileIcon} title="Map">
                <i className="fas fa-map-marker-alt" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
