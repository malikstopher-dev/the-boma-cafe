'use client';

import { MenuItem, MenuCategory, Event, Promotion, GalleryItem, Popup, Announcement, SiteSettings, Testimonial, ContactInquiry } from '@/types';
import { 
  defaultSettings, 
  defaultCategories, 
  defaultMenuItems, 
  defaultEvents, 
  defaultPromotions,
  defaultGallery,
  defaultPopup,
  defaultAnnouncement,
  defaultTestimonials
} from '@/data/defaultData';

const STORAGE_KEYS = {
  settings: 'boma_settings',
  categories: 'boma_categories',
  menuItems: 'boma_menuItems',
  events: 'boma_events',
  promotions: 'boma_promotions',
  gallery: 'boma_gallery',
  popup: 'boma_popup',
  announcement: 'boma_announcement',
  testimonials: 'boma_testimonials',
  inquiries: 'boma_inquiries'
};

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage:`, error);
  }
}

export const dataService = {
  // Settings
  getSettings: () => getFromStorage(STORAGE_KEYS.settings, defaultSettings),
  saveSettings: (settings: SiteSettings) => setToStorage(STORAGE_KEYS.settings, settings),

  // Categories
  getCategories: () => getFromStorage(STORAGE_KEYS.categories, defaultCategories),
  saveCategories: (categories: MenuCategory[]) => setToStorage(STORAGE_KEYS.categories, categories),

  // Menu Items
  getMenuItems: () => getFromStorage(STORAGE_KEYS.menuItems, defaultMenuItems),
  saveMenuItems: (items: MenuItem[]) => setToStorage(STORAGE_KEYS.menuItems, items),

  // Events
  getEvents: () => getFromStorage(STORAGE_KEYS.events, defaultEvents),
  saveEvents: (events: Event[]) => setToStorage(STORAGE_KEYS.events, events),

  // Promotions
  getPromotions: () => getFromStorage(STORAGE_KEYS.promotions, defaultPromotions),
  savePromotions: (promotions: Promotion[]) => setToStorage(STORAGE_KEYS.promotions, promotions),

  // Gallery
  getGallery: () => getFromStorage(STORAGE_KEYS.gallery, defaultGallery),
  saveGallery: (gallery: GalleryItem[]) => setToStorage(STORAGE_KEYS.gallery, gallery),

  // Popup
  getPopup: () => getFromStorage(STORAGE_KEYS.popup, defaultPopup),
  savePopup: (popup: Popup) => setToStorage(STORAGE_KEYS.popup, popup),

  // Announcement
  getAnnouncement: () => getFromStorage(STORAGE_KEYS.announcement, defaultAnnouncement),
  saveAnnouncement: (announcement: Announcement) => setToStorage(STORAGE_KEYS.announcement, announcement),

  // Testimonials
  getTestimonials: () => getFromStorage(STORAGE_KEYS.testimonials, defaultTestimonials),
  saveTestimonials: (testimonials: Testimonial[]) => setToStorage(STORAGE_KEYS.testimonials, testimonials),

  // Inquiries
  getInquiries: () => getFromStorage(STORAGE_KEYS.inquiries, [] as ContactInquiry[]),
  saveInquiries: (inquiries: ContactInquiry[]) => setToStorage(STORAGE_KEYS.inquiries, inquiries),

  // Clear all data (for admin reset)
  clearAllData: () => {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },

  // Initialize with defaults
  initializeDefaults: () => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.settings)) {
      setToStorage(STORAGE_KEYS.settings, defaultSettings);
    }
    if (!localStorage.getItem(STORAGE_KEYS.categories)) {
      setToStorage(STORAGE_KEYS.categories, defaultCategories);
    }
    if (!localStorage.getItem(STORAGE_KEYS.menuItems)) {
      setToStorage(STORAGE_KEYS.menuItems, defaultMenuItems);
    } else {
      // Always sync menu items with latest defaults (including images)
      const existing = getFromStorage(STORAGE_KEYS.menuItems) as any[];
      const defaultIds = defaultMenuItems.map(m => m.id);
      const updated = existing.map(item => {
        const defaultItem = defaultMenuItems.find(d => d.id === item.id);
        if (defaultItem && defaultItem.image) {
          return { ...item, image: defaultItem.image };
        }
        return item;
      });
      setToStorage(STORAGE_KEYS.menuItems, updated);
    }
    if (!localStorage.getItem(STORAGE_KEYS.events)) {
      setToStorage(STORAGE_KEYS.events, defaultEvents);
    }
    if (!localStorage.getItem(STORAGE_KEYS.promotions)) {
      setToStorage(STORAGE_KEYS.promotions, defaultPromotions);
    }
    if (!localStorage.getItem(STORAGE_KEYS.gallery)) {
      setToStorage(STORAGE_KEYS.gallery, defaultGallery);
    }
    if (!localStorage.getItem(STORAGE_KEYS.popup)) {
      setToStorage(STORAGE_KEYS.popup, defaultPopup);
    }
    if (!localStorage.getItem(STORAGE_KEYS.announcement)) {
      setToStorage(STORAGE_KEYS.announcement, defaultAnnouncement);
    }
    if (!localStorage.getItem(STORAGE_KEYS.testimonials)) {
      setToStorage(STORAGE_KEYS.testimonials, defaultTestimonials);
    }
  }
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}