'use client';

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/lib/cart';
import { MenuItem, MenuCategory } from '@/types';
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
import OptimizedHero from '@/components/ui/OptimizedHero';

import { getMenuItemImage } from '@/lib/menuImage';
import styles from './Menu.module.css';

const INITIAL_COUNT = 24;
const LOAD_MORE_COUNT = 24;

const DRINK_CATEGORIES = [
  'Cold Beverages',
  'Hot Beverages',
  'Beverages',
  'Drinks',
  'Milkshakes',
  'Milkshake',
  'Classic Cocktails',
  'Non-Alcoholic Cocktails',
  'Soft Drinks',
  'Juices',
  'Juice',
  'DRNK',
  'DRNK Freezos',
  'Freezos',
  'Smoothies',
  'Mocktails',
  'Ice Cream & Chocolate Sauce',
  'Ice Cream',
];

const HOT_DRINK_CATEGORIES = [
  'Hot Beverages',
];

const DESSERT_CATEGORIES = [
  'Desserts',
];

const BAR_CATEGORIES = [
  ...DRINK_CATEGORIES,
  ...DESSERT_CATEGORIES,
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
  const itemImage = getMenuItemImage(item.name, item.category);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modalOpen');
    } else {
      document.body.classList.remove('modalOpen');
    }
    return () => {
      document.body.classList.remove('modalOpen');
    };
  }, [isOpen]);

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
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modalContent}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {itemImage && (
          <div className={styles.modalImageWrapper}>
            <Image
              src={itemImage}
              alt={item.name}
              fill
              sizes="(max-width: 500px) 100vw, 500px"
              className={styles.modalImage}
            />
          </div>
        )}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{item.name}</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close item details">×</button>
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
      </motion.div>
    </motion.div>
  );
}

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryIsBar, setCategoryIsBar] = useState<Record<string, boolean>>({});
  const [categoryNameIsBar, setCategoryNameIsBar] = useState<Record<string, boolean>>({});
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cmsLoaded, setCmsLoaded] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<MenuItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [isMobile, setIsMobile] = useState(false);
  const { addItem, items: cartItems, total, openCart, isCartOpen } = useCart();

  useEffect(() => {
    if (showUpsellModal) {
      document.body.classList.add('modalOpen');
    } else {
      document.body.classList.remove('modalOpen');
    }
    return () => {
      document.body.classList.remove('modalOpen');
    };
  }, [showUpsellModal]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const loadFromCms = async () => {
      try {
        const res = await fetch(`/api/menu/public?t=${Date.now()}`, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.categories || !data.menuItems) throw new Error('Invalid response');
        const categoriesMap: Record<string, string> = {};
        const categoryIsBar: Record<string, boolean> = {};
        const categoryNameIsBar: Record<string, boolean> = {};
        const mappedCategories = data.categories.map((c: any) => {
          categoriesMap[c.id] = c.name;
          categoryIsBar[c.id] = c.isBar === true;
          categoryNameIsBar[c.name.toLowerCase()] = c.isBar === true;
          return { ...c, isActive: c.isActive, isBar: c.isBar === true };
        });
        const mappedItems = data.menuItems.map((item: any) => {
          const price = parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0;
          return {
            ...item,
            category: categoriesMap[item.categoryId] || '',
            price,
            isOutOfStock: item.isAvailable === false,
            variants: item.sizes || undefined,
            addOns: item.addOns || undefined,
          };
        });
        setCategories(mappedCategories);
        setCategoryIsBar(categoryIsBar);
        setCategoryNameIsBar(categoryNameIsBar);
        setMenuItems(mappedItems);
        setCmsLoaded(true);
      } catch (error) {
        console.error('Failed to load menu from CMS:', error);
      }
    };
    loadFromCms();
  }, []);

  const { sections } = useMemo(() => {
    const cats = categories.filter((c: any) => c.isActive !== false).sort((a: any, b: any) => a.order - b.order);
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

  // Reset visible count when category or search changes
  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
    setVisibleCount(INITIAL_COUNT);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setVisibleCount(INITIAL_COUNT);
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + LOAD_MORE_COUNT);
  }, []);

  const totalItems = filteredSections.reduce((sum, s) => sum + s.items.length, 0);
  const hasMoreItems = visibleCount < totalItems;

  const handleAddToCart = (item: MenuItem, selectedSize?: string, selectedAddOns?: string[], notes?: string) => {
    const finalPrice = calculateItemTotal(item, selectedSize, selectedAddOns);
    const sizeDisplay = selectedSize ? ` (${selectedSize})` : '';
    const addOnsDisplay = (selectedAddOns?.length || 0) > 0 ? ` + ${selectedAddOns.join(', ')}` : '';
    const isBar = categoryNameIsBar[item.category?.toLowerCase() || ''] === true || BAR_CATEGORIES.some(c => item.category?.toLowerCase().includes(c.toLowerCase()));
    
    addItem({
      id: `${item.id}${selectedSize ? `-${selectedSize.replace(/\s/g, '')}` : ''}${(selectedAddOns?.length || 0) > 0 ? `-${selectedAddOns.length}extras` : ''}-${Date.now()}`,
      menuItemId: item.id,
      name: `${item.name}${sizeDisplay}${addOnsDisplay}`,
      price: finalPrice,
      quantity: 1,
      category: item.category,
      selectedSize,
      selectedAddOns,
      notes,
      station: isBar ? 'bar' : 'kitchen',
    });

    setLastAddedItem(item);
    setShowUpsellModal(true);
  };

  const handleUpsellAddToCart = (item: MenuItem, selectedSize?: string, selectedAddOns?: string[]) => {
    const finalPrice = calculateItemTotal(item, selectedSize, selectedAddOns);
    const sizeDisplay = selectedSize ? ` (${selectedSize})` : '';
    const addOnsDisplay = (selectedAddOns?.length || 0) > 0 ? ` + ${selectedAddOns.join(', ')}` : '';
    const isBar = categoryNameIsBar[item.category?.toLowerCase() || ''] === true || BAR_CATEGORIES.some(c => item.category?.toLowerCase().includes(c.toLowerCase()));
    
    addItem({
      id: `${item.id}${selectedSize ? `-${selectedSize.replace(/\s/g, '')}` : ''}${(selectedAddOns?.length || 0) > 0 ? `-${selectedAddOns.length}extras` : ''}-${Date.now()}`,
      menuItemId: item.id,
      name: `${item.name}${sizeDisplay}${addOnsDisplay}`,
      price: finalPrice,
      quantity: 1,
      category: item.category,
      selectedSize,
      selectedAddOns,
      station: isBar ? 'bar' : 'kitchen',
    });
  };

  const handleContinueToCart = () => {
    setShowUpsellModal(false);
    setTimeout(() => {
      openCart();
    }, 50);
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
        <div style={isMobile ? { marginTop: '-60px' } : undefined}>
          <OptimizedHero
            poster="/videos/hero-poster.jpg"
            videoSrc="/videos/boma-menu-hero.mp4"
            mobileVideoSrc="/videos/menu-mobile.mp4"
            className={styles.heroFull}
          >
            {!isMobile && (
              <>
                <h1 style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  marginBottom: '1rem',
                  lineHeight: 1.2,
                  color: 'var(--white)',
                  textShadow: '0 3px 20px rgba(0, 0, 0, 0.4)',
                }}>
                  Our Menu
                </h1>
                <p style={{
                  fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                  fontStyle: 'italic',
                  color: 'var(--cream)',
                  maxWidth: '650px',
                  margin: '0 auto',
                  lineHeight: 1.6,
                }}>
                  Fresh, hearty dishes made with love
                </p>
              </>
            )}
          </OptimizedHero>
        </div>

        {isMobile && (
          <div style={{
            background: '#1a0f0a',
            padding: '2rem 5% 3rem',
            textAlign: 'center',
          }}>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              marginBottom: '1rem',
              lineHeight: 1.2,
              color: 'var(--white)',
            }}>
              Our Menu
            </h1>
            <p style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
              fontStyle: 'italic',
              color: 'var(--cream)',
              maxWidth: '650px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}>
              Fresh, hearty dishes made with love
            </p>
          </div>
        )}

        <section className={styles.searchSection}>
          <div className={styles.searchRow}>
            <div className={styles.searchContainer}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search menu..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
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
              onClick={() => handleCategoryChange('All')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.categoryTab} ${activeCategory === cat.name ? styles.active : ''}`}
                onClick={() => handleCategoryChange(cat.name)}
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
                  {section.items.slice(0, visibleCount).map((item: MenuItem) => {
                    const CMS_IMAGE_NAMES = ['Full Chicken, Chips & 4 Rotis', '200g Ribs & Steak', '1/4 Chicken, Pap & Gravy'];
                    const itemImage = (CMS_IMAGE_NAMES.includes(item.name) && item.image)
                      ? item.image
                      : getMenuItemImage(item.name);
                    return (
                    <div key={item.id} className={styles.itemCard} onClick={() => setSelectedItem(item)}>
                      <div className={styles.imageWrapper}>
                        <Image
                          src={itemImage}
                          alt={item.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 300px"
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
            
            {hasMoreItems && (
              <button className={styles.loadMoreButton} onClick={handleLoadMore}>
                Load More ({totalItems - visibleCount} more)
              </button>
            )}
          </div>
        </div>

        <section className={styles.ctaSection}>
          <h2>Have a Question?</h2>
          <p>Contact us for dietary requirements or special requests</p>
          <a href="/contact" className="btn btn-primary">Contact Us</a>
        </section>
      </main>
      <Footer settings={null} />

      <AnimatePresence>
        {selectedItem && (
          <OptionModal
            item={selectedItem}
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            onAddToCart={handleAddToCart}
          />
        )}
      </AnimatePresence>

      <UpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        addedItem={lastAddedItem}
        allMenuItems={menuItems}
        onAddToCart={handleUpsellAddToCart}
        onOpenCart={handleContinueToCart}
      />

      {cartItems.length > 0 && !selectedItem && !showUpsellModal && (
        <button
          className={styles.desktopFloatingCart}
          onClick={openCart}
          aria-label="Open cart"
        >
          <span className={styles.floatingCartIcon}>🛒</span>
          <span className={styles.floatingCartCount}>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
          <span className={styles.floatingCartTotal}>R{total}</span>
        </button>
      )}
    </>
  );
}