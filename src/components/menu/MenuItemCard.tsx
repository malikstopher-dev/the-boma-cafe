'use client';

import { useState } from 'react';
import { MenuItem } from '@/types';
import PriceDisplay from './PriceDisplay';
import SizeSelector from './SizeSelector';
import AddOnsBlock from './AddOnsBlock';
import styles from './MenuItemCard.module.css';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, selectedSize?: string, selectedAddOns?: string[]) => void;
}

export default function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [selectedSize, setSelectedSize] = useState<string>(
    item.variants?.[0]?.name || ''
  );
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [isAdded, setIsAdded] = useState(false);

  const hasVariants = item.variants && item.variants.length > 0;
  
  const currentPrice = hasVariants && selectedSize
    ? item.variants.find(v => v.name === selectedSize)?.price || item.variants[0].price
    : (item.price || 0);

  const addOnsTotal = selectedAddOns.reduce((total, addOnName) => {
    const addOn = item.addOns?.find(a => a.name === addOnName);
    return total + (addOn?.price || 0);
  }, 0);

  const totalPrice = currentPrice + addOnsTotal;

  const getPriceDisplay = () => {
    if (hasVariants && item.variants) {
      const prices = item.variants.map(v => v.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min === max) return `R${min}`;
      return `R${min} - R${max}`;
    }
    return null;
  };

  const handleSizeChange = (size: string, price: number) => {
    setSelectedSize(size);
  };

  const handleToggleAddOn = (name: string, price: number) => {
    setSelectedAddOns(prev => 
      prev.includes(name)
        ? prev.filter(a => a !== name)
        : [...prev, name]
    );
  };

  const handleAddToCart = () => {
    onAddToCart(item, selectedSize || undefined, selectedAddOns);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      setSelectedAddOns([]);
      if (item.variants?.[0]) {
        setSelectedSize(item.variants[0].name);
      }
    }, 2000);
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        {item.image ? (
          <div 
            className={styles.image}
            style={{ backgroundImage: `url(${item.image})` }}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>{item.name.charAt(0)}</span>
          </div>
        )}
        
        {item.isOnPromo && item.promoBadge && (
          <span className={styles.badgePromo}>{item.promoBadge}</span>
        )}
        {item.isFeatured && (
          <span className={styles.badgeFeatured}>★ Featured</span>
        )}
        {item.badge && (
          <span className={styles.badgeCustom}>{item.badge}</span>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.name}>{item.name}</h3>
          {item.tags && item.tags.length > 0 && (
            <div className={styles.tags}>
              {item.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        {item.description && (
          <p className={styles.description}>{item.description}</p>
        )}

        {item.notes && item.notes.length > 0 && (
          <div className={styles.notes}>
            {item.notes.map(note => (
              <span key={note} className={styles.note}>• {note}</span>
            ))}
          </div>
        )}

        {item.variants && item.variants.length > 0 && (
          <SizeSelector
            variants={item.variants}
            selectedSize={selectedSize}
            onSizeChange={handleSizeChange}
          />
        )}

        {item.addOns && item.addOns.length > 0 && (
          <AddOnsBlock
            addOns={item.addOns}
            selectedAddOns={selectedAddOns}
            onToggleAddOn={handleToggleAddOn}
          />
        )}

        <div className={styles.footer}>
          <div className={styles.priceWrapper}>
            {hasVariants ? (
              <span className={styles.priceRange}>{getPriceDisplay()}</span>
            ) : (
              <PriceDisplay 
                price={totalPrice} 
                originalPrice={item.isOnPromo ? item.price : undefined}
                size="lg"
              />
            )}
            {addOnsTotal > 0 && !hasVariants && (
              <span className={styles.basePrice}>Base: R{item.price}</span>
            )}
          </div>
          <button
            className={`${styles.addButton} ${isAdded ? styles.added : ''}`}
            onClick={handleAddToCart}
            disabled={item.isOutOfStock}
          >
            <span className={styles.addIcon}>
              {isAdded ? '✓' : '+'}
            </span>
            {isAdded ? 'Added!' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}