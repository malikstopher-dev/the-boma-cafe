'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '@/app/gallery/Gallery.module.css';

interface GalleryBoardsProps {
  onManageClick?: () => void;
}

interface BoardCategory {
  id: string;
  name: string;
  folder: string;
  icon: string;
}

const categories: BoardCategory[] = [
  { id: 'events', name: 'Events', folder: 'events', icon: '🎉' },
  { id: 'food', name: 'Food', folder: 'food', icon: '🍽️' },
  { id: 'venue', name: 'Venue', folder: 'venue', icon: '🏠' },
  { id: 'people', name: 'People', folder: 'people', icon: '👥' },
  { id: 'promotions', name: 'Promotions', folder: 'promotions', icon: '🎁' },
];

interface BoardSlide {
  index: number;
  isActive: boolean;
}

export default function GalleryBoards({ onManageClick }: GalleryBoardsProps) {
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [activeSlide, setActiveSlide] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadImages = async () => {
      const loadedImages: Record<string, string[]> = {};
      
      for (const cat of categories) {
        try {
          const response = await fetch(`/api/gallery/${cat.folder}`);
          if (response.ok) {
            const data = await response.json();
            loadedImages[cat.id] = data.images || [];
          }
        } catch (error) {
          console.log(`Could not load ${cat.folder} images`);
          loadedImages[cat.id] = [];
        }
      }
      
      setImages(loadedImages);
      
      const initialSlides: Record<string, number> = {};
      categories.forEach(cat => {
        initialSlides[cat.id] = 0;
      });
      setActiveSlide(initialSlides);
    };

    loadImages();
  }, []);

  const nextSlide = useCallback((boardId: string, totalSlides: number) => {
    setActiveSlide(prev => ({
      ...prev,
      [boardId]: prev[boardId] === totalSlides - 1 ? 0 : prev[boardId] + 1
    }));
  }, []);

  const prevSlide = useCallback((boardId: string, totalSlides: number) => {
    setActiveSlide(prev => ({
      ...prev,
      [boardId]: prev[boardId] === 0 ? totalSlides - 1 : prev[boardId] - 1
    }));
  }, []);

  return (
    <section className={styles.boardsSection}>
      <div className={styles.boardsHeader}>
        <h2 className={styles.boardsTitle}>Gallery Highlights</h2>
        <p className={styles.boardsSubtitle}>A glimpse into The Boma Cafe experience</p>
      </div>
      
      <div className={styles.boardsGrid}>
        {categories.map((cat) => {
          const boardImages = images[cat.id] || [];
          const currentSlide = activeSlide[cat.id] || 0;
          
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
              <div className={styles.boardHeader}>
                <span className={styles.boardIcon}>{cat.icon}</span>
                <h3 className={styles.boardTitle}>{cat.name}</h3>
              </div>
              
              <div className={styles.boardSlideContainer}>
                <div className={styles.boardSlideTrack}>
                  {boardImages.map((img, idx) => (
                    <div
                      key={idx}
                      className={`${styles.boardSlide} ${idx === currentSlide ? styles.active : ''}`}
                      style={{ backgroundImage: `url(${img})` }}
                    />
                  ))}
                </div>
                
                {boardImages.length > 1 && (
                  <>
                    <button 
                      className={`${styles.boardNavBtn} ${styles.boardNavPrev}`}
                      onClick={() => prevSlide(cat.id, boardImages.length)}
                      aria-label="Previous image"
                    >
                      ‹
                    </button>
                    <button 
                      className={`${styles.boardNavBtn} ${styles.boardNavNext}`}
                      onClick={() => nextSlide(cat.id, boardImages.length)}
                      aria-label="Next image"
                    >
                      ›
                    </button>
                    
                    <div className={styles.boardDots}>
                      {boardImages.map((_, idx) => (
                        <button
                          key={idx}
                          className={`${styles.boardDot} ${idx === currentSlide ? styles.activeDot : ''}`}
                          onClick={() => setActiveSlide(prev => ({ ...prev, [cat.id]: idx }))}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
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
