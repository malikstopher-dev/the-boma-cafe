export interface GalleryCategory {
  id: string;
  name: string;
  folder: string;
  icon: string;
}

export interface GalleryImage {
  url: string;
  alt?: string;
}

export const galleryCategories: GalleryCategory[] = [
  { id: 'events', name: 'Events', folder: 'events', icon: '🎉' },
  { id: 'food', name: 'Food', folder: 'food', icon: '🍽️' },
  { id: 'venue', name: 'Venue', folder: 'venue', icon: '🏠' },
  { id: 'people', name: 'People', folder: 'people', icon: '👥' },
  { id: 'promotions', name: 'Promotions', folder: 'promotions', icon: '🎁' },
];

export const galleryImages: Record<string, GalleryImage[]> = {
  events: [
    { url: '/gallery/events/2024-09-15.webp', alt: 'Event celebration' },
    { url: '/gallery/events/2025-04-23.webp', alt: 'Event gathering' },
    { url: '/gallery/events/2026-03-27.webp', alt: 'Live music event' },
    { url: '/gallery/events/2026-03-27 (1).webp', alt: 'Event venue' },
    { url: '/gallery/events/2026-03-31 (1).webp', alt: 'Special event' },
  ],
  food: [
    { url: '/gallery/food/gallery-1-800x600.jpeg', alt: 'Signature dish' },
    { url: '/gallery/food/gallery-2-800x600.jpeg', alt: 'Appetizer' },
    { url: '/gallery/food/2023-10-02.webp', alt: 'Main course' },
    { url: '/gallery/food/2025-02-19.webp', alt: 'Dessert' },
    { url: '/gallery/food/2025-03-06.webp', alt: 'Plated meal' },
    { url: '/gallery/food/2025-04-10.webp', alt: 'Cocktail' },
    { url: '/gallery/food/2025-07-27.webp', alt: 'Beverage' },
  ],
  venue: [
    { url: '/gallery/venue/heroslide-1800x1013.jpeg', alt: 'Restaurant exterior' },
    { url: '/gallery/venue/slide1-1980x1080.jpeg', alt: 'Indoor seating' },
    { url: '/gallery/venue/slide3-1800x982.jpeg', alt: 'Cozy corner' },
    { url: '/gallery/venue/bomacafe2_large.jpg', alt: 'Thatched roof' },
    { url: '/gallery/venue/bomacafe3.jpg', alt: 'Firepit area' },
    { url: '/gallery/venue/gallery-3-800x600.jpeg', alt: 'Atmosphere' },
    { url: '/gallery/venue/gallery-5-800x600.jpeg', alt: 'Outdoor dining' },
  ],
  people: [
    { url: '/gallery/people/boma1-1152x864.jpeg', alt: 'Guests enjoying meal' },
    { url: '/gallery/people/bomacafe2_large (1).jpg', alt: 'Table setting' },
    { url: '/gallery/people/bomacafe4_large.jpg', alt: 'Evening ambiance' },
    { url: '/gallery/people/gallery-7-800x600.jpeg', alt: 'Group gathering' },
    { url: '/gallery/people/2026-04-08 (3).webp', alt: 'Celebration' },
    { url: '/gallery/people/2026-04-08 (5).webp', alt: 'Special occasion' },
  ],
  promotions: [
    { url: '/gallery/promotions/2024-07-31.jpg', alt: 'Special offer' },
    { url: '/gallery/promotions/2025-04-23.jpg', alt: 'Promotion' },
    { url: '/gallery/promotions/2025-08-23.webp', alt: 'Weekend deal' },
    { url: '/gallery/promotions/2025-12-04.jpg', alt: 'Holiday special' },
    { url: '/gallery/promotions/2026-01-30.jpg', alt: 'New year deal' },
    { url: '/gallery/promotions/2026-02-11.jpg', alt: 'Valentine offer' },
    { url: '/gallery/promotions/2026-03-27 (8).webp', alt: 'Weekend special' },
    { url: '/gallery/promotions/2026-04-05.webp', alt: 'April special' },
    { url: '/gallery/promotions/2026-04-08.webp', alt: 'Latest promotion' },
  ],
};

export function getGalleryImages(categoryId: string): GalleryImage[] {
  return galleryImages[categoryId] || [];
}

export function getAllGalleryImages(): Record<string, GalleryImage[]> {
  return galleryImages;
}
