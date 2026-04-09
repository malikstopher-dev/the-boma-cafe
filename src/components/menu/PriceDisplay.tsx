'use client';

import styles from './PriceDisplay.module.css';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  size?: 'sm' | 'md' | 'lg';
  showR?: boolean;
}

export default function PriceDisplay({ price, originalPrice, size = 'md', showR = true }: PriceDisplayProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  
  return (
    <div className={`${styles.price} ${styles[size]}`}>
      <span className={hasDiscount ? styles.discounted : ''}>
        {showR && <span className={styles.currency}>R</span>}
        {price.toFixed(0)}
      </span>
      {hasDiscount && (
        <span className={styles.original}>
          R{originalPrice}
        </span>
      )}
    </div>
  );
}