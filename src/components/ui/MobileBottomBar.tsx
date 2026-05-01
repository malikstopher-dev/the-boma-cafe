'use client';

import Link from 'next/link';
import { BUSINESS_INFO } from '@/lib/whatsappConfig';
import styles from './MobileBottomBar.module.css';

export default function MobileBottomBar() {
  return (
    <div className={styles.bottomBar}>
      <a href={`tel:${BUSINESS_INFO.phone}`} className={styles.action}>
        <i className="fas fa-phone" />
        <span>Call</span>
      </a>
      <a 
        href={`https://wa.me/${BUSINESS_INFO.phoneRaw}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className={styles.action}
      >
        <i className="fab fa-whatsapp" />
        <span>WhatsApp</span>
      </a>
      <Link href="/menu" className={styles.action}>
        <i className="fas fa-utensils" />
        <span>Menu</span>
      </Link>
    </div>
  );
}