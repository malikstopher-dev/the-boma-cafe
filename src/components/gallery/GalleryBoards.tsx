'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from '@/app/gallery/Gallery.module.css';

interface GalleryItemData {
  id: string;
  url: string;
  title?: string;
  category?: string;
  isFeatured?: boolean;
}

interface GalleryBoardsProps {
  onManageClick?: () => void;
  onImageClick?: (images: string[], index: number) => void;
  onCategoryClick?: (category: string) => void;
  galleryItems?: GalleryItemData[];
}

const boardIcons: Record<string, string> = {
  Events: '🎉',
  Food: '🍽️',
  Venue: '🏠',
  People: '👥',
  Promotions: '🎁',
};

export default function GalleryBoards({ onManageClick, onImageClick, onCategoryClick, galleryItems = [] }: GalleryBoardsProps) {
  const [activeSlide, setActiveSlide] = useState<Record<string, number>>({});
  const intervalRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  const getCategoryFromUrl = (url: string): string => {
    const match = url.match(/\/gallery\/([^/]+)\//);
    if (!match) return 'Other';
    const folder = match[1].toLowerCase();
    const map: Record<string, string> = { events: 'Events', food: 'Food', venue: 'Venue', people: 'People', promotions: 'Promotions' };
    return map[folder] || 'Other';
  };

  const boards = useMemo(() => {
    const grouped: Record<string, { name: string; images: { url: string }[] }> = {};
    for (const item of galleryItems) {
      const cat = item.category || getCategoryFromUrl(item.url || '');
      if (!grouped[cat]) grouped[cat] = { name: cat, images: [] };
      grouped[cat].images.push({ url: item.url });
    }
    return Object.entries(grouped).map(([name, data]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      icon: boardIcons[name] || '📷',
      images: data.images,
    }));
  }, [galleryItems]);

  useEffect(() => {
    const initialSlides: Record<string, number> = {};
    boards.forEach(cat => {
      initialSlides[cat.id] = 0;
    });
    setActiveSlide(initialSlides);
  }, [boards]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { setIsVisible(entry.isIntersecting); },
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      Object.values(intervalRefs.current).forEach(clearInterval);
      intervalRefs.current = {};
      return;
    }

    boards.forEach(cat => {
      const images = cat.images;
      if (images.length <= 1) return;
      intervalRefs.current[cat.id] = setInterval(() => {
        setActiveSlide(prev => ({
          ...prev,
          [cat.id]: prev[cat.id] === images.length - 1 ? 0 : prev[cat.id] + 1
        }));
      }, 3000);
    });

    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
      intervalRefs.current = {};
    };
  }, [isVisible, boards]);

  const handleDotClick = useCallback((boardId: string, index: number) => {
    setActiveSlide(prev => ({ ...prev, [boardId]: index }));
  }, []);

  return (
    <section className={styles.boardsSection} ref={sectionRef}>
      <div className={styles.boardsHeader}>
        <h2 className={styles.boardsTitle}>Gallery Highlights</h2>
        <p className={styles.boardsSubtitle}>A glimpse into The Boma Cafe experience</p>
      </div>
      
      <div className={styles.boardsGrid}>
        {boards.map((cat) => {
          const boardImages = cat.images;
          const currentSlide = activeSlide[cat.id] ?? 0;
          
          if (boardImages.length === 0) {
            return (
<div key={cat.id} className={styles.boardCard}>
                <div className={styles.boardHeader}>
                  <span className={styles.boardIcon}>{cat.icon}</span>
                  <h3 className={styles.boardTitle}>{cat.name}</h3>
                </div>
                <div className={styles.boardEmpty}>
                  <span>No images yet</span>
                </div>
              </div>
            );
          }
          
          return (
            <div key={cat.id} className={styles.boardCard}>
              <div className={styles.boardHeader} onClick={() => onCategoryClick && onCategoryClick(cat.name)} style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}>
                <span className={styles.boardIcon}>{cat.icon}</span>
                <h3 className={styles.boardTitle}>{cat.name}</h3>
              </div>
              
              <div 
                className={styles.boardSlideContainer}
                onClick={() => onImageClick && onImageClick(boardImages.map(i => i.url), currentSlide)}
              >
                {boardImages.map((img, idx) => (
                  <div
                    key={`${cat.id}-${idx}`}
                    className={`${styles.boardSlide} ${idx === currentSlide ? styles.active : ''}`}
                    style={{ 
                      backgroundImage: `url(${img.url})`,
                      zIndex: idx === currentSlide ? 1 : 0
                    }}
                  />
                ))}
                
                {boardImages.length > 1 && (
                  <div className={styles.boardDots}>
                    {boardImages.map((_, idx) => (
                      <button
                        key={`dot-${idx}`}
                        className={`${styles.boardDot} ${idx === currentSlide ? styles.activeDot : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleDotClick(cat.id, idx); }}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className={styles.boardFooter}>
                <span className={styles.boardCount}>{boardImages.length} photo{boardImages.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
