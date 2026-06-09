'use client';

import { useEffect, useState } from 'react';
import { MenuItem } from '@/types';
import { getSuggestedItems } from '@/lib/upsellData';
import styles from './UpsellModal.module.css';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  addedItem: MenuItem | null;
  allMenuItems: MenuItem[];
  onAddToCart: (item: MenuItem, selectedSize?: string, selectedAddOns?: string[]) => void;
  onOpenCart?: () => void;
}

export default function UpsellModal({
  isOpen,
  onClose,
  addedItem,
  allMenuItems,
  onAddToCart,
  onOpenCart
}: UpsellModalProps) {
  const [suggestedItems, setSuggestedItems] = useState<MenuItem[]>([]);
  const [addedItems, setAddedItems] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, string[]>>({});
  const [selectedFlavours, setSelectedFlavours] = useState<Record<string, string>>({});
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (addedItem && isOpen) {
      const suggestions = getSuggestedItems(addedItem.category, allMenuItems);
      setSuggestedItems(suggestions);
      
      const initialSizes: Record<string, string> = {};
      const initialAddOns: Record<string, string[]> = {};
      const initialFlavours: Record<string, string> = {};
      const initialChoices: Record<string, string[]> = {};
      suggestions.forEach(item => {
        if (item.variants && item.variants.length > 0) {
          initialSizes[item.id] = item.variants[0].name;
        }
        if (item.addOns && item.addOns.length > 0) {
          initialAddOns[item.id] = [];
        }
        if (item.flavours && item.flavours.length > 0) {
          initialFlavours[item.id] = item.flavours[0];
        }
        if (item.choices && item.choices.length > 0) {
          initialChoices[item.id] = [];
        }
      });
      setSelectedSizes(initialSizes);
      setSelectedAddOns(initialAddOns);
      setSelectedFlavours(initialFlavours);
      setSelectedChoices(initialChoices);
      setAddedItems([]);
    }
  }, [addedItem, isOpen, allMenuItems]);

  if (!isOpen) return null;

  const handleAddItem = (item: MenuItem) => {
    const size = selectedSizes[item.id];
    const addOns = selectedAddOns[item.id] || [];
    onAddToCart(item, size, addOns);
    setAddedItems(prev => [...prev, item.id]);
    
    setTimeout(() => {
      setAddedItems(prev => prev.filter(id => id !== item.id));
    }, 2000);
  };

  const toggleAddOn = (itemId: string, addOnName: string) => {
    setSelectedAddOns(prev => {
      const current = prev[itemId] || [];
      if (current.includes(addOnName)) {
        return { ...prev, [itemId]: current.filter(a => a !== addOnName) };
      } else {
        return { ...prev, [itemId]: [...current, addOnName] };
      }
    });
  };

  const toggleChoice = (itemId: string, choiceName: string) => {
    setSelectedChoices(prev => {
      const current = prev[itemId] || [];
      if (current.includes(choiceName)) {
        return { ...prev, [itemId]: current.filter(c => c !== choiceName) };
      } else {
        return { ...prev, [itemId]: [...current, choiceName] };
      }
    });
  };

  const calculateItemPrice = (item: MenuItem): number => {
    let price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
    
    if (item.variants && selectedSizes[item.id]) {
      const variant = item.variants.find(v => v.name === selectedSizes[item.id]);
      if (variant) {
        price = typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price;
      }
    }
    
    if (item.addOns) {
      const addOns = selectedAddOns[item.id] || [];
      addOns.forEach(addOnName => {
        const addOn = item.addOns?.find(a => a.name === addOnName);
        if (addOn) {
          price += typeof addOn.price === 'string' ? parseFloat(addOn.price) : (addOn.price || 0);
        }
      });
    }

    if (item.choices) {
      const choices = selectedChoices[item.id] || [];
      choices.forEach(choiceName => {
        for (const group of item.choices || []) {
          const option = group.options?.find(o => o.name === choiceName);
          if (option?.price) {
            price += typeof option.price === 'string' ? parseFloat(option.price) : option.price;
          }
        }
      });
    }
    
    return price;
  };

  const totalUpsellValue = suggestedItems.reduce((sum, item) => {
    if (addedItems.includes(item.id)) return sum;
    return sum + calculateItemPrice(item);
  }, 0);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.header}>
          <div className={styles.checkmark}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2>Added to your order!</h2>
          <p>Would you like to add something extra?</p>
        </div>

        {suggestedItems.length > 0 ? (
          <>
            <div className={styles.suggestions}>
              {suggestedItems.map(item => {
                const isAdded = addedItems.includes(item.id);
                const price = calculateItemPrice(item);

                return (
                  <div key={item.id} className={`${styles.suggestionCard} ${isAdded ? styles.added : ''}`}>
                    <div className={styles.itemImage}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className={styles.placeholder}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 12h8M12 8v8" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.itemInfo}>
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                      
                      {item.flavours && item.flavours.length > 0 && (
                        <div className={styles.flavourOptions}>
                          {item.flavours.map(flavour => (
                            <button
                              key={flavour}
                              className={`${styles.flavourBtn} ${selectedFlavours[item.id] === flavour ? styles.active : ''}`}
                              onClick={() => setSelectedFlavours(prev => ({ ...prev, [item.id]: flavour }))}
                            >
                              {flavour}
                            </button>
                          ))}
                        </div>
                      )}

                      {item.variants && item.variants.length > 0 && (
                        <div className={styles.sizeOptions}>
                          {item.variants.map(variant => (
                            <button
                              key={variant.name}
                              className={`${styles.sizeBtn} ${selectedSizes[item.id] === variant.name ? styles.active : ''}`}
                              onClick={() => setSelectedSizes(prev => ({ ...prev, [item.id]: variant.name }))}
                            >
                              {variant.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {item.choices && item.choices.length > 0 && item.choices.map(group => (
                        <div key={group.groupName} className={styles.choiceGroup}>
                          {group.options && group.options.map(option => (
                            <label key={option.name} className={styles.choiceLabel}>
                              <input
                                type="checkbox"
                                checked={(selectedChoices[item.id] || []).includes(option.name)}
                                onChange={() => toggleChoice(item.id, option.name)}
                              />
                              <span className={styles.choiceLabelText}>{option.name}</span>
                              {option.price && (
                                <span className={styles.choicePrice}>+R{option.price}</span>
                              )}
                            </label>
                          ))}
                        </div>
                      ))}
                      
                      {item.notes && item.notes.length > 0 && (
                        <div className={styles.notes}>
                          {item.notes.map(note => (
                            <span key={note} className={styles.note}>{note}</span>
                          ))}
                        </div>
                      )}
                      
                      {item.addOns && item.addOns.length > 0 && (
                        <div className={styles.addOns}>
                          {item.addOns.slice(0, 3).map(addOn => (
                            <label key={addOn.name} className={styles.addOnLabel}>
                              <input
                                type="checkbox"
                                checked={(selectedAddOns[item.id] || []).includes(addOn.name)}
                                onChange={() => toggleAddOn(item.id, addOn.name)}
                              />
                              <span>{addOn.name}</span>
                              <span className={styles.addOnPrice}>+R{addOn.price}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.itemActions}>
                      <span className={styles.price}>R{price.toFixed(0)}</span>
                      <button
                        className={`${styles.addBtn} ${isAdded ? styles.addedBtn : ''}`}
                        onClick={() => handleAddItem(item)}
                        disabled={isAdded}
                      >
                        {isAdded ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            Added
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.footer}>
              <button className={styles.continueBtn} onClick={onOpenCart || onClose}>
                Continue to Cart
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <p className={styles.skipText}>
                <button onClick={onClose}>No thanks</button>
              </p>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p>No suggestions available for this item.</p>
            <button className={styles.continueBtn} onClick={onOpenCart || onClose}>
              Continue to Cart
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
