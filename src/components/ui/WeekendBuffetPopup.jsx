"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./WeekendBuffetPopup.module.css";

export default function WeekendBuffetPopup() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (isClosed || !isDesktop) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isClosed, isDesktop]);

  const handleClose = () => {
    setIsVisible(false);
    setIsClosed(true);
  };

  if (!isDesktop) return null;
  if (!isVisible) return null;

  const whatsappMessage = `Hi The Boma Café, I would like to book for the Weekend Buffet Experience for Saturday/Sunday between 09:30 and 12:00.

Number of people: [please enter number of guests]

Please assist me with availability.`;

  const whatsappLink = "https://wa.me/27715921190?text=" + encodeURIComponent(whatsappMessage);

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Close popup">
          ×
        </button>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.imageLink}
          aria-label="Book Weekend Buffet via WhatsApp"
        >
          <Image
            src="/breakfast-buffet.jpeg"
            alt="The Boma Café Weekend Breakfast Buffet"
            className={styles.flyerImage}
            width={260}
            height={390}
            priority
            quality={90}
            sizes="260px"
          />
        </a>
      </div>
    </div>
  );
}