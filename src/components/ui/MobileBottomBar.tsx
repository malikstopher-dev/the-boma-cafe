'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { BUSINESS_INFO } from '@/lib/whatsappConfig';
import styles from './MobileBottomBar.module.css';

export default function MobileBottomBar() {
  const pathname = usePathname();
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

  // Hide on staff/admin/waiter pages (they have their own nav)
  if (pathname.startsWith('/staff') || pathname.startsWith('/admin') || pathname.startsWith('/waiter')) return null;

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
      <Link href="/book-event" className={styles.action}>
        <i className="fas fa-calendar-check" />
        <span>Book</span>
      </Link>
    </div>
  );
}
