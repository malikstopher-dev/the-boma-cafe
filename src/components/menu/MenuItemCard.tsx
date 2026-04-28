'use client';

import { useState, useMemo } from 'react';
import { MenuItem } from '@/types';
import PriceDisplay from './PriceDisplay';
import SizeSelector from './SizeSelector';
import AddOnsBlock from './AddOnsBlock';
import { getMenuItemImage, FALLBACK_IMAGE } from '@/lib/menuImage';
import styles from './MenuItemCard.module.css';

interface MenuItemCardProps {
  item: MenuItem;
  categoryName?: string;
  onAddToCart: (item: MenuItem, selectedSize?: string, selectedAddOns?: string[]) => void;
}

export default function MenuItemCard({ item, categoryName = '', onAddToCart }: MenuItemCardProps) {
  const [selectedSize, setSelectedSize] = useState<string>(
    item.variants?.[0]?.name || ''
  );
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [isAdded, setIsAdded] = useState(false);

  const imageSrc = useMemo((): string => {
    if (item.image && typeof item.image === 'string' && item.image.trim()) {
      return item.image.startsWith('/') ? item.image : `/${item.image}`;
    }
    return getMenuItemImage(item.name || '');
  }, [item.name, item.image]);

  const handleImageError = (e: React.SyntheticEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundImage = `url(${FALLBACK_IMAGE})`;
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
  };

  const handleToggleAddOn = (addOn: string) => {
    setSelectedAddOns(prev => 
      prev.includes(addOn) 
        ? prev.filter(a => a !== addOn)
        : [...prev, addOn]
    );
  };

  const handleAddToCart = () => {
    onAddToCart(item, selectedSize, selectedAddOns);
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
        <div 
          className={styles.image}
          style={{ backgroundImage: `url(${imageSrc})` }}
          onError={handleImageError}
        />
        
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
          <PriceDisplay 
            price={typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0}
            size="md"
          />
          
          <button 
            className={`${styles.addButton} ${isAdded ? styles.added : ''}`}
            onClick={handleAddToCart}
            disabled={isAdded}
          >
            {isAdded ? '✓ Added' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}