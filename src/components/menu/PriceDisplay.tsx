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
      {showR && <span className={styles.currency}>R</span>}
      <span className={styles.amount}>{price}</span>
      {hasDiscount && (
        <span className={styles.originalPrice}>R{originalPrice}</span>
      )}
    </div>
  );
}