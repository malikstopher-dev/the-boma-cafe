// Bar Menu Image Resolver
// Uses local /bar-menu folder images where filename matches exist
// Falls back to /cocktails-and-drinks for other images

const cocktailImages = [
  '/cocktails-and-drinks/2023-11-06.webp',
  '/cocktails-and-drinks/2025-04-10.webp',
  '/cocktails-and-drinks/2025-04-23-2.webp',
  '/cocktails-and-drinks/2026-02-11-1.webp',
];

// Per-category fallbacks to avoid duplicates
const categoryImages: Record<string, string> = {
  'Signature Cocktails': cocktailImages[0],
  'Hot Beverages': '/cocktails-and-drinks/2025-04-10.webp',
  'Freezos': '/cocktails-and-drinks/2025-04-10-1.webp',
  'Milkshakes': '/bar-menu/Chocolate Milkshake.jpg',
  'Classic Cocktails': cocktailImages[1],
  'Cocktails': '/bar-menu/Margarita.webp',
  'Non-Alcoholic Cocktails': '/bar-menu/Virgin Mojito.webp',
  'Non-Alcoholic': cocktailImages[2],
  'Special Board': cocktailImages[3],
  'Beers': '/bar-menu/Heineken.avif',
  'Ciders': '/bar-menu/Savanna Dry.jpg',
  'Wine': '/bar-menu/Prosecco.jpg',
  'Soft Drinks': '/bar-menu/Coca Cola.jpg',
  'Mixers': '/bar-menu/Tonic Water.jpg',
};

// Keyword-based matching for drinks
const keywordImages: Record<string, string> = {
  // Coffee/hot beverages
  'cappuccino': '/cocktails-and-drinks/2025-04-10.webp',
  'latte': '/cocktails-and-drinks/2025-04-10.webp',
  'coffee': '/cocktails-and-drinks/2025-04-10.webp',
  'chai': '/cocktails-and-drinks/2025-04-10.webp',
  
  // Cocktails
  'mojito': '/bar-menu/Classic Mojito.jpeg',
  'margarita': '/bar-menu/Margarita.webp',
  'martini': cocktailImages[1],
  'whiskey': cocktailImages[3],
  'old-fashioned': cocktailImages[0],
  'daiquiri': cocktailImages[2],
  'pina colada': cocktailImages[2],
  'cosmopolitan': cocktailImages[2],
  'long island': cocktailImages[3],
  'caipirinha': cocktailImages[0],
  'ginger': cocktailImages[3],
  'cherry': cocktailImages[2],
  'yuzu': cocktailImages[1],
  'rosemary': cocktailImages[1],
  
  // Freezos
  'coffee freezo': cocktailImages[1],
  'chocolate freezo': '/bar-menu/Chocolate Freezo.jpg',
  'white chocolate': cocktailImages[1],
  'spiced chai': cocktailImages[1],
  'mango freezo': '/bar-menu/Mango Freezo.jpg',
  
  // Milkshakes
  'shake': '/bar-menu/Strawberry Milkshake.jpg',
  'bubblegum': '/bar-menu/Chocolate Milkshake.jpg',
  'oreo': '/bar-menu/Chocolate Milkshake.jpg',
  
  // Beers & ciders
  'lager': '/bar-menu/Castle Lager.jpg',
  'heineken': '/bar-menu/Heineken.avif',
  'savanna': '/bar-menu/Savanna Light.jpg',
  'redds': '/bar-menu/Redds.jpg',
  'strongbow': '/bar-menu/Strongbow.jpg',
  
  // Wine
  'red': '/bar-menu/House Red.jpg',
  'white': '/bar-menu/House White.jpg',
  'prosecco': '/bar-menu/Prosecco.jpg',
  
  // Non-alcoholic
  'virgin': '/bar-menu/Virgin Mojito.webp',
  'shirley': '/bar-menu/Shirley Temple.jpg',
  'no-jito': '/bar-menu/Virgin Mojito.webp',
  'berry': cocktailImages[2],
  'cosmo': cocktailImages[2],
  
  // Special board
  'richelieu': cocktailImages[3],
  'klipdrift': cocktailImages[3],
  'kwv': cocktailImages[3],
  'captain morgan': cocktailImages[3],
};

// Direct drink name mappings
const drinkSlugMap: Record<string, string> = {
  'boma-sunset': cocktailImages[2],
  'safari-sour': cocktailImages[3],
  'thatched-toddy': cocktailImages[0],
  'garden-spritz': cocktailImages[1],
  'classic-mojito': '/bar-menu/Classic Mojito.jpeg',
  'margarita': '/bar-menu/Margarita.webp',
  'whiskey-sour': cocktailImages[3],
  'old-fashioned': cocktailImages[0],
  'virgin-mojito': '/bar-menu/Virgin Mojito.webp',
  'shirley-temple': '/bar-menu/Shirley Temple.jpg',
  'mango-freezo': '/bar-menu/Mango Freezo.jpg',
  'chocolate-freezo': '/bar-menu/Chocolate Freezo.jpg',
  'strawberry-milkshake': '/bar-menu/Strawberry Milkshake.jpg',
  'chocolate-milkshake': '/bar-menu/Chocolate Milkshake.jpg',
  'castle-lager': '/bar-menu/Castle Lager.jpg',
  'heineken': '/bar-menu/Heineken.avif',
  'savanna-light': '/bar-menu/Savanna Light.jpg',
  'redds': '/bar-menu/Redds.jpg',
  'strongbow': '/bar-menu/Strongbow.jpg',
  'savanna-dry': '/bar-menu/Savanna Dry.jpg',
  'house-red': '/bar-menu/House Red.jpg',
  'house-white': '/bar-menu/House White.jpg',
  'prosecco': '/bar-menu/Prosecco.jpg',
  'coca-cola': '/bar-menu/Coca Cola.jpg',
  'sprite': '/bar-menu/Sprite.jpg',
  'tonic-water': '/bar-menu/Tonic Water.jpg',
  'ginger-ale': '/bar-menu/Ginger Ale.jpg',
};

export const globalFallback = '/cocktails-and-drinks/2023-11-06.webp';

export function getBarImage(drinkName: string, category: string, adminImage?: string): string {
  if (adminImage && adminImage.trim() !== '') {
    return adminImage;
  }

  const slug = drinkName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const nameLower = drinkName.toLowerCase();
  
  // 1. Check exact slug match
  if (drinkSlugMap[slug]) {
    return drinkSlugMap[slug];
  }
  
  // 2. Check keyword match
  for (const [keyword, image] of Object.entries(keywordImages)) {
    if (nameLower.includes(keyword)) {
      return image;
    }
  }
  
  // 3. Check category fallback
  if (categoryImages[category]) {
    return categoryImages[category];
  }
  
  return globalFallback;
}

export function getCategoryImage(category: string): string {
  return categoryImages[category] || globalFallback;
}