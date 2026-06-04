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
  const [isDesktop, setIsDesktop] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedImages, setFailedImages] = useState({});
  const intervalRef = useRef(null);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  useEffect(() => {
    if (isClosed || !isDesktop) return;

    const alreadySeen = sessionStorage.getItem(SESSION_KEY);
    if (alreadySeen) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }, 3000);

    return () => clearTimeout(timer);
  }, [isClosed, isDesktop]);

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
    setFailedImages((prev) => ({ ...prev, [index]: true }));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setIsClosed(true);
    stopRotation();
  };

  if (!isDesktop) return null;
  if (!isVisible) return null;

  const visibleSlides = SLIDES.filter((_, i) => !failedImages[i]);
  if (visibleSlides.length === 0) return null;

  const activeIndex = failedImages[currentSlide]
    ? Math.min(currentSlide, visibleSlides.length - 1)
    : visibleSlides.findIndex((_, i) => {
        let count = 0;
        for (let j = 0; j <= i; j++) {
          if (!failedImages[j]) count++;
        }
        return currentSlide === j;
      });

  const activeSlide =
    visibleSlides[activeIndex !== -1 ? activeIndex : 0];

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

        <a
          href={activeSlide.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.imageLink}
          aria-label={activeSlide.ariaLabel}
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
        </a>

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