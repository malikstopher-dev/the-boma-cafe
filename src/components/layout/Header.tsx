'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <>
      <header style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'calc(100% - 40px)',
        maxWidth: '1200px',
        transition: 'all 0.3s ease',
        background: isScrolled ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: isScrolled ? '0 8px 32px rgba(0,0,0,0.12)' : '0 4px 24px rgba(0,0,0,0.08)',
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 2rem',
        }}>
          {/* Left Side - Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            {navLinks.slice(0, 4).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: '#1a140e',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  letterSpacing: '0.3px',
                  transition: 'color 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#8b4513'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#1a140e'}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Center - Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
            <img 
              src="/logo.png" 
              alt="The Boma Cafe" 
              style={{ 
                height: '56px', 
                width: 'auto',
                objectFit: 'contain',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </Link>

          {/* Right Side - Nav + Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            {navLinks.slice(4).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: '#1a140e',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  letterSpacing: '0.3px',
                  transition: 'color 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#8b4513'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#1a140e'}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <a 
                href="tel:072 996 2212" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '36px', 
                  height: '36px',
                  borderRadius: '50%',
                  background: '#faf6f0',
                  color: '#1a140e',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#8b4513';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#faf6f0';
                  e.currentTarget.style.color = '#1a140e';
                }}
              >
                <i className="fas fa-phone" style={{ fontSize: '0.8rem' }} />
              </a>
              <a 
                href="mailto:info@thebomacafe.co.za" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '36px', 
                  height: '36px',
                  borderRadius: '50%',
                  background: '#faf6f0',
                  color: '#1a140e',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#8b4513';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#faf6f0';
                  e.currentTarget.style.color = '#1a140e';
                }}
              >
                <i className="fas fa-envelope" style={{ fontSize: '0.8rem' }} />
              </a>
              <a 
                href="https://maps.app.goo.gl/Xca93TRsznn9GN8K7" 
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '36px', 
                  height: '36px',
                  borderRadius: '50%',
                  background: '#faf6f0',
                  color: '#1a140e',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#8b4513';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#faf6f0';
                  e.currentTarget.style.color = '#1a140e';
                }}
              >
                <i className="fas fa-map-marker-alt" style={{ fontSize: '0.8rem' }} />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Button */}
      <button 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1001,
          background: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
        }}
      >
        <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`} style={{ fontSize: '1.2rem', color: '#1a140e' }} />
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
        }} onClick={() => setMobileMenuOpen(false)}>
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 40px)',
            background: '#fff',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    color: '#1a140e',
                    fontWeight: 500,
                    fontSize: '1rem',
                    textDecoration: 'none',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    transition: 'background 0.2s ease',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}