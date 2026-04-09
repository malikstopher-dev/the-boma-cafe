'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/lib/cart';
import { MenuItem, MenuCategory } from '@/types';
import MenuCategorySection from '@/components/menu/MenuCategorySection';
import MenuItemCard from '@/components/menu/MenuItemCard';
import { defaultCategories, defaultMenuItems } from '@/data/defaultData';
import styles from './Menu.module.css';

const FOOD_CATEGORIES = ['Breakfast', 'Toasties', 'Hungry... Ish', 'Curries & Bunnies', 'Starters', 'Mains', 'Burgers', 'Pizza', 'Salads', 'Desserts'];
const DRINK_CATEGORIES = ['Hot Drinks', 'Cold Drinks', 'Juices & Smoothies', 'Beers & Ciders', 'Wines', 'Cocktails'];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const { addItem } = useCart();

  const { categories, sections } = useMemo(() => {
    const cats = defaultCategories.filter(c => c.isActive).sort((a, b) => a.order - b.order);
    
    const secs = cats.map(cat => {
      const items = defaultMenuItems
        .filter(item => item.category === cat.name && !item.isOutOfStock)
        .sort((a, b) => a.order - b.order);
      return { id: cat.id, name: cat.name, description: cat.description, items };
    }).filter(s => s.items.length > 0);
    
    return { categories: cats, sections: secs };
  }, []);

  const handleAddToCart = (item: MenuItem, selectedSize?: string, selectedAddOns?: string[]) => {
    const selectedAddOnNames = selectedAddOns || [];
    
    let itemPrice = item.price || 0;
    if (selectedSize && item.variants?.length) {
      const variant = item.variants.find(v => v.name === selectedSize);
      if (variant) itemPrice = variant.price;
    }
    
    const addOnsTotal = selectedAddOnNames.reduce((total, addOnName) => {
      const addOn = item.addOns?.find(a => a.name === addOnName);
      return total + (addOn?.price || 0);
    }, 0);
    
    const finalPrice = itemPrice + addOnsTotal;
    const sizeDisplay = selectedSize ? ` (${selectedSize})` : '';
    const addOnsDisplay = selectedAddOnNames.length > 0 ? ` + ${selectedAddOnNames.join(', ')}` : '';
    
    addItem({
      id: `${item.id}${selectedSize ? `-${selectedSize.replace(/\s/g, '')}` : ''}${selectedAddOnNames.length ? '-extras' : ''}`,
      name: `${item.name}${sizeDisplay}${addOnsDisplay}`,
      price: finalPrice,
      quantity: 1,
      category: item.category
    });
  };

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(categoryId);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const filteredSections = activeCategory === 'All'
    ? sections
    : sections.filter(s => s.name === activeCategory);

  const visibleSections = filteredSections.length > 0 ? filteredSections : sections;

  return (
    <>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Our Menu</h1>
          <p className={styles.heroSubtitle}>
            Fresh, hearty dishes made with love
          </p>
        </section>

        <nav className={styles.categoryNav}>
          <div className={styles.categoryButtons}>
            <button
              className={`${styles.categoryBtn} ${activeCategory === 'All' ? styles.active : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.categoryBtn} ${activeCategory === cat.name ? styles.active : ''}`}
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
          {visibleSections.map((section) => (
            <MenuCategorySection
              key={section.id}
              id={section.id}
              name={section.name}
              description={section.description}
            >
              <div className={styles.itemsGrid}>
                {section.items.map((item: MenuItem) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            </MenuCategorySection>
          ))}
        </div>

        <section className={styles.ctaSection}>
          <h2>Have a Question?</h2>
          <p>Contact us for dietary requirements or special requests</p>
          <a href="/contact" className="btn btn-primary">Contact Us</a>
        </section>
      </main>
      <Footer settings={null} />
    </>
  );
}