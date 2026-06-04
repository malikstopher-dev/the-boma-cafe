"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import styles from "./WeekendBuffetPopup.module.css";

const SLIDES = [
  {
    src: "/popup1.png",
    alt: "The Boma Café Special Offer",
    href: "https://wa.me/27715921190?text=" + encodeURIComponent(
      "Hi The Boma Café, I saw your promotion and would like to know more!"
    ),
    ariaLabel: "View Special Offer via WhatsApp",
  },
  {
    src: "/breakfast-buffet.jpeg",
    alt: "The Boma Café Weekend Breakfast Buffet",
    href: "https://wa.me/27715921190?text=" + encodeURIComponent(
      "Hi The Boma Café, I would like to book for the Weekend Buffet Experience for Saturday/Sunday between 09:30 and 12:00.\n\nNumber of people: [please enter number of guests]\n\nPlease assist me with availability."
    ),
    ariaLabel: "Book Weekend Buffet via WhatsApp",
  },
];

const ROTATION_INTERVAL = 5000;
const SESSION_KEY = "boma_popup_seen";

export default function WeekendBuffetPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedImages, setFailedImages] = useState({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isClosed) return;

    const alreadySeen = sessionStorage.getItem(SESSION_KEY);
    if (alreadySeen) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }, 3000);

    return () => clearTimeout(timer);
  }, [isClosed]);

  const stopRotation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isVisible) {
      stopRotation();
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, ROTATION_INTERVAL);

    return stopRotation;
  }, [isVisible, stopRotation]);

  const handleDotClick = useCallback(
    (index) => {
      setCurrentSlide(index);
      stopRotation();
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      }, ROTATION_INTERVAL);
    },
    [stopRotation]
  );

  const handleImageError = useCallback((index) => {
    console.error(`Failed to load popup image: ${SLIDES[index].src}`);
    setFailedImages((prev) => ({ ...prev, [index]: true }));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setIsClosed(true);
    stopRotation();
  };

  const openLightbox = () => {
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  if (!isVisible) return null;

  const visibleSlides = SLIDES.filter((_, i) => !failedImages[i]);
  if (visibleSlides.length === 0) return null;

  const activeSlide =
    visibleSlides[0];

  if (lightboxOpen) {
    return (
      <div className={styles.lightboxOverlay} onClick={closeLightbox}>
        <button
          className={styles.lightboxClose}
          onClick={closeLightbox}
          aria-label="Close lightbox"
        >
          ×
        </button>
        <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
          <a
            href={activeSlide.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={activeSlide.ariaLabel}
          >
            <Image
              src={activeSlide.src}
              alt={activeSlide.alt}
              className={styles.lightboxImage}
              width={600}
              height={900}
              quality={95}
              priority
              sizes="(max-width: 768px) 100vw, 600px"
              onError={() => handleImageError(SLIDES.indexOf(activeSlide))}
            />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close popup"
        >
          ×
        </button>

        <div
          className={styles.imageLink}
          onClick={openLightbox}
          role="button"
          tabIndex={0}
          aria-label="Enlarge image"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openLightbox(); }}
        >
          <div className={styles.slideContainer}>
            {SLIDES.map((slide, i) => (
              <div
                key={i}
                className={`${styles.slide} ${
                  i === currentSlide && !failedImages[i]
                    ? styles.activeSlide
                    : ""
                }`}
              >
                {!failedImages[i] && (
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    className={styles.flyerImage}
                    width={260}
                    height={390}
                    quality={90}
                    sizes="260px"
                    onError={() => handleImageError(i)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.popupWhatsAppRow}>
          <a
            href={activeSlide.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsAppButton}
            aria-label={activeSlide.ariaLabel}
          >
            Book Now via WhatsApp
          </a>
        </div>

        {visibleSlides.length > 1 && (
          <div className={styles.dots}>
            {SLIDES.map((_, i) =>
              failedImages[i] ? null : (
                <button
                  key={i}
                  className={`${styles.dot} ${
                    i === currentSlide ? styles.activeDot : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDotClick(i);
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
