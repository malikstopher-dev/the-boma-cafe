'use client';

import { SiteSettings } from '@/types';

const STORAGE_KEY = 'boma_site_settings';

const defaultSiteSettings: SiteSettings = {
  homepage: {
    heroTitle: 'The Boma Cafe',
    heroSubtitle: 'Where the Rustic Meets the Soulful!',
    heroBackgroundImage: '/hero/slide1.jpg',
    welcomeTitle: 'More than just a place to eat',
    welcomeDescription: 'The Boma Cafe is a place to experience!',
    ctaText: 'Book a Table',
    ctaLink: '/contact',
    featuredSectionTitle: 'Signature Dishes',
    featuredSectionSubtitle: "Explore our chef's recommended selections"
  },
  about: {
    heroTitle: 'Our Story',
    heroSubtitle: 'Discover the passion and tradition behind The Boma Cafe',
    heroImage: '/images/about.jpg',
    introTitle: 'Rustic Elegance in the Heart of Sandton',
    introDescription: 'Welcome to The Boma Cafe, where we believe dining should be an experience, not just a meal.',
    fullDescription: 'Nestled in the vibrant area of Sandton, our open-air restaurant offers a unique escape from the hustle and bustle of city life. With our signature thatched roof, cozy firepits, and lush greenery, we have created an atmosphere that feels like a retreat to the countryside.',
    missionTitle: 'Our Mission',
    missionDescription: 'To provide an unforgettable dining experience that celebrates the warmth of African hospitality while delivering exceptional cuisine.',
    valuesTitle: 'Our Values',
    valuesDescription: 'Quality, Warmth, Nature, and Soul - the pillars that guide everything we do.',
    additionalImage1: '/images/about.jpg',
    additionalImage2: '/images/about.jpg'
  },
  contact: {
    address: 'Sandton, Johannesburg, South Africa',
    phone: '072 996 2212',
    phone2: '072 996 2212',
    email: 'info@thebomacafe.co.za',
    whatsapp: 'https://wa.me/27715921190',
    openingHours: 'Mon-Sun: 8:00 AM - 10:00 PM',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3586.584890123456!2d28.0567!3f-26.0833!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e9573a1f9f9f9f9%3A0x1e9573a1f9f9f9f9f!2sSandton%2C%20Johannesburg%2C%20South%20Africa!5e0!3m2!1sen!2s!4v1630000000000!5m2!1sen!2s'
  },
  experience: {
    heroBadge: 'Discover',
    heroTitle: 'The Experience',
    heroSubtitle: 'More than just a restaurant — a destination for every occasion',
    videoEnabled: true,
    videoPath: '/videos/gallery.mp4',
    videoTitle: 'Experience The Boma Café',
    videoSubtitle: 'Book your table today'
  },
  events: {
    heroBadge: 'Celebrate',
    heroTitle: 'Events & Venue Hire',
    heroSubtitle: 'Host unforgettable celebrations at The Boma Café',
    slideshowEnabled: true,
    slideshowImages: [
      '/gallery/events/events-slideshow/slide1.webp',
      '/gallery/events/events-slideshow/slide2.webp',
      '/gallery/events/events-slideshow/slide3.webp',
      '/gallery/events/events-slideshow/slide4.webp',
      '/gallery/events/events-slideshow/slide5.webp',
      '/gallery/events/events-slideshow/slide6.webp',
      '/gallery/events/events-slideshow/slide7.jpg',
      '/gallery/events/events-slideshow/slide.webp',
      '/gallery/events/events-slideshow/2024-09-15.webp',
      '/gallery/events/events-slideshow/2025-04-23.webp',
      '/gallery/events/events-slideshow/2026-03-27.webp',
      '/gallery/events/events-slideshow/2026-04-19 (1).webp'
    ]
  },
  promoBar: {
    isEnabled: true,
    message: '🎉 Join us for Live Music every Friday & Saturday evening!',
    buttonText: 'View Events',
    buttonLink: '/events'
  },
  branding: {
    siteName: 'The Boma Cafe',
    siteTagline: 'Where the Rustic Meets the Soulful',
    logo: '/logo.png',
    favicon: '/favicon.ico',
    footerText: '© {year} The Boma Cafe. All rights reserved.',
    facebook: 'https://facebook.com/thebomacafe',
    instagram: 'https://instagram.com/thebomacafe',
    twitter: '',
    tiktok: 'https://tiktok.com/@thebomacafe',
    youtube: ''
  },
  seo: {
    homepageTitle: 'The Boma Cafe | Sandton - Where the Rustic Meets the Soulful',
    homepageDescription: 'Experience authentic rustic charm at The Boma Cafe in Sandton. A premium outdoor restaurant and events venue featuring firepits, thatched roofing, and soulful ambiance.',
    homepageKeywords: 'restaurant Sandton, Boma Cafe, outdoor dining Johannesburg, events venue, rustic restaurant, firepit dining, South African cuisine',
    ogImage: '/og-image.jpg',
    aboutTitle: 'About Us | The Boma Cafe',
    aboutDescription: 'Learn about The Boma Cafe story, our mission, and values. Experience rustic elegance in Sandton.',
    contactTitle: 'Contact Us | The Boma Cafe',
    contactDescription: 'Get in touch with The Boma Cafe. Book a table or plan your event at our premium Sandton venue.'
  },
  updatedAt: new Date().toISOString()
};

function getFromStorage(): SiteSettings {
  if (typeof window === 'undefined') return defaultSiteSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultSiteSettings, ...JSON.parse(stored) } : defaultSiteSettings;
  } catch {
    return defaultSiteSettings;
  }
}

function setToStorage(settings: SiteSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, updatedAt: new Date().toISOString() }));
  } catch (error) {
    console.error('Error saving site settings:', error);
  }
}

export const siteSettingsService = {
  getSiteSettings: (): SiteSettings => getFromStorage(),
  
  saveSiteSettings: (settings: SiteSettings): void => setToStorage(settings),
  
  getHomepageSettings: () => getFromStorage().homepage,
  saveHomepageSettings: (homepage: SiteSettings['homepage']) => {
    const current = getFromStorage();
    setToStorage({ ...current, homepage });
  },
  
  getAboutSettings: () => getFromStorage().about,
  saveAboutSettings: (about: SiteSettings['about']) => {
    const current = getFromStorage();
    setToStorage({ ...current, about });
  },
  
  getContactSettings: () => getFromStorage().contact,
  saveContactSettings: (contact: SiteSettings['contact']) => {
    const current = getFromStorage();
    setToStorage({ ...current, contact });
  },
  
  getExperienceSettings: () => getFromStorage().experience,
  saveExperienceSettings: (experience: SiteSettings['experience']) => {
    const current = getFromStorage();
    setToStorage({ ...current, experience });
  },
  
  getEventsSettings: () => getFromStorage().events,
  saveEventsSettings: (events: SiteSettings['events']) => {
    const current = getFromStorage();
    setToStorage({ ...current, events });
  },
  
  getPromoBarSettings: () => getFromStorage().promoBar,
  savePromoBarSettings: (promoBar: SiteSettings['promoBar']) => {
    const current = getFromStorage();
    setToStorage({ ...current, promoBar });
  },
  
  getBrandingSettings: () => getFromStorage().branding,
  saveBrandingSettings: (branding: SiteSettings['branding']) => {
    const current = getFromStorage();
    setToStorage({ ...current, branding });
  },
  
  getSEOSettings: () => getFromStorage().seo,
  saveSEOSettings: (seo: SiteSettings['seo']) => {
    const current = getFromStorage();
    setToStorage({ ...current, seo });
  },
  
  initializeDefaults: () => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setToStorage(defaultSiteSettings);
    }
  }
};

export function getSiteSettings(): SiteSettings {
  return siteSettingsService.getSiteSettings();
}

export function saveSiteSettings(settings: SiteSettings): void {
  siteSettingsService.saveSiteSettings(settings);
}