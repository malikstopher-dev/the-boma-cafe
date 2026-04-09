'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService } from '@/lib/data';
import { useCart } from '@/lib/cart';
import { buildMenuData } from '@/data/menuData';
import { MenuItem, MenuCategory } from '@/types';
import MenuCategorySection from '@/components/menu/MenuCategorySection';
import MenuItemCard from '@/components/menu/MenuItemCard';
import styles from './Menu.module.css';

export default function MenuPage() {
  const [settings, setSettings] = useState<any>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuData, setMenuData] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const { addItem } = useCart();

  useEffect(() => {
    const loadedSettings = dataService.getSettings();
    const loadedCategories = dataService.getCategories();
    const loadedMenuItems = dataService.getMenuItems();
    
    setSettings(loadedSettings);
    setCategories(loadedCategories);
    setMenuItems(loadedMenuItems);
    setMenuData(buildMenuData(loadedCategories, loadedMenuItems));
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
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const filteredSections = activeCategory === 'All'
    ? menuData?.sections || []
    : menuData?.sections.filter((s: any) => s.name === activeCategory) || [];

  return (
    <>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Our Menu</h1>
          <p className={styles.heroSubtitle}>
            Click on any item to add to your order
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
            {menuData?.categories.map((cat: MenuCategory) => (
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
          {filteredSections.map((section: any) => (
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
      <Footer settings={settings} />
    </>
  );
}