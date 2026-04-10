import { SiteSettings, MenuCategory, MenuItem, Event, Promotion, GalleryItem, Popup, Announcement, Testimonial } from './types';

export const defaultSettings: SiteSettings = {
  siteName: 'The Boma Cafe',
  siteTagline: 'Where the Rustic Meets the Soulful',
  logo: '/logo.png',
  favicon: '/favicon.ico',
  footerText: '© {year} The Boma Cafe. All rights reserved.',
  phone: '071 592 1190',
  phone2: '072 996 2212',
  email: 'info@thebomacafe.co.za',
  address: 'Sandton, Johannesburg, South Africa',
  openingHours: 'Mon-Sun: 8:00 AM - 10:00 PM',
  mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3586.584890123456!2d28.0567!3f-26.0833!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e9573a1f9f9f9f9%3A0x1e9573a1f9f9f9f9f!2sSandton%2C%20Johannesburg%2C%20South%20Africa!5e0!3m2!1sen!2s!4v1630000000000!5m2!1sen!2s',
  whatsapp: 'https://wa.me/27715921190',
  facebook: 'https://facebook.com/thebomacafe',
  instagram: 'https://instagram.com/thebomacafe',
  twitter: '',
  tiktok: 'https://tiktok.com/@thebomacafe',
  youtube: ''
};

export const defaultCategories: MenuCategory[] = [
  { id: 'cat-1', name: 'Breakfast', description: 'Start your day right', order: 1, isActive: true },
  { id: 'cat-2', name: 'Mains', description: 'Hearty main dishes', order: 2, isActive: true },
  { id: 'cat-3', name: 'Drinks', description: 'Refresh yourself', order: 3, isActive: true },
  { id: 'cat-4', name: 'Desserts', description: 'Sweet endings', order: 4, isActive: true },
];

export const defaultMenuItems: MenuItem[] = [
  { id: 'item-1', categoryId: 'cat-1', name: 'Full English Breakfast', description: 'Eggs, bacon, sausage, toast, beans, tomato', price: 'R125', isAvailable: true, order: 1 },
  { id: 'item-2', categoryId: 'cat-2', name: 'Boma Platter', description: 'Grilled meats, pap, vegetables, sauce', price: 'R295', isAvailable: true, order: 1 },
  { id: 'item-3', categoryId: 'cat-3', name: 'Craft Beer', description: 'Local and imported beers', price: 'R65', isAvailable: true, order: 1 },
];

export const defaultEvents: Event[] = [
  { id: 'evt-1', title: 'Live Jazz Night', date: '2026-04-18', time: '7:00 PM', description: 'Enjoy smooth jazz by the fire', image: '/gallery/events/2024-09-15.webp', isFeatured: true, isUpcoming: true, order: 1 },
  { id: 'evt-2', title: 'Sunday Braai', date: '2026-04-19', time: '12:00 PM', description: 'Classic South African braai', image: '/gallery/events/2025-04-23.webp', isFeatured: false, isUpcoming: true, order: 2 },
];

export const defaultPromotions: Promotion[] = [
  { id: 'promo-1', title: 'Weekend Special', description: '20% off all mains on Saturday', image: '/gallery/promotions/2024-07-31.jpg', priceText: '20% OFF', isActive: true, order: 1 },
  { id: 'promo-2', title: 'Happy Hour', description: 'Buy 2 drinks, get 1 free', image: '/gallery/promotions/2025-04-23.jpg', priceText: 'BUY 2 GET 1', isActive: true, order: 2 },
];

export const defaultGallery: GalleryItem[] = [
  { id: 'gal-1', url: '/gallery/gallery/bomacafe2-large-1.jpg', title: 'Boma Cafe Exterior', category: 'Venue', isFeatured: true, order: 1 },
  { id: 'gal-2', url: '/gallery/gallery/boy.jpg', title: 'Happy Guest', category: 'People', isFeatured: false, order: 2 },
];

export const defaultPopup: Popup = {
  type: 'announcement',
  title: 'Welcome to The Boma Cafe',
  description: 'Experience authentic rustic dining',
  ctaText: 'View Menu',
  ctaLink: '/menu',
  isEnabled: false,
  showOncePerSession: true,
  startDate: '2026-01-01',
  endDate: '2026-12-31'
};

export const defaultAnnouncement: Announcement = {
  text: '🎉 Join us for Live Music every Friday & Saturday evening!',
  link: '/events',
  linkText: 'View Events',
  isEnabled: true
};

export const defaultTestimonials: Testimonial[] = [
  { id: 'test-1', name: 'Sarah M.', text: 'Amazing food and atmosphere!', rating: 5 },
  { id: 'test-2', name: 'John D.', text: 'Best boma experience in Johannesburg', rating: 5 },
];
