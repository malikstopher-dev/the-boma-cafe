import { MenuItem, MenuCategory, Event, Promotion, GalleryItem, Popup, Announcement, Testimonial, ContactInquiry } from '@/types';

export const defaultSettings: any = {
  siteName: 'The Boma Cafe',
  siteTagline: 'Where the Rustic Meets the Soulful',
  contactPhone: '072 996 2212',
  contactEmail: 'info@thebomacafe.co.za',
  contactAddress: 'Sandton, Johannesburg, South Africa',
  contactMapLink: 'https://maps.app.goo.gl/Xca93TRsznn9GN8K7',
  openingHours: 'Mon-Sun: 8:00 AM - 10:00 PM',
  socialLinks: {
    facebook: 'https://facebook.com/thebomacafe',
    instagram: 'https://instagram.com/thebomacafe',
  }
};

export const defaultCategories: MenuCategory[] = [
  { id: '1', name: 'Starters', description: 'Delicious appetizers to begin your meal', order: 1, isActive: true },
  { id: '2', name: 'Mains', description: 'Signature main courses', order: 2, isActive: true },
  { id: '3', name: 'Burgers', description: 'Gourmet burgers and sandwiches', order: 3, isActive: true },
  { id: '4', name: 'Pizza', description: 'Wood-fired artisan pizzas', order: 4, isActive: true },
  { id: '5', name: 'Salads', description: 'Fresh and healthy options', order: 5, isActive: true },
  { id: '6', name: 'Desserts', description: 'Sweet endings', order: 6, isActive: true },
  { id: '7', name: 'Drinks', description: 'Refreshing drinks', order: 7, isActive: true },
];

export const defaultMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Crispy Calamari',
    description: 'Tender calamari rings served with house-made tomato salsa and lemon aioli',
    price: 145,
    category: 'Starters',
    isFeatured: true,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: true,
    order: 1,
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Boma Platter',
    description: 'A sharing platter of mixed meats, wings, and sides - perfect for groups',
    price: 395,
    category: 'Mains',
    isFeatured: true,
    isOutOfStock: false,
    isOnPromo: true,
    promoBadge: 'Best Seller',
    showOnHomepage: true,
    order: 2,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Classic Beef Burger',
    description: 'Angus beef patty, cheddar cheese, caramelized onions, fresh tomato, lettuce, house sauce',
    price: 165,
    category: 'Burgers',
    isFeatured: false,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: false,
    order: 3,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Margherita Pizza',
    description: 'San Marzano tomatoes, fresh mozzarella, basil, extra virgin olive oil',
    price: 155,
    category: 'Pizza',
    isFeatured: true,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: true,
    order: 4,
    image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Garden Salad',
    description: 'Mixed greens, cherry tomatoes, cucumber, red onion, feta, balsamic vinaigrette',
    price: 95,
    category: 'Salads',
    isFeatured: false,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: false,
    order: 5,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
    price: 85,
    category: 'Desserts',
    isFeatured: true,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: true,
    order: 6,
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '7',
    name: 'Grilled Chicken Wings',
    description: 'Crispy wings tossed in your choice of sauce, served with blue cheese dip',
    price: 115,
    category: 'Starters',
    isFeatured: false,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: false,
    order: 7,
    image: 'https://images.unsplash.com/photo-1608039829572-9432d2d1f104?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '8',
    name: 'Grilled Salmon',
    description: 'Fresh Atlantic salmon with herb butter, roasted vegetables and choice of side',
    price: 245,
    category: 'Mains',
    isFeatured: true,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: true,
    order: 8,
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '9',
    name: 'BBQ Ribs',
    description: 'Fall-off-the-bone tender ribs with smoky BBQ sauce, served with coleslaw',
    price: 225,
    category: 'Mains',
    isFeatured: true,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: true,
    order: 9,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '10',
    name: 'Pepperoni Pizza',
    description: 'Tomato base, mozzarella, pepperoni, bell peppers, olives',
    price: 175,
    category: 'Pizza',
    isFeatured: false,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: false,
    order: 10,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '11',
    name: 'Chicken Burger',
    description: 'Grilled chicken breast, bacon, avocado, tomato, lettuce, mayo',
    price: 155,
    category: 'Burgers',
    isFeatured: false,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: false,
    order: 11,
    image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '12',
    name: 'Caesar Salad',
    description: 'Romaine lettuce, croutons, parmesan, Caesar dressing, grilled chicken optional',
    price: 115,
    category: 'Salads',
    isFeatured: false,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: false,
    order: 12,
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '13',
    name: 'Tiramisu',
    description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone',
    price: 75,
    category: 'Desserts',
    isFeatured: false,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: false,
    order: 13,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '14',
    name: 'Craft Lemonade',
    description: 'Fresh squeezed lemonade with mint and honey',
    price: 45,
    category: 'Drinks',
    isFeatured: false,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: false,
    order: 14,
    image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '15',
    name: 'Espresso',
    description: 'Double shot espresso',
    price: 35,
    category: 'Drinks',
    isFeatured: false,
    isOutOfStock: false,
    isOnPromo: false,
    showOnHomepage: false,
    order: 15,
    image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=300&fit=crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const defaultEvents: Event[] = [
  {
    id: '1',
    title: 'Live Music Nights',
    description: 'Enjoy soulful performances from local artists every weekend in our intimate outdoor setting. Experience the magic of live music under the stars.',
    date: '2026-04-18',
    time: '19:00',
    location: 'Main Deck',
    status: 'upcoming',
    showOnHomepage: true,
    galleryImages: [],
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Friday Braai Evening',
    description: 'Experience traditional South African braai culture with expertly grilled meats, sides, and great company. Every Friday night!',
    date: '2026-04-11',
    time: '18:00',
    location: 'Firepit Area',
    status: 'upcoming',
    showOnHomepage: true,
    galleryImages: [],
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Sunday Family Brunch',
    description: 'Join us for relaxing Sunday brunch with family and friends. Kids eat free!',
    date: '2026-04-13',
    time: '10:00',
    location: 'Garden Terrace',
    status: 'upcoming',
    showOnHomepage: false,
    galleryImages: [],
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Corporate Events',
    description: 'Host your next corporate function in our unique rustic setting. Customized menus and dedicated service.',
    date: '2026-04-20',
    time: '09:00',
    location: 'Private Boma',
    status: 'upcoming',
    showOnHomepage: false,
    galleryImages: [],
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const defaultPromotions: Promotion[] = [
  {
    id: '1',
    title: 'Happy Hour Specials',
    description: 'Buy one get one free on selected drinks from 4pm to 7pm daily!',
    validFrom: '2026-04-01',
    validUntil: '2026-04-30',
    ctaText: 'View Menu',
    ctaLink: '/menu',
    displayOnHomepage: true,
    displayAsPopup: true,
    displayOnMenu: false,
    displayOnPromotionsPage: true,
    isFeatured: true,
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Family Meal Deal',
    description: 'Family of 4 special - 2 mains, 2 sides, 4 drinks at only R450',
    validFrom: '2026-04-01',
    validUntil: '2026-04-30',
    ctaText: 'Order Now',
    ctaLink: '/contact',
    displayOnHomepage: false,
    displayAsPopup: false,
    displayOnMenu: true,
    displayOnPromotionsPage: true,
    isFeatured: false,
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const defaultGallery: GalleryItem[] = [
  { id: '1', type: 'image', url: '/gallery/gallery-1.jpg', category: 'Venue', isFeatured: true, order: 1, createdAt: new Date().toISOString() },
  { id: '2', type: 'image', url: '/gallery/gallery-2.jpg', category: 'Food', isFeatured: true, order: 2, createdAt: new Date().toISOString() },
  { id: '3', type: 'image', url: '/gallery/gallery-3.jpg', category: 'Food', isFeatured: false, order: 3, createdAt: new Date().toISOString() },
  { id: '4', type: 'image', url: '/gallery/gallery-4.jpg', category: 'Events', isFeatured: true, order: 4, createdAt: new Date().toISOString() },
  { id: '5', type: 'image', url: '/gallery/gallery-5.jpg', category: 'Venue', isFeatured: false, order: 5, createdAt: new Date().toISOString() },
  { id: '6', type: 'image', url: '/gallery/gallery-6.jpg', category: 'People', isFeatured: false, order: 6, createdAt: new Date().toISOString() },
];

export const defaultPopup: Popup = {
  id: '1',
  type: 'promotion',
  title: 'Happy Hour Special!',
  description: 'Buy one get one free on selected drinks from 4pm to 7pm daily. Join us for the best happy hour in Sandton!',
  ctaText: 'View Menu',
  ctaLink: '/menu',
  isEnabled: true,
  showOncePerSession: true,
  startDate: '2026-04-01',
  endDate: '2026-04-30'
};

export const defaultAnnouncement: Announcement = {
  id: '1',
  text: '🎉 Join us for Live Music every Friday & Saturday evening!',
  isEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    text: 'The most incredible dining experience in Sandton! The rustic ambiance, friendly staff, and amazing food make this place special.',
    author: 'Sarah Mitchell',
    location: 'Johannesburg',
    rating: 5
  },
  {
    id: '2',
    text: 'We celebrated our anniversary here and it was perfect. The firepit setup is so romantic and the menu has something for everyone.',
    author: 'David & Thandi',
    location: 'Sandton',
    rating: 5
  },
  {
    id: '3',
    text: 'Best brunch spot in the area! Great atmosphere, delicious food, and excellent service. Will definitely be back.',
    author: 'James Richardson',
    location: 'Rosebank',
    rating: 5
  }
];