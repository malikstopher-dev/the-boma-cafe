'use client';

import { SiteSettings, MenuCategory, MenuItem, Event, Promotion, GalleryItem, Popup, Announcement, Testimonial, ContactInquiry, LastWeekHighlight } from '@/lib/cms/types';

interface AllSiteSettings {
  homepage: any;
  about: any;
  experience: any;
  entertainment: any;
  venueHire: any;
  contact: any;
  promoBar: any;
  branding: any;
  seo: any;
  updatedAt?: string;
}

const defaultAllSettings: AllSiteSettings = {
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
  experience: {
    heroTitle: 'The Experience',
    heroSubtitle: 'More than just a restaurant — a destination for every occasion',
    heroBadge: 'Discover',
    diningTitle: 'Dining',
    diningSubtitle: 'Rustic Outdoor Restaurant',
    diningDescription: 'Experience authentic outdoor dining beneath our signature thatched roof. From hearty breakfasts to wood-fired pizzas and flame-grilled specialties, every meal is crafted with fresh, locally-sourced ingredients.',
    diningHighlights: 'Thatched roof ambiance, Open-air seating, Fresh local ingredients, Cozy firepits',
    diningImage: '/hero/hero-experience.jpg',
    diningCta: 'View Menu',
    diningCtaLink: '/menu',
    puffTitle: 'Puff Lounge',
    puffSubtitle: 'A Different Vibe',
    puffDescription: 'A separate lounge area with a distinct atmosphere from our main restaurant. Enjoy curated music, a relaxed social setting, and your own space to unwind.',
    puffHighlights: 'Separate lounge area, Curated music selection, Relaxed social vibe, Intimate setting',
    puffImage: '/hero/hero-experience.jpg',
    puffCta: 'Learn More',
    puffCtaLink: '/contact',
    familyTitle: 'Family & Activities',
    familySubtitle: 'Fun for All Ages',
    familyDescription: 'A welcoming destination for families. Let the little ones explore our dedicated kiddies area, enjoy clay painting activities, and create cherished memories together.',
    familyHighlights: 'Kiddies play area, Clay painting activity, Family-friendly atmosphere, Spacious outdoor setting',
    familyImage: '/hero/hero-experience.jpg',
    familyCta: 'Plan Your Visit',
    familyCtaLink: '/contact',
    weekendTitle: 'Weekend Buffet',
    weekendDescription: 'Join us on weekends for our signature buffet experience. Enjoy a wide variety of dishes, from aromatic curries to grilled specialties, in our relaxed outdoor setting.',
    weekendCta: 'View Menu',
    weekendCtaLink: '/menu'
  },
  entertainment: {
    heroTitle: 'Live Entertainment',
    heroSubtitle: 'Thursday to Sunday — music, energy, and unforgettable evenings',
    heroBadge: 'Entertainment',
    introTitle: 'Every Weekend is a Celebration',
    introDescription: 'The Boma Café comes alive from Thursday to Sunday with a vibrant lineup of entertainment. Whether you\'re here for a relaxed dinner or a night of dancing, our live music creates the perfect atmosphere.',
    djTitle: 'Live DJs',
    djDescription: 'Feel the rhythm with our talented DJs spinning curated tracks across various genres.',
    karaokeTitle: 'Karaoke',
    karaokeDescription: 'Step into the spotlight and showcase your vocals in our lively karaoke sessions.',
    liveTitle: 'Live Performances',
    liveDescription: 'Experience passionate performances from local and visiting artists.',
    vibeTitle: 'Weekend Evenings at The Boma Café',
    vibeDescription: 'As the sun sets, The Boma Café transforms into the ultimate weekend destination. Gather with friends, enjoy great food and drinks, and let the music set the mood for an unforgettable evening.',
    vibeImage: '/hero/hero-entertainment.jpg',
    ctaBook: 'Book a Table',
    ctaFollow: 'Follow Us'
  },
  venueHire: {
    heroTitle: 'Events & Venue Hire',
    heroSubtitle: 'Host your special occasions at The Boma Café',
    heroBadge: 'Celebrate',
    introTitle: 'Host Your Special Occasion',
    introDescription: 'From intimate gatherings to grand celebrations, The Boma Café offers a stunning backdrop for your event.',
    meetingTitle: 'Meetings',
    meetingDesc: 'Professional spaces for corporate gatherings',
    yearEndTitle: 'Year-End Functions',
    yearEndDesc: 'Celebrate achievements in style',
    weddingTitle: 'Weddings',
    weddingDesc: 'Create magical moments in our rustic setting',
    privateTitle: 'Private Functions',
    privateDesc: 'Birthdays, anniversaries, and more',
    ctaTitle: 'Ready to Host?',
    ctaDescription: 'From corporate functions to private celebrations, we make it memorable',
    cta: 'Enquire Now',
    ctaLink: '/contact'
  },
  contact: {
    address: 'Sandton, Johannesburg, South Africa',
    phone: '072 996 2212',
    phone2: '072 996 2212',
    email: 'info@thebomacafe.co.za',
    whatsapp: 'https://wa.me/27715921190',
    openingHours: 'Mon-Sun: 8:00 AM - 10:00 PM',
    mapEmbedUrl: ''
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
  }
};

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  // Handle auth errors specifically - return the error response instead of throwing
  if (res.status === 401) {
    // Try to parse error response, but handle parsing failures
    let errorObj = { error: 'Invalid password' };
    try {
      const text = await res.text();
      if (text) {
        errorObj = JSON.parse(text);
      }
    } catch (e) {
      // If parsing fails, use default
    }
    // Return the error as a valid response for auth endpoints
    if (endpoint.includes('/api/admin/auth')) {
      return errorObj as T;
    }
    throw new Error(errorObj.error || 'Invalid credentials');
  }
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }
  
  return res.json();
}

export const cmsService = {
  // Auth
  verifyAuth: () => fetchApi<{ authenticated: boolean; user?: any }>('/api/admin/auth'),
  login: (password: string) => fetchApi<{ success: boolean; user?: any }>('/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ password }),
  }),

  // Unified All Settings (homepage, about, contact, promoBar, branding, seo)
  getAllSettings: () => fetchApi<AllSiteSettings>('/api/cms/all-settings'),
  saveAllSettings: (settings: AllSiteSettings) => fetchApi<{ success: boolean }>('/api/cms/all-settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),

  // Simple Settings (for backwards compatibility)
  getSettings: () => fetchApi<SiteSettings>('/api/cms/all-settings'),
  saveSettings: (settings: SiteSettings) => fetchApi<{ success: boolean }>('/api/cms/all-settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),

  // Categories
  getCategories: () => fetchApi<{ categories: MenuCategory[]; menuItems: MenuItem[] }>('/api/cms/menu').then(r => r.categories),
  saveCategory: (category: MenuCategory) => fetchApi<{ success: boolean; data: MenuCategory }>('/api/cms/menu', {
    method: category.id ? 'PUT' : 'POST',
    body: JSON.stringify(category),
  }),
  deleteCategory: (id: string) => fetchApi<{ success: boolean }>(`/api/cms/menu?id=${id}`, {
    method: 'DELETE',
  }),

  // Menu Items
  getMenuItems: () => fetchApi<{ categories: MenuCategory[]; menuItems: MenuItem[] }>('/api/cms/menu').then(r => r.menuItems),
  saveMenuItem: (item: MenuItem) => fetchApi<{ success: boolean; data: MenuItem }>('/api/cms/menu', {
    method: item.id ? 'PUT' : 'POST',
    body: JSON.stringify(item),
  }),
  deleteMenuItem: (id: string) => fetchApi<{ success: boolean }>(`/api/cms/menu?itemId=${id}`, {
    method: 'DELETE',
  }),

  // Events
  getEvents: () => fetchApi<Event[]>('/api/cms/events'),
  saveEvent: (event: Event) => fetchApi<{ success: boolean; data: Event }>('/api/cms/events', {
    method: event.id ? 'PUT' : 'POST',
    body: JSON.stringify(event),
  }),
  deleteEvent: (id: string) => fetchApi<{ success: boolean }>(`/api/cms/events?id=${id}`, {
    method: 'DELETE',
  }),
  reorderEvents: (events: Event[]) => fetchApi<{ success: boolean }>('/api/cms/events', {
    method: 'PATCH',
    body: JSON.stringify({ events }),
  }),

  // Last Week Highlight
  getLastWeekHighlight: () => fetchApi<LastWeekHighlight>('/api/cms/last-week'),
  saveLastWeekHighlight: (highlight: LastWeekHighlight) => fetchApi<{ success: boolean }>('/api/cms/last-week', {
    method: 'POST',
    body: JSON.stringify(highlight),
  }),

  // Promotions
  getPromotions: () => fetchApi<Promotion[]>('/api/cms/promotions'),
  savePromotion: (promotion: Promotion) => fetchApi<{ success: boolean; data: Promotion }>('/api/cms/promotions', {
    method: promotion.id ? 'PUT' : 'POST',
    body: JSON.stringify(promotion),
  }),
  deletePromotion: (id: string) => fetchApi<{ success: boolean }>(`/api/cms/promotions?id=${id}`, {
    method: 'DELETE',
  }),
  reorderPromotions: (promotions: Promotion[]) => fetchApi<{ success: boolean }>('/api/cms/promotions', {
    method: 'PATCH',
    body: JSON.stringify({ promotions }),
  }),

  // Gallery
  getGallery: () => fetchApi<{ gallery: GalleryItem[]; boards: any[] }>('/api/cms/gallery').then(r => r.gallery),
  saveGalleryItem: (item: GalleryItem) => fetchApi<{ success: boolean; data: GalleryItem }>('/api/cms/gallery', {
    method: item.id ? 'PUT' : 'POST',
    body: JSON.stringify(item),
  }),
  deleteGalleryItem: (id: string) => fetchApi<{ success: boolean }>(`/api/cms/gallery?id=${id}`, {
    method: 'DELETE',
  }),
  reorderGallery: (items: GalleryItem[]) => fetchApi<{ success: boolean }>('/api/cms/gallery', {
    method: 'PATCH',
    body: JSON.stringify({ items }),
  }),

  // Announcement
  getAnnouncement: () => fetchApi<Announcement>('/api/cms/announcement'),
  saveAnnouncement: (announcement: Announcement) => fetchApi<{ success: boolean }>('/api/cms/announcement', {
    method: 'POST',
    body: JSON.stringify(announcement),
  }),

  // Popup
  getPopup: () => fetchApi<Popup>('/api/cms/popup'),
  savePopup: (popup: Popup) => fetchApi<{ success: boolean }>('/api/cms/popup', {
    method: 'POST',
    body: JSON.stringify(popup),
  }),

  // Inquiries
  getInquiries: () => fetchApi<ContactInquiry[]>('/api/cms/inquiries'),
  saveInquiry: (inquiry: ContactInquiry) => fetchApi<{ success: boolean }>('/api/cms/inquiries', {
    method: 'POST',
    body: JSON.stringify(inquiry),
  }),
  markInquiryRead: (id: string) => fetchApi<{ success: boolean }>(`/api/cms/inquiries?id=${id}`, {
    method: 'PATCH',
  }),

  // Upload
  uploadFile: async (file: File): Promise<{ success: boolean; url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch('/api/cms/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }
    
    return res.json();
  },
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}