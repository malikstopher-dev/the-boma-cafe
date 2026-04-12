'use client';

import { CSSProperties } from 'react';

interface PremiumHeroProps {
  imageUrl: string;
  badge?: string;
  title: string;
  subtitle?: string;
  minHeight?: string;
}

export default function PremiumHero({ 
  imageUrl, 
  badge, 
  title, 
  subtitle,
  minHeight = '380px'
}: PremiumHeroProps) {
  const heroStyles: CSSProperties = {
    position: 'relative',
    minHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'var(--dark-brown)',
  };

  const backgroundStyles: CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    animation: 'heroZoom 20s ease-in-out infinite alternate',
  };

  const overlayTop: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    background: 'linear-gradient(to bottom, rgba(15, 8, 5, 0.5) 0%, transparent 100%)',
  };

  const overlayBottom: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    background: 'linear-gradient(to top, rgba(10, 5, 3, 0.65) 0%, rgba(20, 12, 8, 0.3) 50%, transparent 100%)',
  };

  const overlayVignette: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at center, transparent 30%, rgba(10, 5, 3, 0.35) 100%)',
  };

  const contentStyles: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    padding: 'var(--space-3xl) 5%',
    maxWidth: '850px',
  };

  return (
    <>
      <style jsx>{`
        @keyframes heroZoom {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.06);
          }
        }
      `}</style>
      <section style={heroStyles}>
        <div style={backgroundStyles} />
        <div style={overlayTop} />
        <div style={overlayBottom} />
        <div style={overlayVignette} />
        <div style={contentStyles}>
          {badge && (
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
              padding: '0.4rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1rem',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            }}>
              {badge}
            </div>
          )}
          <h1 style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
            color: 'var(--white)',
            marginBottom: subtitle ? '1rem' : '0.5rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            lineHeight: 1.15,
            textShadow: '0 3px 25px rgba(0,0,0,0.35)',
            letterSpacing: '-0.5px',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              color: 'rgba(253, 248, 243, 0.92)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              maxWidth: '650px',
              margin: '0 auto',
              lineHeight: 1.65,
              textShadow: '0 2px 15px rgba(0,0,0,0.25)',
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
