'use client';

import { useState, useEffect } from 'react';
import { cmsService } from '@/lib/client-cms';

export default function AdminDashboard() {
  const [menuItems, setMenuItems] = useState(0);
  const [events, setEvents] = useState(0);
  const [promotions, setPromotions] = useState(0);
  const [inquiries, setInquiries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [items, evts, promos, inqs] = await Promise.all([
          cmsService.getMenuItems(),
          cmsService.getEvents(),
          cmsService.getPromotions(),
          cmsService.getInquiries()
        ]);
        setMenuItems(items.length);
        setEvents(evts.length);
        setPromotions(promos.length);
        setInquiries(inqs.length);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  const stats = [
    { label: 'Menu Items', value: menuItems, icon: '🍽️', color: '#8B4513' },
    { label: 'Events', value: events, icon: '📅', color: '#D2691E' },
    { label: 'Promotions', value: promotions, icon: '🎉', color: '#F4A460' },
    { label: 'Inquiries', value: inquiries, icon: '✉️', color: '#C9A962' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>Dashboard</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>Welcome to The Boma Cafe Admin</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>{stat.icon}</span>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: stat.color }} />
            </div>
            <h3 style={{ fontSize: '2rem', color: 'var(--dark-brown)', marginBottom: '0.25rem' }}>{stat.value}</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)', marginBottom: '1.5rem' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/admin/menu" className="btn btn-primary">Manage Menu</a>
          <a href="/admin/events" className="btn btn-primary">Manage Events</a>
          <a href="/admin/promotions" className="btn btn-primary">Manage Promotions</a>
          <a href="/admin/popup" className="btn btn-primary">Configure Popup</a>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ marginTop: '2rem', background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)', marginBottom: '1rem' }}>Getting Started</h2>
        <p style={{ color: 'var(--text-light)', lineHeight: 1.7 }}>
          Use the sidebar to navigate between different sections. You can manage your menu items, events, promotions, 
          gallery, and more. The popup and announcement bar can be configured to show special offers or messages on your website.
        </p>
      </div>
    </div>
  );
}