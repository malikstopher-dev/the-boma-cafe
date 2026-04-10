'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from '@/app/gallery/Gallery.module.css';
import { galleryCategories, galleryImages, getGalleryImages } from '@/data/galleryManifest';

interface GalleryBoardsProps {
  onManageClick?: () => void;
  onImageClick?: (images: string[], index: number) => void;
}

export default function GalleryBoards({ onManageClick, onImageClick }: GalleryBoardsProps) {
  const [activeSlide, setActiveSlide] = useState<Record<string, number>>({});
  const intervalRefs = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const initialSlides: Record<string, number> = {};
    galleryCategories.forEach(cat => {
      initialSlides[cat.id] = 0;
    });
    setActiveSlide(initialSlides);
  }, []);

  useEffect(() => {
    galleryCategories.forEach(cat => {
      const images = getGalleryImages(cat.id);
      if (images.length <= 1) return;

      if (intervalRefs.current[cat.id]) {
        clearInterval(intervalRefs.current[cat.id]);
      }

      intervalRefs.current[cat.id] = setInterval(() => {
        setActiveSlide(prev => ({
          ...prev,
          [cat.id]: prev[cat.id] === images.length - 1 ? 0 : prev[cat.id] + 1
        }));
      }, 3000);
    });

    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, []);

  const handleDotClick = useCallback((boardId: string, index: number) => {
    setActiveSlide(prev => ({ ...prev, [boardId]: index }));
  }, []);

  return (
    <section className={styles.boardsSection}>
      <div className={styles.boardsHeader}>
        <h2 className={styles.boardsTitle}>Gallery Highlights</h2>
        <p className={styles.boardsSubtitle}>A glimpse into The Boma Cafe experience</p>
      </div>
      
      <div className={styles.boardsGrid}>
        {galleryCategories.map((cat) => {
          const boardImages = getGalleryImages(cat.id);
          const currentSlide = activeSlide[cat.id] ?? 0;
          
          if (boardImages.length === 0) {
            return (
<div key={cat.id} className={styles.boardCard} onClick={() => onImageClick && onImageClick(boardImages.map(i => i.url), currentSlide)}>
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
              <div className={styles.boardHeader}>
                <span className={styles.boardIcon}>{cat.icon}</span>
                <h3 className={styles.boardTitle}>{cat.name}</h3>
              </div>
              
              <div className={styles.boardSlideContainer}>
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
                        onClick={() => handleDotClick(cat.id, idx)}
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
