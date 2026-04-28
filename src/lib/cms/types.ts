export interface SiteSettings {
  siteName: string;
  siteTagline: string;
  logo: string;
  favicon: string;
  footerText: string;
  phone: string;
  phone2: string;
  email: string;
  address: string;
  openingHours: string;
  mapEmbedUrl: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  youtube: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  order: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  image?: string;
  sizes?: { name: string; price: string }[];
  addOns?: { name: string; price: string }[];
  options?: string[];
  isAvailable: boolean;
  order: number;
}

export interface Event {
  id: string;
  title: string;
  slug?: string;
  date: string;
  time: string;
  description: string;
  image?: string;
  category?: string;
  coverImage?: string;
  images?: string[];
  isFeatured: boolean;
  isUpcoming: boolean;
  order: number;
  ctaLabel?: string;
  ctaLink?: string;
  location?: string;
  visible?: boolean;
}

export interface LastWeekHighlight {
  id: string;
  title: string;
  description?: string;
  videoSrc?: string;
  posterImage?: string;
  ctaLabel?: string;
  ctaLink?: string;
  visible?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image: string;
  priceText?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  order: number;
}

export interface GalleryItem {
  id: string;
  url: string;
  title?: string;
  category: 'Events' | 'Food' | 'Venue' | 'People' | 'Promotions';
  isFeatured: boolean;
  order: number;
}

export interface Popup {
  type: 'promotion' | 'event' | 'announcement';
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
}

export interface Announcement {
  text: string;
  link?: string;
  linkText?: string;
  isEnabled: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  text: string;
  rating?: number;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface PageContent {
  home: {
    heroTitle: string;
    heroSubtitle: string;
    heroImage: string;
    heroVideo?: string;
    ctaText: string;
    ctaLink: string;
    featuredEventsTitle: string;
    featuredPromotionsTitle: string;
  };
  about: {
    title: string;
    content: string;
    image: string;
  };
}
