'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '@/app/page.module.css';

export default function FadeInSection({ 
  children, 
  className = '', 
  delay = 0, 
  animationType = 'default' 
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number; 
  animationType?: 'default' | 'left' | 'right' | 'scale' 
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const animationClass = animationType === 'left' ? styles.revealLeft :
                         animationType === 'right' ? styles.revealRight :
                         animationType === 'scale' ? styles.revealScale : '';

  return (
    <div
      ref={ref}
      className={`${styles.fadeInSection} ${animationClass} ${isVisible ? styles.visible : ''} ${className}`}
    >
      {children}
    </div>
  );
}
