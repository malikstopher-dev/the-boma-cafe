'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    { href: '/experience', label: 'Experience' },
    { href: '/entertainment', label: 'Entertainment' },
    { href: '/events', label: 'Events & Venue Hire' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/contact', label: 'Contact' },
  ];

  const leftLinks = navLinks.slice(0, 4);
  const rightLinks = navLinks.slice(4);

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
              <a href="tel:0729962212" className={styles.icon} title="Call Us">
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
            <div className={styles.mobileIcons}>
              <a href="tel:0729962212" className={styles.mobileIcon} title="Call">
                <i className="fas fa-phone" />
              </a>
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