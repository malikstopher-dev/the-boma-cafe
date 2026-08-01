'use client';

import { useState } from 'react';
import Link from 'next/link';

const contentSections = [
  {
    title: 'Home',
    items: [
      { label: 'Hero Section', href: '/admin/site-settings', description: 'Hero title, subtitle, background image' },
      { label: 'Experience Cards', href: '/admin/site-settings', description: 'Welcome section, featured content' },
      { label: 'CTA Buttons', href: '/admin/site-settings', description: 'Call-to-action buttons and links' },
    ]
  },
  {
    title: 'Experience',
    items: [
      { label: 'Dining Section', href: '/admin/site-settings', description: 'Title, subtitle, description, highlights, image, CTA' },
      { label: 'Bisou El Patrona', href: '/admin/site-settings', description: 'Lounge section content' },
      { label: 'Weekend Buffet', href: '/admin/site-settings', description: 'Buffet highlight section' },
    ]
  },
  {
    title: 'Entertainment',
    items: [
      { label: 'Content Sections', href: '/admin/site-settings', description: 'Hero, intro, DJ, karaoke, live performance content' },
    ]
  },
  {
    title: 'Events & Venue Hire',
    items: [
      { label: 'Upcoming Events', href: '/admin/events', description: 'Add, edit, delete upcoming events' },
      { label: 'Past Events', href: '/admin/events', description: 'View past events, recaps' },
      { label: 'Last Week Highlight', href: '/admin/events', description: 'Video section, title, CTA' },
      { label: 'Event Galleries', href: '/admin/gallery', description: 'Upload/manage event photos' },
      { label: 'Venue Content', href: '/admin/site-settings', description: 'Venue hire intro, event types, CTA' },
    ]
  },
  {
    title: 'Promotions',
    items: [
      { label: 'Weekend Breakfast Popup', href: '/admin/popup', description: 'Timed weekend popup (Sat-Sun 9:30-12:30)' },
      { label: 'Promotions', href: '/admin/promotions', description: 'Manage site-wide promotions' },
    ]
  },
  {
    title: 'Gallery',
    items: [
      { label: 'Events Images', href: '/admin/gallery', description: 'Upload/manage events photos' },
      { label: 'Food Images', href: '/admin/gallery', description: 'Upload/manage food photos' },
      { label: 'Venue Images', href: '/admin/gallery', description: 'Upload/manage venue photos' },
      { label: 'People Images', href: '/admin/gallery', description: 'Upload/manage people photos' },
      { label: 'Promotions Images', href: '/admin/gallery', description: 'Upload/manage promotions photos' },
    ]
  },
  {
    title: 'Menu',
    items: [
      { label: 'Menu Items', href: '/admin/menu', description: 'Add/edit menu items and prices' },
      { label: 'Categories', href: '/admin/categories', description: 'Manage menu categories' },
      { label: 'Bar Menu', href: '/admin/bar-menu', description: 'Add/edit drinks, cocktails, beverages' },
    ]
  },
  {
    title: 'Contact',
    items: [
      { label: 'Contact Info', href: '/admin/site-settings', description: 'Address, phone, email, hours, map' },
    ]
  },
];

export default function ContentMapPage() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div style={{ padding: '0 0.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F0EBE3', marginBottom: '0.5rem' }}>Content Map</h1>
        <p style={{ color: '#A09888', fontSize: '1rem' }}>Navigate to manage website content</p>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {contentSections.map((section) => (
          <div 
            key={section.title}
            style={{ 
              background: '#1E1A14', 
              border: '1px solid #3A3428',
              borderRadius: '12px', 
              padding: '1.75rem',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
          >
            <h2 style={{ 
              fontSize: 18, 
              fontWeight: 600,
              color: '#F0EBE3', 
              marginBottom: '1.25rem',
              paddingBottom: '0.875rem',
              borderBottom: '1px solid #3A3428'
            }}>
              {section.title}
            </h2>
            <div style={{ display: 'grid', gap: '0.875rem' }}>
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1rem 1.25rem',
                    background: hoveredItem === item.label ? '#C8A04E' : '#242018',
                    border: '1px solid #3A3428',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    transform: hoveredItem === item.label ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'all 0.2s ease',
                    boxShadow: hoveredItem === item.label ? '0 4px 12px rgba(0,0,0,0.4)' : 'none'
                  }}
                >
                  <span style={{ 
                    fontWeight: 600, 
                    color: hoveredItem === item.label ? '#1A1610' : '#F0EBE3',
                    fontSize: '1rem',
                    marginBottom: '0.25rem'
                  }}>
                    {item.label}
                  </span>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    color: hoveredItem === item.label ? 'rgba(26,22,16,0.75)' : '#A09888'
                  }}>
                    {item.description}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
