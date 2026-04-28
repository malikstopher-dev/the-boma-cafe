import { SiteSettings, MenuCategory, MenuItem, Event, Promotion, GalleryItem, Popup, Announcement, Testimonial, LastWeekHighlight } from './types';

export const defaultSettings: SiteSettings = {
  siteName: 'The Boma Cafe',
  siteTagline: 'Where the Rustic Meets the Soulful',
  logo: '/logo.png',
  favicon: '/favicon.ico',
  footerText: '© {year} The Boma Cafe. All rights reserved.',
  phone: '072 996 2212',
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
  { id: 'evt-1', title: 'Weekend Buffet Experience', date: '2026-04-25', time: '12:00 PM - 3:00 PM', description: 'Indulge in our legendary weekend buffet with fresh salads, grilled meats, local delicacies, and decadent desserts. Perfect for family gatherings.', category: 'Buffet', image: '/gallery/events/2025-04-23.webp', images: ['/gallery/events/2025-04-23.webp', '/gallery/events/2024-09-15.webp'], isFeatured: true, isUpcoming: true, order: 1, ctaLabel: 'Book Table', ctaLink: '/contact', location: 'The Boma Café', visible: true },
  { id: 'evt-2', title: 'Live DJ Night', date: '2026-04-25', time: '8:00 PM - Late', description: 'Experience electrifying beats with our resident DJ spinning the hottest tracks. Dance the night away in our vibrant atmosphere.', category: 'DJ Night', image: '/gallery/events/2024-09-15.webp', images: ['/gallery/events/2024-09-15.webp', '/gallery/gallery/bomacafe2-large-1.jpg'], isFeatured: false, isUpcoming: true, order: 2, ctaLabel: 'Reserve Spot', ctaLink: '/contact', location: 'Main Deck', visible: true },
  { id: 'evt-3', title: 'Karaoke Evening', date: '2026-04-26', time: '7:00 PM - 11:00 PM', description: 'Showcase your vocal talents! Join us for a fun-filled karaoke night with friendly competition and great prizes.', category: 'Karaoke', image: '/gallery/events/2025-03-01.webp', images: ['/gallery/events/2025-03-01.webp'], isFeatured: false, isUpcoming: true, order: 3, ctaLabel: 'Sign Up', ctaLink: '/contact', location: 'Lounge', visible: true },
  { id: 'evt-4', title: 'Sunday Family Lunch', date: '2026-04-26', time: '12:00 PM - 3:00 PM', description: 'Quality time with family over delicious food. Kids eat free with paying adults. Create lasting memories.', category: 'Family', image: '/gallery/events/2025-01-20.webp', images: ['/gallery/events/2025-01-20.webp', '/gallery/events/2025-04-23.webp'], isFeatured: false, isUpcoming: true, order: 4, ctaLabel: 'Book Family Table', ctaLink: '/contact', location: 'Garden Area', visible: true },
  { id: 'evt-5', title: 'Venue Hire Showcase', date: '2026-05-01', time: 'By Appointment', description: 'Looking for the perfect venue? Book a showcase tour and discover why The Boma Café is Sandton\'s most sought-after event space.', category: 'Venue Hire', image: '/gallery/gallery/bomacafe2-large-1.jpg', images: ['/gallery/gallery/bomacafe2-large-1.jpg', '/gallery/gallery/bomacafe4-large.jpg', '/gallery/gallery/bomacafe6-large.jpg'], isFeatured: false, isUpcoming: true, order: 5, ctaLabel: 'Schedule Tour', ctaLink: '/contact', location: 'All Areas', visible: true },
  { id: 'evt-past-1', title: 'Valentine\'s Dinner', date: '2026-02-14', time: '6:00 PM - 10:00 PM', description: 'A magical evening of romance with a special 5-course menu, live serenade, and champagne surprises. Couples\' favorite.', category: 'Celebration', image: '/gallery/events/2025-02-14.webp', images: ['/gallery/events/2025-02-14.webp', '/gallery/events/2025-01-20.webp'], isFeatured: false, isUpcoming: false, order: 1, visible: true },
  { id: 'evt-past-2', title: 'Easter Weekend Celebration', date: '2026-04-18', time: '10:00 AM - 6:00 PM', description: 'Easter fun for the whole family with egg hunting, festive meals, and entertainment.', category: 'Celebration', image: '/gallery/events/2025-04-23.webp', images: ['/gallery/events/2025-04-23.webp', '/gallery/events/2025-03-01.webp'], isFeatured: false, isUpcoming: false, order: 2, visible: true },
  { id: 'evt-past-3', title: 'Mr Magic Live', date: '2026-04-11', time: '8:00 PM - 11:00 PM', description: 'Mind-bending magic and illusion show. An unforgettable night of wonder and entertainment.', category: 'Live Music', image: '/gallery/events/2024-09-15.webp', images: ['/gallery/events/2024-09-15.webp'], isFeatured: false, isUpcoming: false, order: 3, visible: true },
  { id: 'evt-past-4', title: 'Thursday Burger Special', date: '2026-04-17', time: '5:00 PM - 9:00 PM', description: 'Our famous gourmet burgers with craft beers. Half-price burgers from 5-7PM!', category: 'Buffet', image: '/gallery/events/2025-04-23.webp', images: ['/gallery/events/2025-04-23.webp'], isFeatured: false, isUpcoming: false, order: 4, visible: true },
  { id: 'evt-past-5', title: 'Live Music Night', date: '2026-04-10', time: '7:00 PM - 10:00 PM', description: 'Local band delivered an incredible acoustic set. Great vibes, great food, great company.', category: 'Live Music', image: '/gallery/events/2024-09-15.webp', images: ['/gallery/events/2024-09-15.webp', '/gallery/gallery/bomacafe2-large-1.jpg'], isFeatured: false, isUpcoming: false, order: 5, visible: true },
];

export const defaultLastWeekHighlight: LastWeekHighlight = {
  id: 'hlw-1',
  title: 'Last Week at The Boma Café',
  description: 'Missed the action? Here\'s what went down last week - live music, great food, and good vibes!',
  videoSrc: '/videos/gallery.mp4',
  posterImage: '/gallery/events/2025-04-23.webp',
  ctaLabel: 'Book This Weekend',
  ctaLink: '/contact',
  visible: true,
  autoplay: true,
  muted: true,
  loop: true
};

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
