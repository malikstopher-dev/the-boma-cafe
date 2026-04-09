export interface MenuSize {
  name: string;
  price: number;
}

export interface MenuAddOn {
  name: string;
  price: number;
}

export interface MenuChoiceOption {
  name: string;
  price?: number;
}

export interface MenuChoice {
  groupName: string;
  required: boolean;
  options: MenuChoiceOption[];
  maxSelections?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category: string;
  subcategory?: string;
  image?: string;
  isFeatured: boolean;
  isOutOfStock: boolean;
  isOnPromo: boolean;
  promoBadge?: string;
  badge?: string;
  showOnHomepage: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  variants?: MenuSize[];
  flavours?: string[];
  addOns?: MenuAddOn[];
  choices?: MenuChoice[];
  notes?: string[];
  tags?: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  coverImage?: string;
  galleryImages: string[];
  ctaLink?: string;
  ticketLink?: string;
  status: 'upcoming' | 'past' | 'featured';
  showOnHomepage: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image?: string;
  validFrom: string;
  validUntil: string;
  ctaText: string;
  ctaLink: string;
  displayOnHomepage: boolean;
  displayAsPopup: boolean;
  displayOnMenu: boolean;
  displayOnPromotionsPage: boolean;
  isFeatured: boolean;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  title?: string;
  category: 'Events' | 'Food' | 'Venue' | 'People' | 'Promotions';
  isFeatured: boolean;
  order: number;
  createdAt: string;
}

export interface Popup {
  id: string;
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
}

export interface Announcement {
  id: string;
  text: string;
  isEnabled: boolean;
  link?: string;
  linkText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  text: string;
  author: string;
  location?: string;
  rating: number;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface HomepageSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroBackgroundImage: string;
  welcomeTitle: string;
  welcomeDescription: string;
  ctaText: string;
  ctaLink: string;
  featuredSectionTitle: string;
  featuredSectionSubtitle: string;
}

export interface AboutPageSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  introTitle: string;
  introDescription: string;
  fullDescription: string;
  missionTitle: string;
  missionDescription: string;
  valuesTitle: string;
  valuesDescription: string;
  additionalImage1: string;
  additionalImage2: string;
}

export interface ContactPageSettings {
  address: string;
  phone: string;
  phone2?: string;
  email: string;
  whatsapp?: string;
  openingHours: string;
  mapEmbedUrl: string;
}

export interface PromoBarSettings {
  isEnabled: boolean;
  message: string;
  buttonText: string;
  buttonLink: string;
}

export interface BrandingSettings {
  siteName: string;
  siteTagline: string;
  logo: string;
  favicon: string;
  footerText: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
}

export interface SEOSettings {
  homepageTitle: string;
  homepageDescription: string;
  homepageKeywords: string;
  ogImage: string;
  aboutTitle: string;
  aboutDescription: string;
  contactTitle: string;
  contactDescription: string;
}

export interface SiteSettings {
  homepage: HomepageSettings;
  about: AboutPageSettings;
  contact: ContactPageSettings;
  promoBar: PromoBarSettings;
  branding: BrandingSettings;
  seo: SEOSettings;
  updatedAt: string;
}