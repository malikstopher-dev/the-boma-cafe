'use client';

import { useState, useEffect, useCallback } from 'react';
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
    startTime?: string;
    endTime?: string;
    activeDays?: number[];
    adultPrice?: string;
    kidsPrice?: string;
  };
}

export default function PopupModal({ popup }: PopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const checkWeekendTiming = useCallback(() => {
    if (!popup || !popup.isEnabled) return false;
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    const activeDays = popup.activeDays || [6, 0];
    if (!activeDays.includes(dayOfWeek)) {
      return false;
    }
    
    const startTime = popup.startTime || '09:30';
    const endTime = popup.endTime || '12:30';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
      return false;
    }
    
    return true;
  }, [popup]);

  useEffect(() => {
    if (!popup || !popup.isEnabled || isClosed) return;

    const shouldShow = checkWeekendTiming();
    if (!shouldShow) return;

    if (popup.showOncePerSession) {
      const sessionKey = 'boma_weekend_popup_shown';
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, 'true');
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [popup, isClosed, checkWeekendTiming]);

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
            🍳 Weekend Breakfast
          </span>
          <h3 className={styles.title}>{popup.title}</h3>
          <p className={styles.description}>{popup.description}</p>
          
          {(popup.adultPrice || popup.kidsPrice) && (
            <div className={styles.pricing}>
              {popup.adultPrice && (
                <div className={styles.priceItem}>
                  <span>Adults</span>
                  <span className={styles.price}>{popup.adultPrice}</span>
                </div>
              )}
              {popup.kidsPrice && (
                <div className={styles.priceItem}>
                  <span>Kids</span>
                  <span className={styles.price}>{popup.kidsPrice}</span>
                </div>
              )}
            </div>
          )}
          
          <div className={styles.ctas}>
            {popup.ctaText && (popup.ctaLink ? (
              <a href={popup.ctaLink} className="btn btn-primary">
                {popup.ctaText}
              </a>
            ) : (
              <a href="/menu" className="btn btn-primary">
                {popup.ctaText}
              </a>
            ))}
            <a 
              href="https://wa.me/27729961190" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              WhatsApp Booking
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}