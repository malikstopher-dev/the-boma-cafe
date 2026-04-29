'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/lib/cart';
import { MenuItem, MenuCategory } from '@/types';
import { defaultCategories, defaultMenuItems } from '@/data/defaultData';
import {
  hasSizes,
  hasAddOns,
  needsCustomization,
  formatStartingPrice,
  calculateItemTotal,
  calculateAddOnsTotal,
  getDefaultSize,
  formatTotalPrice
} from '@/lib/menuPricing';
import UpsellModal from '@/components/ui/UpsellModal';
import PremiumHero from '@/components/ui/PremiumHero';
import { getMenuItemImage } from '@/lib/menuImage';
import styles from './Menu.module.css';

const DRINK_CATEGORIES = [
  'Cold Beverages',
  'Hot Beverages',
  'Milkshakes',
  'Classic Cocktails',
  'Non-Alcoholic Cocktails',
  'Soft Drinks',
  'Juices',
  'DRNK',
  'Freezos',
  'Smoothies',
  'Mocktails',
];

const HOT_DRINK_CATEGORIES = [
  'Hot Beverages',
];

const DESSERT_CATEGORIES = [
  'Desserts',
];

function getSpecialInstructionsPlaceholder(category?: string): string {
  if (!category) {
    return 'Any special requests or notes?';
  }
  
  if (HOT_DRINK_CATEGORIES.some(c => category.toLowerCase().includes(c.toLowerCase()))) {
    return 'Any preferences or notes? (e.g. no sugar, extra hot, less foam)';
  }
  
  if (DRINK_CATEGORIES.some(c => category.toLowerCase().includes(c.toLowerCase()))) {
    return 'Any preferences or notes? (e.g. less ice, no ice, extra cold)';
  }
  
  if (DESSERT_CATEGORIES.some(c => category.toLowerCase().includes(c.toLowerCase()))) {
    return 'Any preferences or notes? (e.g. extra chocolate sauce, no cream)';
  }
  
  return 'Any allergies or special requests? (e.g. no onions, extra sauce)';
}

interface OptionModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, selectedSize?: string, selectedAddOns?: string[], notes?: string) => void;
}

function OptionModal({ item, isOpen, onClose, onAddToCart }: OptionModalProps) {
  const defaultSize = item.variants?.[0]?.name || '';
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const totalPrice = calculateItemTotal(item, selectedSize, selectedAddOns);
  const itemHasSizes = hasSizes(item);
  const itemHasAddOns = hasAddOns(item);

  const handleToggleAddOn = (name: string) => {
    setSelectedAddOns(prev => 
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const handleAdd = () => {
    onAddToCart(item, selectedSize || undefined, selectedAddOns, notes || undefined);
    onClose();
    setSelectedAddOns([]);
    setNotes('');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{item.name}</h2>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {item.description && (
            <p className={styles.modalDescription}>{item.description}</p>
          )}

          {itemHasSizes && (
            <div className={styles.optionGroup}>
              <h3 className={styles.optionGroupTitle}>
                Size <span className={styles.optionGroupRequired}>*</span>
              </h3>
              <div className={styles.optionGroupOptions}>
                {item.variants!.map((variant) => (
                  <button
                    key={variant.name}
                    className={`${styles.optionSelect} ${selectedSize === variant.name ? styles.selected : ''}`}
                    onClick={() => setSelectedSize(variant.name)}
                  >
                    <div className={styles.optionSelectInfo}>
                      <div className={styles.optionSelectRadio}>
                        <div className={styles.optionSelectRadioInner} />
                      </div>
                      <span className={styles.optionSelectName}>{variant.name}</span>
                    </div>
                    <span className={styles.optionSelectPrice}>R{variant.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {itemHasAddOns && (
            <div className={styles.optionGroup}>
              <h3 className={styles.optionGroupTitle}>Extras</h3>
              <div className={styles.optionGroupOptions}>
                {item.addOns!.map((addOn) => (
                  <button
                    key={addOn.name}
                    className={`${styles.checkboxOption} ${selectedAddOns.includes(addOn.name) ? styles.selected : ''}`}
                    onClick={() => handleToggleAddOn(addOn.name)}
                  >
                    <div className={styles.checkboxOptionLeft}>
                      <div className={styles.checkboxBox}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className={styles.checkboxLabel}>{addOn.name}</span>
                    </div>
                    <span className={styles.checkboxPrice}>+R{addOn.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.optionGroup}>
            <h3 className={styles.optionGroupTitle}>Special Instructions</h3>
            <textarea
              className={styles.notesTextarea}
              placeholder={getSpecialInstructionsPlaceholder(item.category)}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.modalTotal}>
            <div className={styles.modalTotalLabel}>Total</div>
            <div className={styles.modalTotalPrice}>{formatTotalPrice(totalPrice)}</div>
          </div>
          <button className={styles.modalAddButton} onClick={handleAdd}>
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('BAR MENU');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const [menuItems, setMenuItems] = useState<any[]>(defaultMenuItems);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<MenuItem | null>(null);
  const { addItem, items: cartItems, total } = useCart();

  // Use default data directly - skip CMS for now since field mapping issues exist
  // The admin can still edit via admin panel which saves to CMS

  const { sections } = useMemo(() => {
    const cats = categories.filter((c: any) => c.isActive).sort((a: any, b: any) => a.order - b.order);
    const secs = cats.map((cat: any) => {
      const items = menuItems
        .filter((item: any) => item.category === cat.name && item.isOutOfStock !== true)
        .sort((a: any, b: any) => a.order - b.order);
      return { id: cat.id, name: cat.name, description: cat.description, items };
    }).filter((s: any) => s.items.length > 0);
    return { sections: secs };
  }, [categories, menuItems]);

  const filteredSections = useMemo(() => {
    let filtered = activeCategory === 'All' ? sections : sections.filter(s => s.name === activeCategory);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.map(section => ({
        ...section,
        items: section.items.filter(item => 
          item.name.toLowerCase().includes(query) || 
          item.description?.toLowerCase().includes(query)
        )
      })).filter(section => section.items.length > 0);
    }
    
    return filtered;
  }, [sections, activeCategory, searchQuery]);

  const handleAddToCart = (item: MenuItem, selectedSize?: string, selectedAddOns?: string[], notes?: string) => {
    const finalPrice = calculateItemTotal(item, selectedSize, selectedAddOns);
    const sizeDisplay = selectedSize ? ` (${selectedSize})` : '';
    const addOnsDisplay = (selectedAddOns?.length || 0) > 0 ? ` + ${selectedAddOns.join(', ')}` : '';
    
    addItem({
      id: `${item.id}${selectedSize ? `-${selectedSize.replace(/\s/g, '')}` : ''}${(selectedAddOns?.length || 0) > 0 ? `-${selectedAddOns.length}extras` : ''}-${Date.now()}`,
      name: `${item.name}${sizeDisplay}${addOnsDisplay}`,
      price: finalPrice,
      quantity: 1,
      category: item.category,
      selectedSize,
      selectedAddOns,
      notes
    });

    setLastAddedItem(item);
    setShowUpsellModal(true);
  };

  const handleUpsellAddToCart = (item: MenuItem, selectedSize?: string, selectedAddOns?: string[]) => {
    const finalPrice = calculateItemTotal(item, selectedSize, selectedAddOns);
    const sizeDisplay = selectedSize ? ` (${selectedSize})` : '';
    const addOnsDisplay = (selectedAddOns?.length || 0) > 0 ? ` + ${selectedAddOns.join(', ')}` : '';
    
    addItem({
      id: `${item.id}${selectedSize ? `-${selectedSize.replace(/\s/g, '')}` : ''}${(selectedAddOns?.length || 0) > 0 ? `-${selectedAddOns.length}extras` : ''}-${Date.now()}`,
      name: `${item.name}${sizeDisplay}${addOnsDisplay}`,
      price: finalPrice,
      quantity: 1,
      category: item.category,
      selectedSize,
      selectedAddOns
    });
  };

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(categoryId);
    if (element) {
      const headerOffset = 180;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const getItemPrice = (item: MenuItem) => {
    return formatStartingPrice(item);
  };

  const hasOptions = (item: MenuItem) => {
    return needsCustomization(item);
  };

  const getOptionButtonText = (item: MenuItem) => {
    if (hasSizes(item)) {
      return 'Select Size';
    }
    if (hasAddOns(item)) {
      return 'Customize';
    }
    return 'Add to Order';
  };

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.heroBgContainer}>
          <div className={styles.heroBgImage} />
          <div className={styles.heroBgOverlay} />
          <PremiumHero
            imageUrl="/hero/hero-menu.jpg"
            title="Our Menu"
            subtitle="Fresh, hearty dishes made with love"
          />
        </div>

        <section className={styles.searchSection}>
          <div className={styles.searchRow}>
            <div className={styles.searchContainer}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search menu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {total > 0 && (
              <div className={styles.totalBox}>
                <span className={styles.totalLabel}>Total:</span>
                <span className={styles.totalAmount}>R{total}</span>
              </div>
            )}
          </div>
        </section>

        <nav className={styles.categoryTabs}>
          <div className={styles.categoryTabsInner}>
            <a
              href="/bar-menu"
              className={`${styles.categoryTab} ${styles.barMenuTab}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span className={styles.barMenuIcon}>🍸</span>
              BAR MENU
              <span className={styles.barMenuBadge}>Featured</span>
            </a>
            <button
              className={`${styles.categoryTab} ${activeCategory === 'All' ? styles.active : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.categoryTab} ${activeCategory === cat.name ? styles.active : ''}`}
                onClick={() => {
                  setActiveCategory(cat.name);
                  scrollToCategory(cat.id);
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>

        <div className={styles.menuContent}>
          <div className={styles.menuMain}>
            {filteredSections.map((section) => (
              <section key={section.id} id={section.id} className={styles.categorySection}>
                <div className={styles.categoryHeader}>
                  <h2 className={styles.categoryTitle}>{section.name}</h2>
                  {section.description && (
                    <p className={styles.categoryDescription}>{section.description}</p>
                  )}
                </div>
                <div className={styles.itemsGrid}>
                  {section.items.map((item: MenuItem) => {
                    const itemImage = getMenuItemImage(item.name);
                    return (
                    <div key={item.id} className={styles.itemCard} onClick={() => setSelectedItem(item)}>
                      <div className={styles.imageWrapper}>
                        <img
                          src={itemImage}
                          alt={item.name}
                          className={styles.itemImage}
                        />
                        <div className={styles.itemBadges}>
                          {item.isOnPromo && item.promoBadge && (
                            <span className={styles.badgePromo}>{item.promoBadge}</span>
                          )}
                          {item.isFeatured && (
                            <span className={styles.badgeFeatured}>★ Featured</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.itemContent}>
                        <div className={styles.itemHeader}>
                          <h3 className={styles.itemName}>{item.name}</h3>
                          <span className={styles.itemPrice}>{getItemPrice(item)}</span>
                        </div>
                        {item.description && (
                          <p className={styles.itemDescription}>{item.description}</p>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className={styles.itemTags}>
                            {item.tags.map(tag => (
                              <span key={tag} className={styles.itemTag}>{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className={styles.itemOptions}>
                          <button className={styles.optionButton}>
                            {getOptionButtonText(item)}
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <section className={styles.ctaSection}>
          <h2>Have a Question?</h2>
          <p>Contact us for dietary requirements or special requests</p>
          <a href="/contact" className="btn btn-primary">Contact Us</a>
        </section>
      </main>
      <Footer settings={null} />

      {selectedItem && (
        <OptionModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <UpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        addedItem={lastAddedItem}
        allMenuItems={menuItems}
        onAddToCart={handleUpsellAddToCart}
      />
    </>
  );
}