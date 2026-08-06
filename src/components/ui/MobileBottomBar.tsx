'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Phone, Utensils, CalendarCheck } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { BUSINESS_INFO } from '@/lib/whatsappConfig';
import styles from './MobileBottomBar.module.css';

export default function MobileBottomBar() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/cms/public');
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
        <Phone size={18} />
        <span>Call</span>
      </a>
      <a 
        href={`https://wa.me/${phoneRaw}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className={styles.action}
      >
        <WhatsAppIcon size={18} ariaLabel="Chat on WhatsApp" />
        <span>WhatsApp</span>
      </a>
      <Link href="/menu" className={styles.action}>
        <Utensils size={18} />
        <span>Menu</span>
      </Link>
      <Link href="/book-event" className={styles.action}>
        <CalendarCheck size={18} />
        <span>Book</span>
      </Link>
    </div>
  );
}
