'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

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
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      padding: isScrolled ? '0.5rem 5%' : '1rem 5%',
      transition: 'all 0.3s ease',
      background: isScrolled ? 'rgba(26, 15, 10, 0.95)' : 'transparent',
      backdropFilter: isScrolled ? 'blur(10px)' : 'none',
      boxShadow: isScrolled ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '1.8rem', 
              fontWeight: 700, 
              color: '#fff',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>The Boma</span>
            <span style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '1.8rem', 
              fontWeight: 700, 
              color: 'var(--warm)',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>Cafe</span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: '#fff',
                fontWeight: 500,
                fontSize: '0.95rem',
                textDecoration: 'none',
                letterSpacing: '0.5px',
                position: 'relative',
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--warm)'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a 
            href="tel:072 996 2212" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '40px', 
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--warm)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <i className="fas fa-phone" style={{ fontSize: '0.9rem' }} />
          </a>
          <a 
            href="mailto:info@thebomacafe.co.za" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '40px', 
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--warm)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <i className="fas fa-envelope" style={{ fontSize: '0.9rem' }} />
          </a>
          <a 
            href="https://maps.app.goo.gl/Xca93TRsznn9GN8K7" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '40px', 
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--warm)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <i className="fas fa-map-marker-alt" style={{ fontSize: '0.9rem' }} />
          </a>
        </div>
      </div>
    </header>
  );
}