'use client';

import { useEffect, useRef, useState } from 'react';
import { ReactNode } from 'react';

type AnimationType = 'default' | 'left' | 'right' | 'scale';

interface FadeInSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animationType?: AnimationType;
}

const transformMap: Record<AnimationType, string> = {
  default: 'translateY(40px)',
  left: 'translateX(-50px)',
  right: 'translateX(50px)',
  scale: 'scale(0.95)',
};

const revealedTransform: Record<AnimationType, string> = {
  default: 'translateY(0)',
  left: 'translateX(0)',
  right: 'translateX(0)',
  scale: 'scale(1)',
};

export default function FadeInSection({
  children,
  className = '',
  delay = 0,
  animationType = 'default',
}: FadeInSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    if (mq.matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? revealedTransform[animationType] : transformMap[animationType],
        transition: `opacity 0.8s cubic-bezier(0.25, 0.1, 0.25, 1), transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)`,
        transitionDelay: visible ? `${delay}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
}
