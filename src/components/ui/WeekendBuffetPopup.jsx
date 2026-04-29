"use client";

import { useState, useEffect } from "react";
import styles from "./WeekendBuffetPopup.module.css";

export default function WeekendBuffetPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (isClosed) return;

    const checkMobile = () => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) return true;
      return false;
    };

    if (checkMobile()) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isClosed]);

  const handleClose = () => {
    setIsVisible(false);
    setIsClosed(true);
  };

  if (!isVisible) return null;

  const whatsappLink = "https://wa.me/27715921190?text=" + 
    encodeURIComponent("Hi The Boma Café, I would like to book for the Weekend Buffet Experience on Saturday & Sunday at 09:30 - 12:00. Please confirm availability.");

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose} aria-label="Close popup">
          ×
        </button>

        <div className={styles.content}>
          <div className={styles.icon}>🍽️</div>
          <h3 className={styles.title}>Weekend Buffet Experience</h3>
          <div className={styles.details}>
            <span>📅 Saturday & Sunday</span>
            <span>🕐 09:30 - 12:00</span>
          </div>
          <p className={styles.description}>
            Join us for our signature weekend buffet at The Boma Café.
          </p>
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappBtn}
          >
            Book via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
