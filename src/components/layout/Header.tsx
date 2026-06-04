'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/menu', label: 'Menu' },
  { href: '/experience', label: 'Experience' },
  { href: '/events', label: 'Events & Venue Hire' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const rafRef = useRef<number>(0);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 50);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = useMemo(() => NAV_LINKS, []);
  const leftLinks = useMemo(() => NAV_LINKS.slice(0, 4), []);
  const rightLinks = useMemo(() => NAV_LINKS.slice(4), []);

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

          <Link href="/" className={styles.logo} prefetch={false}>
            <Image
              src="/logo.png"
              alt="The Boma Cafe"
              className={styles.logoImg}
              width={120}
              height={72}
              priority
              style={{ height: '72px', width: 'auto' }}
            />
          </Link>

          <div className={styles.navRight}>
            {rightLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </Link>
            ))}
            <div className={styles.icons}>
              <a href="tel:0715921190" className={styles.icon} title="Call Us">
                <i className="fas fa-phone" style={{ fontSize: '0.8rem' }} />
              </a>
              <a href="mailto:info@thebomacafe.co.za" className={styles.icon} title="Email Us">
                <i className="fas fa-envelope" style={{ fontSize: '0.8rem' }} />
              </a>
              <a href="https://maps.app.goo.gl/Xca93TRsznn9GN8K7" target="_blank" rel="noopener noreferrer" className={styles.icon} title="Find Us">
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
              <a href={`tel:0715921190`} className={styles.mobileCtaBtn}>
                <i className="fas fa-phone" />
                <span>Call</span>
              </a>
              <a href="https://wa.me/27729962212" target="_blank" rel="noopener noreferrer" className={styles.mobileCtaBtn}>
                <i className="fab fa-whatsapp" />
                <span>WhatsApp</span>
              </a>
            </div>
            <div className={styles.mobileIcons}>
              <a href="mailto:info@thebomacafe.co.za" className={styles.mobileIcon} title="Email">
                <i className="fas fa-envelope" />
              </a>
              <a href="https://maps.app.goo.gl/Xca93TRsznn9GN8K7" target="_blank" rel="noopener noreferrer" className={styles.mobileIcon} title="Map">
                <i className="fas fa-map-marker-alt" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}