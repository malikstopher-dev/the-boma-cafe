'use client';

import { MenuSize } from '@/types';
import styles from './SizeSelector.module.css';

interface SizeSelectorProps {
  variants: MenuSize[];
  selectedSize: string;
  onSizeChange: (size: string, price: number) => void;
}

export default function SizeSelector({ variants, selectedSize, onSizeChange }: SizeSelectorProps) {
  if (!variants || variants.length === 0) return null;

  return (
    <div className={styles.container}>
      <span className={styles.label}>Size:</span>
      <div className={styles.sizes}>
        {variants.map((variant) => (
          <button
            key={variant.name}
            className={`${styles.sizeBtn} ${selectedSize === variant.name ? styles.selected : ''}`}
            onClick={() => onSizeChange(variant.name, variant.price)}
            type="button"
          >
            <span className={styles.name}>{variant.name}</span>
            <span className={styles.price}>R{variant.price}</span>
          </button>
        ))}
      </div>
    </div>
  );
}