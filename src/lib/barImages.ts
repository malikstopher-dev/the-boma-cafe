// Bar Menu Image Resolver
// Maps drink names to bar images in priority order

const BAR_FALLBACK = '/bar-menu/Milkshake.jpg';

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
  'virgin-pina-colada': '/bar-menu/Pina-Colada.jpg',
  'virgin-strawberry-daiquiri': '/bar-menu/Strawberry-Daiquiri.jpg',
  'cherry-blossom-martini': '/cocktails-and-drinks/Cherry-blossom-martini.jpg',
  'virgin-mojito': '/cocktails-and-drinks/Virgin-Mojito.webp',
  'shirley-temple': '/cocktails-and-drinks/Shirley-Temple.jpg',

  // Special Board
  'richelieu-mixer': '/cocktails-and-drinks/rich.webp',
  'klipdrift-mixer': '/cocktails-and-drinks/riii.webp',
  'kwv-3yr-mixer': '/cocktails-and-drinks/2025-04-23-2.webp',
  'captain-morgan-mixer': '/cocktails-and-drinks/2025-04-10.webp',
};

const drinkSlugMapOurBarMenu: Record<string, string> = {
  // Map drinks that exist in /menu/our-bar-menu or /bar-menu
  'thatched-toddy': '/menu/our-bar-menu/Thatched-Toddy.jpg',
  'old-fashioned': '/menu/our-bar-menu/Old-Fashioned.jpg',
  'whiskey-sour': '/menu/our-bar-menu/Whiskey-Sour.jpg',
  'bubblegum-shake': '/menu/our-bar-menu/Bubblegum-Shake.jpg',
  'chocolate-freezo': '/menu/our-bar-menu/Chocolate-Freezo.jpg',
  'mango-freezo': '/menu/our-bar-menu/Mango-Freezo.jpg',
  'garden-spritz': '/menu/our-bar-menu/Garden-Spritz.jpg',
  'safari-sour': '/menu/our-bar-menu/Safari-sour.png',
  'juice': '/menu/our-bar-menu/Juice.jpg',
  'milkshake': '/menu/our-bar-menu/Milkshake.jpg',
  'cherry-blossom-martini': '/menu/our-bar-menu/Cherry-blossom-martini.jpg',
  'no-jito': '/menu/our-bar-menu/No-Jito.jpg',
  'cosmo-crush': '/menu/our-bar-menu/Cosmo-Crush.jpg',
  'berry-citrus-twist': '/menu/our-bar-menu/Berry-Citrus-Twist.webp',
  'brown-butter-old-fashioned': '/menu/our-bar-menu/Brown-butter-Old-Fashioned.jpg',
  'yuzu-whiskey-sours': '/menu/our-bar-menu/Yuzu-whiskey-Sours.jpg',
  'cherry-blossom-ginger-g-t': '/menu/our-bar-menu/Cherry-blossom-ginger-G-and-T.jpg',
  'rosemary-yuzu-g-t': '/menu/our-bar-menu/Rosemary-Yuzu-G-and-T.jpg',
  'sex-on-the-beach': '/menu/our-bar-menu/Sex-on-the-beach.jpg',
  'long-island-iced-tea': '/menu/our-bar-menu/Long-Island-Iced-Tea.jpg',
  'cosmopolitan': '/menu/our-bar-menu/Cosmopolitan.jpg',
  'strawberry-daiquiri': '/menu/our-bar-menu/Strawberry-Daiquiri.jpg',
  'pina-colada': '/menu/our-bar-menu/Pina-Colada.jpg',
  'mojito': '/menu/our-bar-menu/Mojito.jpg',
  'caipirinha': '/menu/our-bar-menu/Caipirinha.jpg',
  'margarita': '/menu/our-bar-menu/Margarita.jpg',
  'classic-martini': '/menu/our-bar-menu/Classic-Martini.jpg',
  'oreo-shake': '/menu/our-bar-menu/Oreo-Shake.jpg',
  'strawberry-shake': '/menu/our-bar-menu/Strawberry-Shake.jpg',
  'strawberry-milkshake': '/menu/our-bar-menu/Strawberry-Milkshake.jpg',
  'chocolate-shake': '/menu/our-bar-menu/Chocolate-Shake.jpg',
  'chocolate-milkshake': '/menu/our-bar-menu/Chocolate-Milkshake.jpg',
  'white-chocolate-freezo': '/menu/our-bar-menu/White-Chocolate-Freezo.jpg',
  'decadent-chocolate-freezo': '/menu/our-bar-menu/Decadent-Chocolate-Freezo.jpg',
  'spiced-chai-freezo': '/menu/our-bar-menu/Spiced-Chai-Freezo.jpg',
  'coffee-freezo': '/menu/our-bar-menu/Coffee-Freezo.jpg',
  'fresh-juice': '/menu/our-bar-menu/Fresh-Juice.jpg',
  'steelworks': '/menu/our-bar-menu/Steelworks.jpg',
  'rock-shandy': '/menu/our-bar-menu/Rock-Shandy.jpg',
  'red-bull': '/menu/our-bar-menu/Red-Bull.jpg',
  'liquifruit': '/menu/our-bar-menu/liquifruit.jpg',
  'still-sparkling-water': '/menu/our-bar-menu/Still-Sparkling-Water.jpg',
  'appletiser-grapetiser': '/menu/our-bar-menu/Appletiser-Grapetiser.jpg',
  'moccachino': '/menu/our-bar-menu/Moccachino.jpg',
  'filter-coffee': '/menu/our-bar-menu/Filter-Coffee.jpg',
  'cafe-latte': '/menu/our-bar-menu/Cafe-Latte.jpg',
  'cappuccino': '/menu/our-bar-menu/Cappuccino.jpg',
  'expresso': '/menu/our-bar-menu/expresso.jpg',
  'americano': '/menu/our-bar-menu/Americano.jpg',
  'hot-chocolate': '/menu/our-bar-menu/Hot-Chocolate.jpg',
  'rooibos-tea': '/menu/our-bar-menu/Rooibos-Tea.jpg',
  'five-roses-tea': '/menu/our-bar-menu/Five-Roses-Tea.jpg',
  'hazelnut-latte': '/menu/our-bar-menu/Hazelnut-Latte.webp',
  'vanilla-latte': '/menu/our-bar-menu/Vanilla-Latte.jpg',
  'rbos-cappuccino': '/menu/our-bar-menu/Rbos-Cappuccino.jpg',
  'classic-mojito': '/menu/our-bar-menu/Classic Mojito.webp',
  
  // Non-Alcoholic - use bar-menu images
  'virgin-pina-colada': '/bar-menu/Pina-Colada.jpg',
  'virgin-strawberry-daiquiri': '/bar-menu/Strawberry-Daiquiri.jpg',
  'virgin-mojito': '/menu/our-bar-menu/Virgin-Mojito.webp',
  
  // Beers - use available bar images
  'corona-extra': '/bar-menu/Castle-Lager.jpg',
  'heineken-0.0': '/bar-menu/Heineken.avif',
  'heineken': '/bar-menu/Heineken.avif',
  'amstel-lager': '/bar-menu/Castle-Lager.jpg',
  'castle-lager': '/bar-menu/Castle-Lager.jpg',
  'castle-milk-stout': '/bar-menu/Castle-Lager.jpg',
  'windhoek-lager': '/bar-menu/Castle-Lager.jpg',
  'hansa-pilsener': '/bar-menu/Castle-Lager.jpg',
  'black-label': '/bar-menu/Castle-Lager.jpg',
  'guinness-draught': '/bar-menu/Castle-Lager.jpg',
  'miller-genuine-draft': '/bar-menu/Castle-Lager.jpg',
  
  // Ciders
  'bernini-classic': '/bar-menu/Savanna-Light.jpg',
  'bernini-blush': '/bar-menu/Savanna-Light.jpg',
  'brutal-fruit-spritzer': '/bar-menu/Savanna-Light.jpg',
  'bacardi-breezer-blueberry': '/bar-menu/Savanna-Light.jpg',
  'bacardi-breezer-blackberry': '/bar-menu/Savanna-Light.jpg',
  'savanna': '/bar-menu/Savanna-Light.jpg',
  'savanna-light': '/bar-menu/Savanna-Light.jpg',
  'savanna-dry': '/bar-menu/Savanna-Dry.jpg',
  'hunters-gold': '/bar-menu/Savanna-Light.jpg',
  'strongbow': '/bar-menu/Strongbow.jpg',
  
  // Wine & Sparkling
  'house-red': '/bar-menu/House-Red.jpg',
  'house-white': '/bar-menu/House-White.jpg',
  'prosecco': '/bar-menu/Prosecco.jpg',
  'spier': '/bar-menu/House-Red.jpg',
  'alto-rouge': '/bar-menu/House-Red.jpg',
  'guardian-peak': '/bar-menu/House-Red.jpg',
  'vrl-van-loveren': '/bar-menu/House-Red.jpg',
  'merlot': '/bar-menu/House-Red.jpg',
  'pinotage': '/bar-menu/House-Red.jpg',
  'sauvignon-blanc': '/bar-menu/House-White.jpg',
  'chenin-blanc': '/bar-menu/House-White.jpg',
  'chardonnay': '/bar-menu/House-White.jpg',
  'rose': '/bar-menu/Prosecco.jpg',
  'nederburg': '/bar-menu/House-Red.jpg',
  'the-beach-house': '/bar-menu/House-White.jpg',
  'optima': '/bar-menu/House-Red.jpg',
  'pepperwind-syrah': '/bar-menu/House-Red.jpg',
  'krone': '/bar-menu/Prosecco.jpg',
  'moet-chandon': '/bar-menu/Prosecco.jpg',
  'graham-beck': '/bar-menu/Prosecco.jpg',
  'sparkling-rose': '/bar-menu/Prosecco.jpg',
  
  // Soft Drinks
  'sprite': '/bar-menu/Sprite.jpg',
  'coca-cola': '/bar-menu/Coca-Cola.jpg',
  'coca cola': '/bar-menu/Coca-Cola.jpg',
  'tonic-water': '/bar-menu/Tonic-Water.jpg',
  'ginger-ale': '/bar-menu/Ginger-Ale.jpg',
  'valpre-water': '/bar-menu/Still-Sparkling-Water.jpg',
  'still-water': '/bar-menu/Still-Sparkling-Water.jpg',
  'liqui-fruit': '/bar-menu/liquifruit.jpg',
  'tropika': '/bar-menu/liquifruit.jpg',
  'appletiser': '/bar-menu/Appletiser-Grapetiser.jpg',
  'red-bull-energy-drinks': '/bar-menu/Red-Bull.jpg',
};

export function getBarImage(drinkName: string, category: string, adminImage?: string): string {
  if (adminImage && adminImage.trim() !== '') {
    return adminImage;
  }

  const slug = drinkName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Priority 1: Check our-bar-menu folder first
  if (drinkSlugMapOurBarMenu[slug]) {
    return drinkSlugMapOurBarMenu[slug];
  }

  // Priority 2: Check cocktails-and-drinks folder
  if (drinkSlugMap[slug]) {
    return drinkSlugMap[slug];
  }

  // Priority 3: Use fallback (bar-specific placeholder)
  return BAR_FALLBACK;
}

export function getCategoryImage(category: string): string {
  return BAR_FALLBACK;
}