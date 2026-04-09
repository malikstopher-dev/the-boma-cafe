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
      padding: '0.75rem 5%',
      transition: 'all 0.3s ease',
      background: isScrolled ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      boxShadow: isScrolled ? '0 2px 20px rgba(0,0,0,0.1)' : 'none',
      borderBottom: isScrolled ? '1px solid rgba(0,0,0,0.05)' : 'none',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Left Side - Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '160px', justifyContent: 'flex-start' }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: 'var(--dark-brown)',
                fontWeight: 500,
                fontSize: '0.9rem',
                textDecoration: 'none',
                letterSpacing: '0.3px',
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--dark-brown)'}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Center - Logo */}
        <Link href="/" style={{ textDecoration: 'none', flex: '1', display: 'flex', justifyContent: 'center' }}>
          <img 
            src="/logo.png" 
            alt="The Boma Cafe" 
            style={{ 
              height: '70px', 
              width: 'auto',
              objectFit: 'contain'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </Link>

        {/* Right Side - Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '160px', justifyContent: 'flex-end' }}>
          <a 
            href="tel:072 996 2212" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '38px', 
              height: '38px',
              borderRadius: '50%',
              background: 'var(--cream)',
              color: 'var(--dark-brown)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--cream)';
              e.currentTarget.style.color = 'var(--dark-brown)';
            }}
          >
            <i className="fas fa-phone" style={{ fontSize: '0.85rem' }} />
          </a>
          <a 
            href="mailto:info@thebomacafe.co.za" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '38px', 
              height: '38px',
              borderRadius: '50%',
              background: 'var(--cream)',
              color: 'var(--dark-brown)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--cream)';
              e.currentTarget.style.color = 'var(--dark-brown)';
            }}
          >
            <i className="fas fa-envelope" style={{ fontSize: '0.85rem' }} />
          </a>
          <a 
            href="https://maps.app.goo.gl/Xca93TRsznn9GN8K7" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '38px', 
              height: '38px',
              borderRadius: '50%',
              background: 'var(--cream)',
              color: 'var(--dark-brown)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--cream)';
              e.currentTarget.style.color = 'var(--dark-brown)';
            }}
          >
            <i className="fas fa-map-marker-alt" style={{ fontSize: '0.85rem' }} />
          </a>
        </div>
      </div>
    </header>
  );
}