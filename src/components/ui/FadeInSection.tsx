'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';

type AnimationType = 'default' | 'left' | 'right' | 'scale';

interface FadeInSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animationType?: AnimationType;
}

const variants: Record<AnimationType, Variants> = {
  default: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  left: {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
};

export default function FadeInSection({
  children,
  className = '',
  delay = 0,
  animationType = 'default',
}: FadeInSectionProps) {
  const shouldReduce = useReducedMotion();
  const v = variants[animationType];

  if (shouldReduce) {
    return <div className={className} style={{ opacity: 1 }}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={v}
      transition={{
        duration: 0.8,
        delay: delay / 1000,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
