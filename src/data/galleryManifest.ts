// Gallery Image Manifest - Auto-scanned from local folders
// Each category loads ALL images from its corresponding /public/gallery/{category} folder

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
    { url: '/gallery/events/1777009767026-134-2000x1125.jpeg', alt: 'Event celebration' },
    { url: '/gallery/events/2024-09-15.webp', alt: 'Event gathering' },
    { url: '/gallery/events/2025-04-23.webp', alt: 'Live music event' },
    { url: '/gallery/events/2026-03-27-1.webp', alt: 'Event venue' },
    { url: '/gallery/events/2026-03-27.webp', alt: 'Special event' },
    { url: '/gallery/events/2026-03-31-1.webp', alt: 'March event' },
    { url: '/gallery/events/2026-04-08.webp', alt: 'April event' },
    { url: '/gallery/events/2026-04-17.webp', alt: 'Evening event' },
    { url: '/gallery/events/2026-04-19 (1).webp', alt: 'Event moment' },
    { url: '/gallery/events/2026-04-19 (2).webp', alt: 'Guest photo' },
    { url: '/gallery/events/2026-04-19 (3).webp', alt: 'Group photo' },
    { url: '/gallery/events/2026-04-19.webp', alt: 'Celebration' },
  ],
  food: [
    { url: '/gallery/food/2023-09-30 (1).webp', alt: 'Signature dish' },
    { url: '/gallery/food/2023-09-30-1.webp', alt: 'Appetizer' },
    { url: '/gallery/food/2023-09-30.webp', alt: 'Main course' },
    { url: '/gallery/food/2023-10-02-1.webp', alt: 'Food special' },
    { url: '/gallery/food/2023-10-02.webp', alt: 'Plated meal' },
    { url: '/gallery/food/2023-10-11.webp', alt: 'Appetizer' },
    { url: '/gallery/food/2023-10-14.webp', alt: 'Dessert' },
    { url: '/gallery/food/2025-02-19.webp', alt: 'Breakfast' },
    { url: '/gallery/food/2025-03-06-1.webp', alt: 'Lunch special' },
    { url: '/gallery/food/2025-03-06.webp', alt: 'Dinner' },
    { url: '/gallery/food/2025-04-10-1.webp', alt: 'Freezo' },
    { url: '/gallery/food/2025-04-10.webp', alt: 'Beverage' },
    { url: '/gallery/food/2025-04-23-2.webp', alt: 'Food' },
    { url: '/gallery/food/2025-04-23-4.webp', alt: 'Side dish' },
    { url: '/gallery/food/2025-07-12.webp', alt: 'Hungry meal' },
    { url: '/gallery/food/2025-07-27-1.webp', alt: 'Pizza' },
    { url: '/gallery/food/2025-07-27-2.webp', alt: 'Pizza slice' },
    { url: '/gallery/food/2025-07-27.webp', alt: 'Wood-fired' },
    { url: '/gallery/food/2026-02-11-1.webp', alt: 'Burger' },
    { url: '/gallery/food/2026-03-27-11.webp', alt: 'Platter' },
    { url: '/gallery/food/2026-03-27-13.webp', alt: 'Family meal' },
    { url: '/gallery/food/2026-03-27-2.webp', alt: 'Meat plate' },
    { url: '/gallery/food/2026-03-27-3.webp', alt: 'Grill' },
    { url: '/gallery/food/2026-03-27-4.webp', alt: 'Sides' },
    { url: '/gallery/food/2026-03-27-5.webp', alt: 'Full spread' },
    { url: '/gallery/food/2026-03-27-7.webp', alt: 'Boma special' },
    { url: '/gallery/food/Bacon, Egg & Cheese.jpg', alt: 'Breakfast plate' },
    { url: '/gallery/food/beefcurry.jpg', alt: 'Curry' },
    { url: '/gallery/food/Boma Breakfast.jpg', alt: 'Full breakfast' },
    { url: '/gallery/food/Carb-Conscious Breakfast.jpg', alt: 'Healthy option' },
    { url: '/gallery/food/Cheese Griller Breakfast.webp', alt: 'Grilled cheese' },
    { url: '/gallery/food/Cheese Griller Breakfast2.jpg', alt: 'Toastie' },
    { url: '/gallery/food/cheesetomato.webp', alt: 'Tomato toastie' },
    { url: '/gallery/food/Day Breaker.jpg', alt: 'Eggs Benedict' },
    { url: '/gallery/food/FB_IMG_1774727823486.jpg', alt: 'Food moment' },
    { url: '/gallery/food/gallery-1-800x600.jpeg', alt: 'Restaurant dish' },
    { url: '/gallery/food/gallery-2-800x600.jpeg', alt: 'Plated food' },
    { url: '/gallery/food/img-7418-1152x647.jpeg', alt: 'Gourmet' },
    { url: '/gallery/food/img-7436-1152x647.jpeg', alt: 'Fine dining' },
    { url: '/gallery/food/Lamb Patty & Cheese.webp', alt: 'Lamb toastie' },
    { url: '/gallery/food/Lamb Russian & Cheese.webp', alt: 'Russian roll' },
    { url: '/gallery/food/lambcurry.jpg', alt: 'Lamb curry' },
    { url: '/gallery/food/unnamed-3.webp', alt: 'Special' },
    { url: '/gallery/food/unnamed-4.webp', alt: 'Dish' },
    { url: '/gallery/food/unnamed-5.webp', alt: 'Meal' },
    { url: '/gallery/food/unnamed.jpg', alt: 'Food' },
    { url: '/gallery/food/Wors Breakfast.jpg', alt: 'Breakfast wors' },
  ],
  venue: [
    { url: '/gallery/venue/134-2000x1125.jpeg', alt: 'Main view' },
    { url: '/gallery/venue/2023-09-10.webp', alt: 'Exterior day' },
    { url: '/gallery/venue/2023-09-27.webp', alt: 'Garden view' },
    { url: '/gallery/venue/2023-10-30 (1).webp', alt: 'Patio 1' },
    { url: '/gallery/venue/2023-10-30 (2).webp', alt: 'Patio 2' },
    { url: '/gallery/venue/2023-10-30.webp', alt: 'Evening patio' },
    { url: '/gallery/venue/2025-04-14.webp', alt: 'ternoon view' },
    { url: '/gallery/venue/2025-04-23.jpg', alt: 'Restaurant front' },
    { url: '/gallery/venue/2025-04-23.webp', alt: 'Front view' },
    { url: '/gallery/venue/2025-05-09.webp', alt: 'Full venue' },
    { url: '/gallery/venue/2025-05-13 (1).webp', alt: 'Indoor 1' },
    { url: '/gallery/venue/2025-05-13.webp', alt: 'Indoor seating' },
    { url: '/gallery/venue/2025-05-19.webp', alt: 'Main area' },
    { url: '/gallery/venue/2025-07-20.webp', alt: 'Summer evening' },
    { url: '/gallery/venue/2025-11-29.webp', alt: 'Winter setup' },
    { url: '/gallery/venue/2025-12-25.webp', alt: 'Christmas decor' },
    { url: '/gallery/venue/586695496_18542032552027334_196345222483858604_n.jpg', alt: 'Guest photo' },
    { url: '/gallery/venue/587298253_18541742503027334_426466464687217115_n.jpg', alt: 'Group shot' },
    { url: '/gallery/venue/bomacafe2_large.jpg', alt: 'Thatched roof' },
    { url: '/gallery/venue/bomacafe3.jpg', alt: 'Firepit area' },
    { url: '/gallery/venue/bomacafe4-large-1.jpg', alt: 'Fire view' },
    { url: '/gallery/venue/bomacafe6_large.jpg', alt: 'Outdoor seating' },
    { url: '/gallery/venue/download.jpg', alt: 'Download image' },
    { url: '/gallery/venue/gallery-3-800x600.jpeg', alt: 'Interior shot' },
    { url: '/gallery/venue/gallery-5-800x600.jpeg', alt: 'Deck view' },
    { url: '/gallery/venue/gallery-8-800x600.jpeg', alt: 'Bar area' },
    { url: '/gallery/venue/heroslide-1800x1013.jpeg', alt: 'Hero slide' },
    { url: '/gallery/venue/slide1-1980x1080.jpeg', alt: 'Main slide' },
    { url: '/gallery/venue/slide3-1800x982.jpeg', alt: 'Side view' },
    { url: '/gallery/venue/unnamed (1).webp', alt: 'Venue 1' },
    { url: '/gallery/venue/unnamed (2).webp', alt: 'Venue 2' },
    { url: '/gallery/venue/unnamed (3).webp', alt: 'Venue 3' },
    { url: '/gallery/venue/unnamed.webp', alt: 'Default' },
  ],
  people: [
    { url: '/gallery/people/2025-07-20 (1).webp', alt: 'Guest photo 1' },
    { url: '/gallery/people/2026-04-08-3.webp', alt: 'Celebration' },
    { url: '/gallery/people/2026-04-08-5.webp', alt: 'Moment' },
    { url: '/gallery/people/tina.jpg', alt: 'Guest' },
    { url: '/gallery/people/tina2.jpg', alt: 'Visitor' },
  ],
  promotions: [
    { url: '/gallery/promotions/2024-07-31.jpg', alt: 'July special' },
    { url: '/gallery/promotions/2025-04-23.jpg', alt: 'April promo' },
    { url: '/gallery/promotions/2025-04-23-1.webp', alt: 'April deal' },
    { url: '/gallery/promotions/2025-04-23-1b.jpg', alt: 'April offer' },
    { url: '/gallery/promotions/2025-08-23.webp', alt: 'Winter deal' },
    { url: '/gallery/promotions/2025-12-04.jpg', alt: 'Holiday special' },
    { url: '/gallery/promotions/2026-01-30.jpg', alt: 'New year' },
    { url: '/gallery/promotions/2026-02-11.jpg', alt: 'Valentine' },
    { url: '/gallery/promotions/2026-03-27-1.jpg', alt: 'March special' },
    { url: '/gallery/promotions/2026-03-27-8.webp', alt: 'Weekend deal' },
    { url: '/gallery/promotions/2026-03-27-9.webp', alt: 'March offer' },
    { url: '/gallery/promotions/2026-04-05.webp', alt: 'April promo' },
    { url: '/gallery/promotions/2026-04-08.webp', alt: 'Latest offer' },
    { url: '/gallery/promotions/2026-04-08-2.webp', alt: 'April special' },
    { url: '/gallery/promotions/2026-04-08-4.webp', alt: 'Weekend special' },
  ],
};

export function getGalleryImages(categoryId: string): GalleryImage[] {
  return galleryImages[categoryId] || [];
}

export function getAllGalleryImages(): Record<string, GalleryImage[]> {
  return galleryImages;
}

export function getCategoryCount(categoryId: string): number {
  return galleryImages[categoryId]?.length || 0;
}