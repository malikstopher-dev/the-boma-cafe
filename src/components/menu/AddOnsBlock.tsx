'use client';

import { MenuAddOn } from '@/types';
import styles from './AddOnsBlock.module.css';

interface AddOnsBlockProps {
  addOns: MenuAddOn[];
  selectedAddOns: string[];
  onToggleAddOn: (name: string, price: number) => void;
}

export default function AddOnsBlock({ addOns, selectedAddOns, onToggleAddOn }: AddOnsBlockProps) {
  if (!addOns || addOns.length === 0) return null;

  return (
    <div className={styles.container}>
      <span className={styles.label}>Extras:</span>
      <div className={styles.addOns}>
        {addOns.map((addOn) => (
          <label
            key={addOn.name}
            className={`${styles.addOn} ${selectedAddOns.includes(addOn.name) ? styles.selected : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedAddOns.includes(addOn.name)}
              onChange={() => onToggleAddOn(addOn.name, addOn.price)}
              className={styles.checkbox}
            />
            <span className={styles.name}>{addOn.name}</span>
            <span className={styles.price}>+R{addOn.price}</span>
          </label>
        ))}
      </div>
    </div>
  );
}