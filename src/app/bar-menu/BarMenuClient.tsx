'use client';

import { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import OptimizedHero from '@/components/ui/OptimizedHero';
import { getBarMenuItemImage } from '@/lib/barImages';
import styles from './BarMenu.module.css';

interface BarItem {
  id: string;
  name: string;
  bottle?: number;
  single?: number;
  glass?: number;
  shot?: number;
  price?: string;
}

interface BarCategory {
  id: string;
  name: string;
  items: BarItem[];
}

const ALL_FILTER = 'All';

const filterGroups = [
  ALL_FILTER,
  { label: 'Cocktails', categories: ['Signature Cocktails', 'Classic Cocktails', 'Cocktails'] },
  { label: 'Non-Alcoholic', categories: ['Non-Alcoholic Cocktails', 'Freezos', 'Milkshakes'] },
  { label: 'Whisky', categories: ['Whisky'] },
  { label: 'Brandy', categories: ['Brandy'] },
  { label: 'Vodka', categories: ['Vodka'] },
  { label: 'Gin', categories: ['Gin'] },
  { label: 'Rum', categories: ['Rum'] },
  { label: 'Shots', categories: ['Shots', 'Shooters', 'Spirits & Liqueurs'] },
  { label: 'Beers', categories: ['Beers'] },
  { label: 'Ciders', categories: ['Ciders & RTDs'] },
  { label: 'Cordials', categories: ['Roses Cordials'] },
  { label: 'White Wine', categories: ['Sauvignon Blanc', 'Chardonnay', 'Chenin Blanc', 'Rosé'] },
  { label: 'Cap Classique', categories: ['Cap Classique'] },
  { label: 'Red Wine', categories: ['Merlot', 'Pinotage', 'Cabernet Sauvignon', 'Shiraz', 'Red Blends', 'Other Varietals'] },
  { label: 'Soft Drinks', categories: ['Soft Drinks & Mixers'] },
  { label: 'Special Board', categories: ['Special Board'] },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

function PriceTag({ label, value }: { label: string; value: number }) {
  return (
    <span className={styles.priceTag}>
      <span className={styles.priceLabel}>{label}</span>
      <span className={styles.priceValue}>R{value}</span>
    </span>
  );
}

const MenuItem = memo(function MenuItem({ item, categoryName, onSelect }: { item: BarItem; categoryName: string; onSelect: (item: BarItem, cat: string) => void }) {
  const itemImage = getBarMenuItemImage(item.name, categoryName);
  const showImage = !!itemImage;

  return (
    <motion.div
      variants={itemVariants}
      className={styles.itemCard}
      layout
      onClick={() => onSelect(item, categoryName)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(item, categoryName); }}
    >
      {showImage && (
        <div className={styles.itemImageWrapper}>
          <Image
            src={itemImage}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            className={styles.itemCardImage}
          />
        </div>
      )}
      <div className={styles.itemCardContent}>
        <h3 className={styles.itemCardName}>{item.name}</h3>
        <div className={styles.prices}>
          {item.price ? (
            <span className={styles.priceValue}>{item.price}</span>
          ) : (
            <>
              {item.bottle && <PriceTag label="Bottle" value={item.bottle} />}
              {item.glass && <PriceTag label="Glass" value={item.glass} />}
              {item.single && <PriceTag label="Single" value={item.single} />}
              {item.shot && <PriceTag label="Shot" value={item.shot} />}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

function CategorySection({ category, onSelectItem }: { category: BarCategory; onSelectItem: (item: BarItem, cat: string) => void }) {
  return (
    <motion.section
      id={category.id}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={styles.categorySection}
      role="region"
      aria-label={`${category.name} section`}
    >
      <div className={styles.categoryHeader}>
        <h2 className={styles.categoryTitle}>
          {category.name}
          <span className={styles.categoryCount}>{category.items.length}</span>
        </h2>
        <span className={styles.categoryLine} aria-hidden="true" />
      </div>
      <motion.div
        className={styles.itemsGrid}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {category.items.map((item) => (
          <MenuItem key={item.id} item={item} categoryName={category.name} onSelect={onSelectItem} />
        ))}
      </motion.div>
    </motion.section>
  );
}

function ItemModal({ item, categoryName, onClose }: { item: BarItem; categoryName: string; onClose: () => void }) {
  const itemImage = getBarMenuItemImage(item.name, categoryName);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">
          ✕
        </button>
        {itemImage && (
          <div className={styles.modalImageWrapper}>
            <Image
              src={itemImage}
              alt={item.name}
              fill
              sizes="420px"
              className={styles.modalImage}
            />
          </div>
        )}
        <div className={styles.modalContent}>
          <h3 className={styles.modalName}>{item.name}</h3>
          <div className={styles.modalPrices}>
            {item.price ? (
              <span className={styles.modalPriceValue}>{item.price}</span>
            ) : (
              <>
                {item.bottle && <span className={styles.modalPriceTag}><span className={styles.modalPriceLabel}>Bottle</span><span className={styles.modalPriceValue}>R{item.bottle}</span></span>}
                {item.glass && <span className={styles.modalPriceTag}><span className={styles.modalPriceLabel}>Glass</span><span className={styles.modalPriceValue}>R{item.glass}</span></span>}
                {item.single && <span className={styles.modalPriceTag}><span className={styles.modalPriceLabel}>Single</span><span className={styles.modalPriceValue}>R{item.single}</span></span>}
                {item.shot && <span className={styles.modalPriceTag}><span className={styles.modalPriceLabel}>Shot</span><span className={styles.modalPriceValue}>R{item.shot}</span></span>}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function BarMenuClient() {
  const [categories, setCategories] = useState<BarCategory[]>([]);
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [modalItem, setModalItem] = useState<{ item: BarItem; categoryName: string } | null>(null);
  const filterRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/bar/public', { cache: 'no-cache' })
      .then(r => r.json())
      .then(data => {
        if (!data?.categories || !data?.items) return;
        const catMap: Record<string, BarItem[]> = {};
        for (const item of data.items) {
          if (!catMap[item.categoryId]) catMap[item.categoryId] = [];
          catMap[item.categoryId].push({
            id: item.id,
            name: item.name,
            bottle: item.bottle || undefined,
            single: item.singlePrice || undefined,
            glass: item.glassPrice || undefined,
            shot: item.shotPrice || undefined,
            price: item.price || undefined,
          });
        }
        const cats: BarCategory[] = data.categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          items: catMap[c.id] || [],
        }));
        setCategories(cats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const scrollFilter = useCallback((dir: 'left' | 'right') => {
    if (!filterRowRef.current) return;
    const amount = 300;
    filterRowRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  const filteredCategories = useMemo(() => {
    const activeGroup = filterGroups.find(
      (g) => (typeof g === 'string' ? g : g.label) === activeFilter
    );
    const allowedCategories =
      activeFilter === ALL_FILTER || !activeGroup
        ? null
        : typeof activeGroup === 'string'
          ? null
          : activeGroup.categories;

    const query = searchQuery.toLowerCase().trim();

    return categories
      .filter((cat) => !allowedCategories || allowedCategories.includes(cat.name))
      .map((cat) => {
        if (!query) return cat;
        const filtered = cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            cat.name.toLowerCase().includes(query)
        );
        return { ...cat, items: filtered };
      })
      .filter((cat) => cat.items.length > 0);
  }, [activeFilter, searchQuery, categories]);

  const totalItems = useMemo(
    () => filteredCategories.reduce((sum, c) => sum + c.items.length, 0),
    [filteredCategories]
  );

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
    setSearchQuery('');
  }, []);

  const handleItemSelect = useCallback((item: BarItem, categoryName: string) => {
    setModalItem({ item, categoryName });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalItem(null);
  }, []);

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div style={isMobile ? { marginTop: '-60px' } : undefined}>
        <OptimizedHero
          poster="/videos/hero-poster.jpg"
          videoSrc="/videos/boma-bar-menu-hero.mp4"
          mobileVideoSrc="/videos/bar-menu-mobile.mp4"
          className={styles.heroFull}
        >
          {!isMobile && (
            <>
              <div style={{
                display: 'inline-block',
                background: 'var(--warm)',
                padding: '0.4rem 1.25rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--dark-brown)',
                marginBottom: '1rem',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                Bar Menu
              </div>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                marginBottom: '1rem',
                lineHeight: 1.2,
                color: 'var(--white)',
                textShadow: '0 3px 20px rgba(0, 0, 0, 0.4)',
              }}>
                Cocktails & Drinks
              </h1>
              <p style={{
                fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                fontStyle: 'italic',
                color: 'var(--cream)',
                maxWidth: '650px',
                margin: '0 auto',
                lineHeight: 1.6,
              }}>
                Handcrafted cocktails, premium spirits, and fine wines
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <a href="/contact" className="btn btn-primary" style={{ padding: '0.875rem 2rem' }}>
                  Book a Table
                </a>
                <a
                  href="https://wa.me/27729961190"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.875rem 2rem',
                    background: '#25D366',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  WhatsApp Booking
                </a>
              </div>
            </>
          )}
        </OptimizedHero>
        </div>

        {isMobile && (
          <>
            <div className={styles.mobileHeroContent}>
              <div style={{
                display: 'inline-block',
                background: 'var(--warm)',
                padding: '0.4rem 1.25rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--dark-brown)',
                marginBottom: '1rem',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                Bar Menu
              </div>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                marginBottom: '1rem',
                lineHeight: 1.2,
                color: 'var(--white)',
                textShadow: '0 3px 20px rgba(0, 0, 0, 0.4)',
              }}>
                Cocktails & Drinks
              </h1>
              <p style={{
                fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                fontStyle: 'italic',
                color: 'var(--cream)',
                maxWidth: '650px',
                margin: '0 auto',
                lineHeight: 1.6,
              }}>
                Handcrafted cocktails, premium spirits, and fine wines
              </p>
            </div>
            <div className={styles.mobileCtaSection}>
              <a href="/contact" className={styles.mobileCtaBtn}>
                Book a Table
              </a>
              <a
                href="https://wa.me/27729961190"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.mobileWhatsAppBtn}
              >
                WhatsApp Booking
              </a>
            </div>
          </>
        )}

        <div className={styles.searchSection} role="search" aria-label="Search bar menu">
          <div className={styles.searchInner}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon} aria-hidden="true">🔍</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search drinks, wines, beers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search bar menu items"
              />
            </div>
            <div className={styles.filterRowWrapper}>
              <button className={styles.scrollBtn} onClick={() => scrollFilter('left')} aria-label="Scroll left">‹</button>
              <div className={styles.filterRow} ref={filterRowRef} role="tablist" aria-label="Filter by category">
                {filterGroups.map((group) => {
                  const label = typeof group === 'string' ? group : group.label;
                  const isActive = activeFilter === label;
                  return (
                    <button
                      key={label}
                      role="tab"
                      aria-selected={isActive}
                      className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ''}`}
                      onClick={() => handleFilterChange(label)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button className={styles.scrollBtn} onClick={() => scrollFilter('right')} aria-label="Scroll right">›</button>
            </div>
            <span className={styles.resultCount} role="status">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className={styles.container}>
          <AnimatePresence mode="wait">
            {filteredCategories.length > 0 ? (
              <motion.div key={activeFilter + searchQuery} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                {filteredCategories.map((category) => (
                  <CategorySection key={category.id} category={category} onSelectItem={handleItemSelect} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={styles.emptyState}
              >
                <div className={styles.emptyIcon} aria-hidden="true">🍸</div>
                <h3 className={styles.emptyTitle}>No drinks found</h3>
                <p className={styles.emptyText}>
                  Try adjusting your search or filter to find what you are looking for.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {modalItem && (
          <ItemModal
            key={modalItem.item.id}
            item={modalItem.item}
            categoryName={modalItem.categoryName}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}
