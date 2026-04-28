// Bar Menu Image Resolver
// Maps drink names to /cocktails-and-drinks/ images

const BAR_FALLBACK = '/menu/fallback.jpg';

const drinkSlugMap: Record<string, string> = {
  // Signature Cocktails
  'safari-sour': '/cocktails-and-drinks/Safari-sour.png',
  'thatched-toddy': '/cocktails-and-drinks/Thatched-Toddy.jpg',
  'garden-spritz': '/cocktails-and-drinks/Garden-Spritz.jpg',
  'boma-sunset': '/cocktails-and-drinks/Safari-sour.png',

  // Hot Beverages
  'rbos-cappuccino': '/cocktails-and-drinks/Rbos-Cappuccino.jpg',
  'vanilla-latte': '/cocktails-and-drinks/Vanilla-Latte.jpg',
  'brown-butter-latte': '/cocktails-and-drinks/Brown-butter-Old-Fashioned.jpg',
  'hazelnut-latte': '/cocktails-and-drinks/Hazelnut-Latte.webp',
  'chai-tea': '/cocktails-and-drinks/Chai-Tea.jpg',
  'rooibos-tea': '/cocktails-and-drinks/Rooibos-Tea.jpg',
  'five-roses-tea': '/cocktails-and-drinks/Five-Roses-Tea.jpg',
  'hot-chocolate': '/cocktails-and-drinks/Hot-Chocolate.jpg',
  'americano': '/cocktails-and-drinks/Americano.jpg',
  'espresso': '/cocktails-and-drinks/expresso.jpg',
  'cappuccino': '/cocktails-and-drinks/Cappuccino.jpg',
  'cafe-latte': '/cocktails-and-drinks/Cafe-Latte.jpg',
  'filter-coffee': '/cocktails-and-drinks/Filter-Coffee.jpg',
  'moccachino': '/cocktails-and-drinks/Moccachino.jpg',

  // Freezos
  'coffee-freezo': '/cocktails-and-drinks/Coffee-Freezo.jpg',
  'spiced-chai-freezo': '/cocktails-and-drinks/Spiced-Chai-Freezo.jpg',
  'decadent-chocolate-freezo': '/cocktails-and-drinks/Decadent-Chocolate-Freezo.jpg',
  'white-chocolate-freezo': '/cocktails-and-drinks/White-Chocolate-Freezo.jpg',
  'mango-freezo': '/cocktails-and-drinks/Mango-Freezo.jpg',
  'chocolate-freezo': '/cocktails-and-drinks/Chocolate-Freezo.jpg',

  // Milkshakes
  'chocolate-shake': '/cocktails-and-drinks/Chocolate-Shake.jpg',
  'strawberry-shake': '/cocktails-and-drinks/Strawberry-Shake.jpg',
  'bubblegum-shake': '/cocktails-and-drinks/Bubblegum-Shake.jpg',
  'oreo-shake': '/cocktails-and-drinks/Oreo-Shake.jpg',
  'strawberry-milkshake': '/cocktails-and-drinks/Strawberry-Milkshake.jpg',
  'chocolate-milkshake': '/cocktails-and-drinks/Chocolate-Milkshake.jpg',

  // Classic Cocktails
  'classic-mojito': '/cocktails-and-drinks/Classic-Mojito.webp',
  'classic-martini': '/cocktails-and-drinks/Classic-Martini.jpg',
  'margarita': '/cocktails-and-drinks/Margarita.jpg',
  'whiskey-sour': '/cocktails-and-drinks/Whiskey-Sour.jpg',
  'old-fashioned': '/cocktails-and-drinks/Old-Fashioned.jpg',

  // Cocktails
  'caipirinha': '/cocktails-and-drinks/Caipirinha.jpg',
  'mojito': '/cocktails-and-drinks/Mojito.jpg',
  'pina-colada': '/cocktails-and-drinks/Pina-Colada.jpg',
  'strawberry-daiquiri': '/cocktails-and-drinks/Strawberry-Daiquiri.jpg',
  'cosmopolitan': '/cocktails-and-drinks/Cosmopolitan.jpg',
  'long-island-iced-tea': '/cocktails-and-drinks/Long-Island-Iced-Tea.jpg',
  'sex-on-the-beach': '/cocktails-and-drinks/Sex-on-the-beach.jpg',
  'rosemary-yuzu-g-t': '/cocktails-and-drinks/rosemary.jpg',
  'cherry-blossom-ginger-g-t': '/cocktails-and-drinks/cherry.jpg',
  'yuzu-whiskey-sours': '/cocktails-and-drinks/Yuzu-whiskey-Sours.jpg',
  'brown-butter-old-fashioned': '/cocktails-and-drinks/Brown-butter-Old-Fashioned.jpg',

  // Non-Alcoholic
  'berry-citrus-twist': '/cocktails-and-drinks/Berry-Citrus-Twist.webp',
  'cosmo-crush': '/cocktails-and-drinks/Cosmo-Crush.jpg',
  'no-jito': '/cocktails-and-drinks/No-Jito.jpg',
  'virgin-pina-colada': '/cocktails-and-drinks/Pina-Colada.jpg',
  'virgin-strawberry-daiquiri': '/cocktails-and-drinks/Strawberry-Daiquiri.jpg',
  'cherry-blossom-martini': '/cocktails-and-drinks/Cherry-blossom-martini.jpg',
  'virgin-mojito': '/cocktails-and-drinks/Virgin-Mojito.webp',
  'shirley-temple': '/cocktails-and-drinks/Shirley-Temple.jpg',

  // Beers
  'castle-lager': '/cocktails-and-drinks/Castle-Lager.jpg',
  'heineken': '/cocktails-and-drinks/Heineken.avif',
  'savanna-light': '/cocktails-and-drinks/Savanna-Light.jpg',
  'redds': '/cocktails-and-drinks/Redds.jpg',

  // Ciders
  'strongbow': '/cocktails-and-drinks/Strongbow.jpg',
  'savanna-dry': '/cocktails-and-drinks/Savanna-Dry.jpg',

  // Wine
  'house-red': '/cocktails-and-drinks/House-Red.jpg',
  'house-white': '/cocktails-and-drinks/House-White.jpg',
  'prosecco': '/cocktails-and-drinks/Prosecco.jpg',

  // Soft Drinks
  'coca-cola': '/cocktails-and-drinks/Coca-Cola.jpg',
  'sprite': '/cocktails-and-drinks/Sprite.jpg',

  // Mixers
  'tonic-water': '/cocktails-and-drinks/Tonic-Water.jpg',
  'ginger-ale': '/cocktails-and-drinks/Ginger-Ale.jpg',

  // Special Board
  'richelieu-mixer': '/cocktails-and-drinks/rich.webp',
  'klipdrift-mixer': '/cocktails-and-drinks/riii.webp',
  'kwv-3yr-mixer': '/cocktails-and-drinks/2025-04-23-2.webp',
  'captain-morgan-mixer': '/cocktails-and-drinks/2025-04-10.webp',
};

export function getBarImage(drinkName: string, category: string, adminImage?: string): string {
  if (adminImage && adminImage.trim() !== '') {
    return adminImage;
  }

  const slug = drinkName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (drinkSlugMap[slug]) {
    return drinkSlugMap[slug];
  }

  return BAR_FALLBACK;
}

export function getCategoryImage(category: string): string {
  return BAR_FALLBACK;
}