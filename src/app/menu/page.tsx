'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/lib/cart';
import { cmsService } from '@/lib/client-cms';
import { MenuItem, MenuCategory } from '@/types';
import { defaultCategories, defaultMenuItems } from '@/data/defaultData';
import styles from './Menu.module.css';

interface OptionModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, selectedSize?: string, selectedAddOns?: string[], notes?: string) => void;
}

function OptionModal({ item, isOpen, onClose, onAddToCart }: OptionModalProps) {
  const [selectedSize, setSelectedSize] = useState<string>(item.variants?.[0]?.name || '');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [spiceLevel, setSpiceLevel] = useState('');

  if (!isOpen) return null;

  const basePrice = item.variants?.length 
    ? (item.variants.find(v => v.name === selectedSize)?.price || item.variants[0].price)
    : (item.price || 0);

  const addOnsTotal = selectedAddOns.reduce((total, addOnName) => {
    const addOn = item.addOns?.find(a => a.name === addOnName);
    return total + (addOn?.price || 0);
  }, 0);

  const totalPrice = basePrice + addOnsTotal;

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
    setSpiceLevel('');
  };

  const hasVariants = item.variants && item.variants.length > 0;
  const hasAddOns = item.addOns && item.addOns.length > 0;

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

          {hasVariants && (
            <div className={styles.optionGroup}>
              <h3 className={styles.optionGroupTitle}>
                Size <span className={styles.optionGroupRequired}>*</span>
              </h3>
              <div className={styles.optionGroupOptions}>
                {item.variants.map((variant) => (
                  <div
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasAddOns && (
            <div className={styles.optionGroup}>
              <h3 className={styles.optionGroupTitle}>Extras</h3>
              <div className={styles.optionGroupOptions}>
                {item.addOns.map((addOn) => (
                  <div
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
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.optionGroup}>
            <h3 className={styles.optionGroupTitle}>Special Instructions</h3>
            <textarea
              className={styles.notesTextarea}
              placeholder="Any allergies or special requests? (e.g., no onions, extra sauce)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.modalTotal}>
            <div className={styles.modalTotalLabel}>Total</div>
            <div className={styles.modalTotalPrice}>R{totalPrice}</div>
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
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const [menuItems, setMenuItems] = useState<any[]>(defaultMenuItems);
  const { addItem, items: cartItems, total } = useCart();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, items] = await Promise.all([
          cmsService.getCategories(),
          cmsService.getMenuItems()
        ]);
        if (cats.length > 0) setCategories(cats);
        if (items.length > 0) setMenuItems(items);
      } catch (error) {
        console.error('Error loading menu data:', error);
      }
    };
    loadData();
  }, []);

  const { sections } = useMemo(() => {
    const cats = categories.filter((c: any) => c.isActive).sort((a: any, b: any) => a.order - b.order);
    const secs = cats.map((cat: any) => {
      const items = menuItems
        .filter((item: any) => item.categoryId === cat.id && item.isAvailable !== false)
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
    let itemPrice = item.price || 0;
    if (selectedSize && item.variants?.length) {
      const variant = item.variants.find(v => v.name === selectedSize);
      if (variant) itemPrice = variant.price;
    }
    
    const addOnsTotal = (selectedAddOns || []).reduce((total, addOnName) => {
      const addOn = item.addOns?.find(a => a.name === addOnName);
      return total + (addOn?.price || 0);
    }, 0);
    
    const finalPrice = itemPrice + addOnsTotal;
    const sizeDisplay = selectedSize ? ` (${selectedSize})` : '';
    const addOnsDisplay = (selectedAddOns?.length || 0) > 0 ? ` + ${selectedAddOns.join(', ')}` : '';
    
    addItem({
      id: `${item.id}${selectedSize ? `-${selectedSize.replace(/\s/g, '')}` : ''}${(selectedAddOns?.length || 0) ? '-extras' : ''}`,
      name: `${item.name}${sizeDisplay}${addOnsDisplay}`,
      price: finalPrice,
      quantity: 1,
      category: item.category
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
    if (item.variants?.length) {
      const prices = item.variants.map(v => v.price);
      return `R${Math.min(...prices)}`;
    }
    return `R${item.price}`;
  };

  const hasOptions = (item: MenuItem) => {
    return (item.variants?.length || 0) > 1 || (item.addOns?.length || 0) > 0;
  };

  return (
    <>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.breadcrumb}>
              <Link href="/" className={styles.breadcrumbLink}>Home</Link>
              <span className={styles.breadcrumbSeparator}>›</span>
              <span>Menu</span>
            </div>
            <h1 className={styles.heroTitle}>Restaurant Menu</h1>
            <p className={styles.heroSubtitle}>
              Fresh, hearty dishes made with love
            </p>
          </div>
        </section>

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
                  {section.items.map((item: MenuItem) => (
                    <div key={item.id} className={styles.itemCard} onClick={() => setSelectedItem(item)}>
                      <div className={styles.itemImage} style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}>
                        {!item.image && (
                          <div className={styles.itemImagePlaceholder}>
                            <span>{item.name.charAt(0)}</span>
                          </div>
                        )}
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
                            {hasOptions(item) ? 'Select Options' : 'Add to Order'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
    </>
  );
}