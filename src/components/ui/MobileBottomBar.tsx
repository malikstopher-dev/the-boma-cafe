'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { BUSINESS_INFO } from '@/lib/whatsappConfig';
import styles from './MobileBottomBar.module.css';

export default function MobileBottomBar() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/cms/public', { cache: 'no-cache' });
        const data = await res.json();
        if (data?.settings) setSettings(data.settings);
      } catch {}
    };
    load();
  }, []);

  const contact = settings?.contact || {};
  const phone = contact.phone || BUSINESS_INFO.phone;
  const phoneRaw = contact.phone?.replace(/\s/g, '') || BUSINESS_INFO.phoneRaw;

  return (
    <div className={styles.bottomBar}>
      <a href={`tel:${phone}`} className={styles.action}>
        <i className="fas fa-phone" />
        <span>Call</span>
      </a>
      <a 
        href={`https://wa.me/${phoneRaw}`} 
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
