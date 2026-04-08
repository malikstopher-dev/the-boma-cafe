'use client';

import { useState, useEffect } from 'react';
import styles from './PopupModal.module.css';

interface PopupProps {
  popup?: {
    type: string;
    title: string;
    description: string;
    image?: string;
    ctaText: string;
    ctaLink: string;
    isEnabled: boolean;
    showOncePerSession: boolean;
    startDate: string;
    endDate: string;
  };
}

export default function PopupModal({ popup }: PopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (!popup || !popup.isEnabled || isClosed) return;

    const now = new Date();
    const startDate = new Date(popup.startDate);
    const endDate = new Date(popup.endDate);

    if (now < startDate || now > endDate) return;

    if (popup.showOncePerSession) {
      const sessionKey = 'boma_popup_shown';
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, 'true');
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [popup, isClosed]);

  if (!isVisible || !popup) return null;

  const handleClose = () => {
    setIsVisible(false);
    setIsClosed(true);
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={handleClose} aria-label="Close popup">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {popup.image && (
          <div className={styles.image}>
            <img src={popup.image} alt={popup.title} />
          </div>
        )}

        <div className={styles.content}>
          <span className={styles.type}>
            {popup.type === 'promotion' && '🎉 Special Offer'}
            {popup.type === 'event' && '📅 Upcoming Event'}
            {popup.type === 'announcement' && '📢 Announcement'}
          </span>
          <h3 className={styles.title}>{popup.title}</h3>
          <p className={styles.description}>{popup.description}</p>
          
          {popup.ctaText && popup.ctaLink && (
            <a href={popup.ctaLink} className="btn btn-primary">
              {popup.ctaText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}