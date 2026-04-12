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
  minHeight = '350px'
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
    animation: 'heroZoom 18s ease-in-out infinite alternate',
  };

  const overlayStyles: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(26,15,10,0.65) 0%, rgba(26,15,10,0.75) 50%, rgba(26,15,10,0.7) 100%)',
  };

  const contentStyles: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    padding: 'var(--space-3xl) 5%',
    maxWidth: '800px',
  };

  return (
    <>
      <style jsx>{`
        @keyframes heroZoom {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.05);
          }
        }
      `}</style>
      <section style={heroStyles}>
        <div style={backgroundStyles} />
        <div style={overlayStyles} />
        <div style={contentStyles}>
          {badge && (
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1rem',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              {badge}
            </div>
          )}
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            color: 'var(--white)',
            marginBottom: subtitle ? '1rem' : 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              color: 'var(--cream)',
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
