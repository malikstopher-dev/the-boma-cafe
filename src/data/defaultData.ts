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
  { id: '1', name: 'Breakfast', description: '', order: 1, isActive: true },
  { id: '2', name: 'Toasties', description: '', order: 2, isActive: true },
  { id: '3', name: 'Hungry... Ish', description: '', order: 3, isActive: true },
  { id: '4', name: 'Curries & Bunnies', description: '', order: 4, isActive: true },
  { id: '5', name: 'Hot Beverages', description: '', order: 5, isActive: true },
  { id: '6', name: 'DRNK Freezos', description: '', order: 6, isActive: true },
  { id: '7', name: 'Milkshakes', description: '', order: 7, isActive: true },
  { id: '8', name: 'Classic Cocktails', description: '', order: 8, isActive: true },
  { id: '9', name: 'Non-Alcoholic Cocktails', description: '', order: 9, isActive: true },
  { id: '10', name: 'Burgers', description: '', order: 10, isActive: true },
  { id: '11', name: 'Burger Extras', description: '', order: 11, isActive: true },
  { id: '12', name: 'Fries & Extras', description: '', order: 12, isActive: true },
  { id: '13', name: 'Pizza', description: '', order: 13, isActive: true },
  { id: '14', name: 'Desserts', description: '', order: 14, isActive: true },
];

export const defaultMenuItems: MenuItem[] = [
  // BREAKFAST
  {
    id: 'bk1',
    name: 'Day Breaker',
    description: '2 eggs, 2 rashers bacon & fried tomato, served with chips & 2 slices of toast',
    price: 60,
    category: 'Breakfast',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bk2',
    name: 'Cheese Griller Breakfast',
    description: '2 eggs, 2 bacon rashers, beef cheese griller & fried tomato, served with chips & 2 slices of toast',
    price: 70,
    category: 'Breakfast',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bk3',
    name: 'Wors Breakfast',
    description: '2 eggs, 2 bacon rashers, 125g wors, fried tomato & fried mushrooms, served with chips & 2 slices of toast',
    price: 90,
    category: 'Breakfast',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bk4',
    name: 'Carb-Conscious Breakfast',
    description: '3 eggs, 3 rashers bacon, 2 sausages & fried tomato',
    price: 80,
    category: 'Breakfast',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bk5',
    name: 'Boma Breakfast',
    description: '2 eggs, 2 rashers bacon, 100g steak, fried tomato, sausage & mushrooms, served with chips & 2 slices of toast',
    price: 125,
    category: 'Breakfast',
    order: 5,
    isOutOfStock: false,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // TOASTIES
  {
    id: 't1',
    name: 'Cheese & Tomato',
    description: 'Served with chips',
    price: 45,
    category: 'Toasties',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 't2',
    name: 'Chicken & Mayo',
    description: 'Served with chips',
    price: 50,
    category: 'Toasties',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 't3',
    name: 'Bacon, Egg & Cheese',
    description: 'Served with chips',
    price: 55,
    category: 'Toasties',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 't4',
    name: 'Lamb Russian & Cheese',
    description: 'Served with chips',
    price: 62,
    category: 'Toasties',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 't5',
    name: 'Lamb Patty & Cheese',
    description: 'Served with chips',
    price: 75,
    category: 'Toasties',
    order: 5,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 't6',
    name: 'Beef Patty & Cheese',
    description: 'Served with chips',
    price: 72,
    category: 'Toasties',
    order: 6,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 't7',
    name: 'Steak & Cheese',
    description: 'Served with chips',
    price: 65,
    category: 'Toasties',
    order: 7,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // HUNGRY... ISH
  {
    id: 'hi1',
    name: '8 Wings & Chips',
    description: 'Crumbed wings, served with chips',
    price: 100,
    category: 'Hungry... Ish',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hi2',
    name: 'Wors & 1/4 Chicken',
    description: 'Served with chips',
    price: 120,
    category: 'Hungry... Ish',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hi3',
    name: '200g Ribs & 5 Wings',
    description: 'Served with chips',
    price: 180,
    category: 'Hungry... Ish',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hi4',
    name: 'Wors & 5 Wings',
    description: 'Served with chips',
    price: 150,
    category: 'Hungry... Ish',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hi5',
    name: '10 Samoosas',
    description: 'Flavours: Lamb | Beef | Chicken | Potato | Tuna | Cheese & Corn | Cheese & Onion',
    price: 72,
    category: 'Hungry... Ish',
    order: 5,
    isOutOfStock: false,
    isFeatured: false,
    notes: ['Unfried 10: R60'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hi6',
    name: '200g Wors & Ribs',
    description: 'Served with chips',
    price: 120,
    category: 'Hungry... Ish',
    order: 6,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hi7',
    name: '200g Ribs & 1/4 Chicken',
    price: 160,
    category: 'Hungry... Ish',
    order: 7,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hi8',
    name: '8 Wings & Ribs',
    description: 'Crumbed wings served with open flame-grilled ribs basted with our homemade BBQ basting, paired with chips',
    price: 200,
    category: 'Hungry... Ish',
    order: 8,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hi9',
    name: '200g Ribs & Steak',
    description: 'Served with chips',
    price: 195,
    category: 'Hungry... Ish',
    order: 9,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hi10',
    name: 'Boma Basket',
    description: 'A delicious combination of chips, wings, ribs, samoosas and sauce',
    price: 350,
    category: 'Hungry... Ish',
    order: 10,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // CURRIES & BUNNIES - Famous Bunny Chows
  {
    id: 'cb1',
    name: 'Lamb Bunny Chow',
    price: 120,
    category: 'Curries & Bunnies',
    subcategory: 'Famous Bunny Chows',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cb2',
    name: 'Beef Bunny Chow',
    price: 95,
    category: 'Curries & Bunnies',
    subcategory: 'Famous Bunny Chows',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cb3',
    name: 'Butter Chicken Bunny Chow',
    price: 90,
    category: 'Curries & Bunnies',
    subcategory: 'Famous Bunny Chows',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // CURRIES & BUNNIES - Durban Style Curry
  {
    id: 'cb4',
    name: 'Lamb Durban Curry',
    description: 'Served with basmati rice / 2 roti',
    price: 99,
    category: 'Curries & Bunnies',
    subcategory: 'Durban Style Curry',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cb5',
    name: 'Beef Durban Curry',
    description: 'Served with basmati rice / 2 roti',
    price: 90,
    category: 'Curries & Bunnies',
    subcategory: 'Durban Style Curry',
    order: 5,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cb6',
    name: 'Butter Chicken Durban Curry',
    description: 'Served with basmati rice / 2 roti',
    price: 85,
    category: 'Curries & Bunnies',
    subcategory: 'Durban Style Curry',
    order: 6,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // CURRIES & BUNNIES - Roti Rolls
  {
    id: 'cb7',
    name: 'Lamb Roti Roll',
    description: 'Served with a carrot salad inside',
    price: 85,
    category: 'Curries & Bunnies',
    subcategory: 'Roti Rolls',
    order: 7,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cb8',
    name: 'Beef Roti Roll',
    description: 'Served with a carrot salad inside',
    price: 75,
    category: 'Curries & Bunnies',
    subcategory: 'Roti Rolls',
    order: 8,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cb9',
    name: 'Butter Chicken Roti Roll',
    description: 'Served with a carrot salad inside',
    price: 70,
    category: 'Curries & Bunnies',
    subcategory: 'Roti Rolls',
    order: 9,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // HOT BEVERAGES
  {
    id: 'hb1',
    name: 'Rbos Cappuccino',
    description: 'Freshly brewed Rbos espresso infused with Monin vanilla syrup and perfectly steamed milk.',
    price: 35,
    category: 'Hot Beverages',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hb2',
    name: 'Vanilla Latte',
    description: 'Freshly brewed espresso infused with Monin vanilla syrup and perfectly steamed milk or milk alternative.',
    price: 42,
    category: 'Hot Beverages',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hb3',
    name: 'Brown Butter Latte',
    description: 'Freshly brewed espresso infused with Monin brown butter syrup and perfectly steamed milk.',
    price: 45,
    category: 'Hot Beverages',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hb4',
    name: 'Hazelnut Latte',
    description: 'Freshly brewed espresso infused with Monin Hazelnut syrup and steamed milk or milk alternative.',
    price: 42,
    category: 'Hot Beverages',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // DRNK FREEZOS
  {
    id: 'fz1',
    name: 'Coffee Freezo',
    description: 'DRNK Coffee Frappe blended frozen with full cream milk and ice.',
    price: 45,
    category: 'DRNK Freezos',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'fz2',
    name: 'Spiced Chai Freezo',
    description: 'DRNK Chai Latte blended frozen with full cream milk and ice.',
    price: 45,
    category: 'DRNK Freezos',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'fz3',
    name: 'Decadent Chocolate Freezo',
    description: 'DRNK Chocolate frappe blended frozen with full cream milk and ice.',
    price: 40,
    category: 'DRNK Freezos',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'fz4',
    name: 'White Chocolate Freezo',
    description: 'DRNK White Chocolate blended frozen with full cream milk and ice.',
    price: 45,
    category: 'DRNK Freezos',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // MILKSHAKES
  {
    id: 'ms1',
    name: 'Chocolate Shake',
    price: 46,
    category: 'Milkshakes',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ms2',
    name: 'Strawberry Shake',
    price: 51,
    category: 'Milkshakes',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ms3',
    name: 'Bubblegum Shake',
    price: 46,
    category: 'Milkshakes',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ms4',
    name: 'Oreo Shake',
    price: 46,
    category: 'Milkshakes',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // CLASSIC COCKTAILS
  {
    id: 'cc1',
    name: 'Classic Martini',
    description: 'London Dry Gin gently stirred with extra dry vermouth. Served straight up in a chilled martini glass.',
    price: 79,
    category: 'Classic Cocktails',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc2',
    name: 'Margarita',
    description: 'Blanco Tequila infused with curacao and fresh lime. Served straight up, frozen or on the rocks with a salt rim.',
    price: 100,
    category: 'Classic Cocktails',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc3',
    name: 'Caipirinha',
    description: 'Brazillian Cachaca, pressed lime and pure cane sugar. Served short over crushed ice.',
    price: 94,
    category: 'Classic Cocktails',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc4',
    name: 'Mojito',
    description: 'Cuban Light Rum muddled with pure cane sugar and fresh mint and lime wedges. Served tall over crushed ice.',
    price: 91,
    category: 'Classic Cocktails',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc5',
    name: 'Pina Colada',
    description: 'Cuban Light Rum blended cold with coconut extract, fresh pineapple and a squeeze of lemon. Served tall.',
    price: 96,
    category: 'Classic Cocktails',
    order: 5,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc6',
    name: 'Strawberry Daiquiri',
    description: 'Cuban Light Rum blended frozen with pure cane sugar, fresh lime and pressed strawberries. Served tall with a strawberry fan.',
    price: 88,
    category: 'Classic Cocktails',
    order: 6,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc7',
    name: 'Cosmopolitan',
    description: 'Premium Vodka shaken with curacao extract, fresh pressed lime and cranberry juice. Served straight up in a chilled martini glass.',
    price: 74,
    category: 'Classic Cocktails',
    order: 7,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc8',
    name: 'Long Island Iced Tea',
    description: 'Four White Spirits infused curacao extract and pressed lemon juice. Served tall over cracked ice with Coke.',
    price: 110,
    category: 'Classic Cocktails',
    order: 8,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc9',
    name: 'Sex on the beach',
    description: 'Vodka infused with peach syrup and cranberry juice. Served tall over cracked ice and charged with pressed orange juice.',
    price: 66,
    category: 'Classic Cocktails',
    order: 9,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc10',
    name: 'Rosemary Yuzu G&T',
    description: 'Premium Gin shaken with Yuzu extract, rosemary and pressed lemon. Served over cracked ice and charged with chilled Indian tonic water.',
    price: 110,
    category: 'Classic Cocktails',
    order: 10,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc11',
    name: 'Cherry blossom ginger G&T',
    description: 'Premium Gin shaken with cherry extract, ginger slices and pressed lemon. Served over ice and charged with chilled Indian tonic water.',
    price: 104,
    category: 'Classic Cocktails',
    order: 11,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc12',
    name: 'Yuzu whiskey Sours',
    description: 'Kentucky Straight Bourbon shaken with Yuzu extract, fresh lemon and bitters. Served on the rocks with a cellulose foam.',
    price: 103,
    category: 'Classic Cocktails',
    order: 12,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cc13',
    name: 'Brown butter Old Fashioned',
    description: 'Kentucky Straight Bourbon gently stirred with brown butter sugar, orange zest and bitters. Served on the rocks with a orange zest.',
    price: 77,
    category: 'Classic Cocktails',
    order: 13,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // NON-ALCOHOLIC COCKTAILS
  {
    id: 'nc1',
    name: 'Berry Citrus Twist',
    description: 'Monin curacao Triple Sec / Sun-dried Orange. Fresh Limes. Strawberry Juice. Orange Juice.',
    price: 55,
    category: 'Non-Alcoholic Cocktails',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'nc2',
    name: 'Cosmo Crush',
    description: 'Monin curacao Triple Sec / Sun-dried Orange. Limes. Cranberry Juice.',
    price: 55,
    category: 'Non-Alcoholic Cocktails',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'nc3',
    name: 'No-Jito',
    description: 'Monin Wild Mint. Fresh Limes. Fresh Mint. Soda Water.',
    price: 56,
    category: 'Non-Alcoholic Cocktails',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'nc4',
    name: 'Virgin Pina Colada',
    description: 'Monin Pina Coco. Fresh Pineapple. Fresh Lemon.',
    price: 58,
    category: 'Non-Alcoholic Cocktails',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'nc5',
    name: 'Virgin Strawberry Daiquiri',
    description: 'Monin Strawberry. Fresh Limes. Strawberry Juice.',
    price: 65,
    category: 'Non-Alcoholic Cocktails',
    order: 5,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'nc6',
    name: 'Cherry blossom martini',
    description: 'Monin cherry blossom syrup. Cranberry juice. Lime juice. Served in a chilled coupe with edible flowers.',
    price: 52,
    category: 'Non-Alcoholic Cocktails',
    order: 6,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // BURGERS
  {
    id: 'bg1',
    name: 'Classic Beef Burger',
    description: 'Angus beef patty, cheddar cheese, caramelized onions, fresh tomato, lettuce, house sauce',
    price: 165,
    category: 'Burgers',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bg2',
    name: 'Chicken Burger',
    description: 'Grilled chicken breast, bacon, avocado, tomato, lettuce, mayo',
    price: 155,
    category: 'Burgers',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bg3',
    name: 'Boma Double Burger',
    description: 'Double beef patty, double cheese, bacon, caramelized onions, house sauce',
    price: 195,
    category: 'Burgers',
    order: 3,
    isOutOfStock: false,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bg4',
    name: 'Veggie Burger',
    description: 'Plant-based patty, lettuce, tomato, cucumber, avocado, hummus',
    price: 145,
    category: 'Burgers',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // BURGER EXTRAS
  {
    id: 'be1',
    name: 'Egg',
    price: 10,
    category: 'Burger Extras',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'be2',
    name: 'Bacon',
    price: 25,
    category: 'Burger Extras',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'be3',
    name: 'Avo',
    price: 22,
    category: 'Burger Extras',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'be4',
    name: 'Cheese',
    price: 15,
    category: 'Burger Extras',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'be5',
    name: 'Beef Patty',
    price: 30,
    category: 'Burger Extras',
    order: 5,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'be6',
    name: 'Lamb Patty',
    price: 39,
    category: 'Burger Extras',
    order: 6,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // FRIES & EXTRAS
  {
    id: 'fr1',
    name: 'Small Fries',
    price: 25,
    category: 'Fries & Extras',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'fr2',
    name: 'Medium Fries',
    price: 35,
    category: 'Fries & Extras',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'fr3',
    name: 'Large Fries',
    price: 45,
    category: 'Fries & Extras',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // PIZZA
  {
    id: 'pz1',
    name: 'Something Meaty',
    description: 'Salami, ham, bacon & beef',
    price: 110,
    category: 'Pizza',
    variants: [
      { name: 'Small', price: 110 },
      { name: 'Medium', price: 140 },
      { name: 'Large', price: 180 }
    ],
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pz2',
    name: 'Something Cheesy',
    description: 'Cheddar & mozzarella',
    price: 90,
    category: 'Pizza',
    variants: [
      { name: 'Small', price: 90 },
      { name: 'Medium', price: 130 },
      { name: 'Large', price: 160 }
    ],
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pz3',
    name: 'BBQ Chicken',
    price: 80,
    category: 'Pizza',
    variants: [
      { name: 'Small', price: 80 },
      { name: 'Medium', price: 110 },
      { name: 'Large', price: 140 }
    ],
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pz4',
    name: 'Lamb Curry & Cheese',
    price: 110,
    category: 'Pizza',
    variants: [
      { name: 'Small', price: 110 },
      { name: 'Medium', price: 150 },
      { name: 'Large', price: 170 }
    ],
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pz5',
    name: 'Margherita',
    price: 70,
    category: 'Pizza',
    variants: [
      { name: 'Small', price: 70 },
      { name: 'Medium', price: 100 },
      { name: 'Large', price: 130 }
    ],
    order: 5,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pz6',
    name: 'Sausage',
    description: 'Lamb | beef',
    price: 110,
    category: 'Pizza',
    variants: [
      { name: 'Small', price: 110 },
      { name: 'Medium', price: 150 },
      { name: 'Large', price: 170 }
    ],
    order: 6,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pz7',
    name: 'Regina',
    description: 'Mushrooms & ham',
    price: 90,
    category: 'Pizza',
    variants: [
      { name: 'Small', price: 90 },
      { name: 'Medium', price: 140 },
      { name: 'Large', price: 160 }
    ],
    order: 7,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pz8',
    name: 'Hawaiian',
    description: 'Pineapple & ham',
    price: 85,
    category: 'Pizza',
    variants: [
      { name: 'Small', price: 85 },
      { name: 'Medium', price: 125 },
      { name: 'Large', price: 145 }
    ],
    order: 8,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // Pizza extras
  {
    id: 'pze1',
    name: 'Pizza Extra: Ham',
    price: 20,
    category: 'Pizza',
    order: 9,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pze2',
    name: 'Pizza Extra: Salami',
    price: 20,
    category: 'Pizza',
    order: 10,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pze3',
    name: 'Pizza Extra: Mushrooms',
    price: 20,
    category: 'Pizza',
    order: 11,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pze4',
    name: 'Pizza Extra: Peppers',
    price: 20,
    category: 'Pizza',
    order: 12,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pze5',
    name: 'Pizza Extra: Cheese',
    price: 20,
    category: 'Pizza',
    order: 13,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pze6',
    name: 'Pizza Extra: Olives',
    price: 20,
    category: 'Pizza',
    order: 14,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pze7',
    name: 'Pizza Extra: Bacon',
    price: 20,
    category: 'Pizza',
    order: 15,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // DESSERTS
  {
    id: 'ds1',
    name: 'Cheese Cake',
    price: 65,
    category: 'Desserts',
    order: 1,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ds2',
    name: 'Carrot Cake',
    price: 65,
    category: 'Desserts',
    order: 2,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ds3',
    name: 'Chocolate Cake',
    price: 65,
    category: 'Desserts',
    order: 3,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ds4',
    name: 'Ice Cream & Chocolate Sauce',
    price: 45,
    category: 'Desserts',
    order: 4,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ds5',
    name: 'Seasonal Fruit',
    price: 45,
    category: 'Desserts',
    order: 5,
    isOutOfStock: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]; // END defaultMenuItems

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
    galleryImages: ['/images/event1.jpeg'],
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
    title: 'Weekend Breakfast Buffet',
    description: 'Saturday & Sunday from 9:30 to 12:30. Kids R45, Adult R89',
    validFrom: '2026-04-01',
    validUntil: '2026-12-31',
    ctaText: 'Book Now',
    ctaLink: '/contact',
    displayOnHomepage: true,
    displayAsPopup: false,
    displayOnMenu: true,
    displayOnPromotionsPage: true,
    isFeatured: true,
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
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
    order: 2,
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
    order: 3,
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