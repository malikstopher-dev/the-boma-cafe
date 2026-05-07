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
  
  // Beers - use exact bar-menu images
  'corona-extra': '/bar-menu/corona-extra.jpg',
  'heineken-0.0': '/bar-menu/Heineken.avif',
  'heineken': '/bar-menu/heineken.jpg',
  'amstel-lager': '/bar-menu/amstel-lager.jpg',
  'castle-lager': '/bar-menu/Castle-Lager.jpg',
  'castle-milk-stout': '/bar-menu/castle-milkstout.jpg',
  'windhoek-lager': '/bar-menu/windhoek-lager.jpg',
  'hansa-pilsener': '/bar-menu/hansa-pilsener.jpg',
  'black-label': '/bar-menu/black-label.jpg',
  'guinness-draught': '/bar-menu/guinness-draught.jpg',
  'miller-genuine-draft': '/bar-menu/miller-genuine-draft.jpg',
  'strongbow': '/bar-menu/Strongbow.jpg',
  
  // Ciders & Coolers - use exact bar-menu images
  'bernini-classic': '/bar-menu/bernini-classic.jpg',
  'bernini-blush': '/bar-menu/bernini-blush.jpg',
  'brutal-fruit-spritzer': '/bar-menu/brutal-fruit-spritzer.jpg',
  'bacardi-breezer-blackberry': '/bar-menu/bacardi-breezer-blackberry.jpg',
  'bacardi-breezer-blueberry': '/bar-menu/bacardi-breezer-blueberry.jpg',
  'savanna-dry': '/bar-menu/Savanna-Dry.jpg',
  'savanna-light': '/bar-menu/Savanna-Light.jpg',
  'savanna': '/bar-menu/savanna.jpg',
  'hunters-gold': '/bar-menu/hunters-gold.jpg',
  
  // Gin & Ready-To-Drink - use exact bar-menu images
  'belgravia-gin-pink-tonic': '/bar-menu/belgravia-gin-and-pink-tonic.jpg',
  'belgravia-gin-dark-cherry': '/bar-menu/belgravia-gin-and-dark-cherry.jpg',
  'belgravia-gin-tonic': '/bar-menu/belgravia-gin-and-tonic.jpg',
  'belgravia-gin-passion': '/bar-menu/belgravia-gin-and-passion.png',
  'gordons-gin': '/bar-menu/gordons-gin.jpg',
  'beefeater-london-pink-strawberry-gin': '/bar-menu/beefeater-london-pink-strawberry-gin.jpg',
  'beefeater-london-dry-gin': '/bar-menu/beefeater-london-dry-gin.jpg',
  
  // Spirits - use exact bar-menu images
  'jack-daniels-tennessee-whiskey': '/bar-menu/jack-daniel-s-tennessee-whiskey.jpg',
  'j-b-whisky': '/bar-menu/j-and-b-whisky.jpg',
  'klipdrift': '/bar-menu/klipdrift.jpg',
  'richelieu': '/bar-menu/richelieu.jpg',
  'kwv-3-year': '/bar-menu/kwv-3-year.jpg',
  'kwv-5-year': '/bar-menu/kwv-5-year.jpg',
  'kwv-10': '/bar-menu/kwv-10-year.jpg',
  'bacardi-carta-blanca': '/bar-menu/bacardi-carta-blanca.jpg',
  'captain-morgan': '/bar-menu/captain-morgan.jpg',
  'skyy-vodka': '/bar-menu/skyy-vodka.jpg',
  'smirnoff': '/bar-menu/smirnoff.jpg',
  'amarula': '/bar-menu/amarula.jpg',
  'kahlua-coffee-liqueur': '/bar-menu/kahlua-coffee-liqueur.jpg',
  'aperol': '/bar-menu/aperol.jpg',
  'malibu': '/bar-menu/malibu.jpg',
  'monate': '/bar-menu/monate.jpg',
  'tipo-tinto-spiced': '/bar-menu/tipo-tinto-spiced.jpg',
  
  // Wines - use exact bar-menu images
  'spier': '/bar-menu/spier.jpg',
  'alto-rouge': '/bar-menu/alto-rouge.jpg',
  'guardian-peak': '/bar-menu/guardian-peak.jpg',
  'vrl-van-loveren': '/bar-menu/vrl-van-loveren.jpg',
  'merlot': '/bar-menu/merlot.jpg',
  'pinotage': '/bar-menu/pinotage.jpg',
  'sauvignon-blanc': '/bar-menu/sauvignon-blanc.png',
  'chenin-blanc': '/bar-menu/chenin-blanc.jpg',
  'chardonnay': '/bar-menu/chardonnay.jpg',
  'rose': '/bar-menu/rose.jpg',
  'ros': '/bar-menu/rose.jpg',
  'nederburg': '/bar-menu/nederburg.jpg',
  'the-beach-house': '/bar-menu/the-beach-house.jpg',
  'optima': '/bar-menu/optima.jpg',
  'pepperwind-syrah': '/bar-menu/pepperwind-syrah.jpg',
  'house-red': '/bar-menu/House-Red.jpg',
  'house-white': '/bar-menu/House-White.jpg',
  
  // Sparkling & MCC - use exact bar-menu images
  'krone': '/bar-menu/krone.jpg',
  'moet-chandon': '/bar-menu/moet-and-chandon.jpg',
  'mo-t-chandon': '/bar-menu/moet-and-chandon.jpg',
  'graham-beck': '/bar-menu/graham-beck.jpg',
  'sparkling-rose': '/bar-menu/sparkling-rose.jpg',
  'sparkling-ros': '/bar-menu/sparkling-rose-2.jpg',
  'prosecco': '/bar-menu/Prosecco.jpg',
  'assorted-mcc-sparkling-wine': '/bar-menu/assorted-mcc-sparkling-wine.jpg',
  
  // Soft Drinks & Mixers - use exact bar-menu images
  'sprite': '/bar-menu/sprite.jpg',
  'sparletta-creme-soda': '/bar-menu/sparletta-creme-soda.jpg',
  'schweppes-mixers': '/bar-menu/schweppes-and-mixers.jpg',
  'valpre-water': '/bar-menu/valpre-water.jpg',
  'still-water': '/bar-menu/Still-Sparkling-Water.jpg',
  'liqui-fruit': '/bar-menu/liqui-fruit.jpg',
  'tropika': '/bar-menu/tropika.jpg',
  'appletiser': '/bar-menu/appletiser.jpg',
  'juice-dispensers-house-juice': '/bar-menu/juice-dispensers-house-juice.jpg',
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