'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

interface HeaderProps {
  transparent?: boolean;
}

export default function Header({ transparent = false }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/menu', label: 'Menu' },
    { href: '/events', label: 'Events' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/promotions', label: 'Promotions' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''} ${transparent ? styles.transparent : ''}`}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>The Boma</span>
          <span className={styles.logoAccent}>Cafe</span>
        </Link>

        <nav className={`${styles.nav} ${isMobileMenuOpen ? styles.open : ''}`}>
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className={styles.navLink}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link 
            href="/admin" 
            className={styles.adminLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className={styles.adminIcon}>⚙</span>
          </Link>
        </nav>

        <button 
          className={`${styles.mobileToggle} ${isMobileMenuOpen ? styles.open : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}