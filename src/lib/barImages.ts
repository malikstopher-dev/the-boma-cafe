// Bar Menu Image Resolver
// Maps drink names to bar images in priority order

export const BAR_FALLBACK = '/bar-menu/Milkshake.jpg';

const drinkSlugMap: Record<string, string> = {
  // Signature Cocktails
  'safari-sour': '/cocktails-and-drinks/Safari-sour.png',
  'thatched-toddy': '/cocktails-and-drinks/Thatched-Toddy.jpg',
  'garden-spritz': '/cocktails-and-drinks/Garden-Spritz.jpg',
  'boma-sunset': '/bar-menu/boma.jpg',

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
  'van-loveren': '/bar-menu/vrl-van-loveren.jpg',
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
  'virgin-mojito': '/bar-menu/virgin-mojito.jpg',
  
  // Beers - use exact bar-menu images
  'corona-extra': '/bar-menu/corona-extra.jpg',
  'corona-zero': '/bar-menu/corona-zero.png',
  'heineken-0-0': '/bar-menu/heineken-zero.png',
  'heineken-zero': '/bar-menu/heineken-zero.png',
  'heineken': '/bar-menu/heineken.png',
  'amstel-lager': '/bar-menu/amstel-lager.jpg',
  'castle-lager': '/bar-menu/Castle-Lager.jpg',
  'castle-milk-stout': '/bar-menu/castle-milkstout.jpg',
  'windhoek-lager': '/bar-menu/windhoek-lager.jpg',
  'hansa-pilsener': '/bar-menu/hansa-pilsener.png',
  'black-label': '/bar-menu/black-label.png',
  'guinness-draught': '/bar-menu/guinness-draught.jpg',
  'miller-genuine-draft': '/bar-menu/miller-genuine-draft.jpg',
  'strongbow': '/bar-menu/Strongbow.jpg',
  'flying-fish-lemon': '/bar-menu/flying-fish-lemon.png',
  'fishing-fish-lemon': '/bar-menu/flying-fish-lemon.png',
  'flying-fish-apple': '/bar-menu/flying-fish-apple.png',
  'fishing-fish-apple': '/bar-menu/flying-fish-apple.png',
  
  // Ciders & Coolers - use exact bar-menu images
  'bernini-classic': '/bar-menu/bernini-classic.jpg',
  'bernini-blush': '/bar-menu/bernini-blush.jpg',
  'brutal-fruit-spritzer': '/bar-menu/brutal-fruit-spritzer.jpg',
  'bacardi-breezer-blackberry': '/bar-menu/bacardi-breezer-blackberry.jpg',
  'bacardi-breezer-blueberry': '/bar-menu/bacardi-breezer-blueberry.jpg',
  'savanna-dry': '/bar-menu/Savanna-Dry.jpg',
  'savanna-light': '/bar-menu/savanna-lite.png',
  'savanna-zero': '/bar-menu/savanna-zero.png',
  'savanna': '/bar-menu/savanna.jpg',
  'hunters-gold': '/bar-menu/hunters-gold.png',
  'hunters-dry': '/bar-menu/hunters-dry.png',
  'hunters-extreme': '/bar-menu/hunters-extreme.png',
  
  // Gin & Ready-To-Drink - use exact bar-menu images
  'belgravia-gin-pink-tonic': '/bar-menu/belgravia-gin-and-pink-tonic.png',
  'belgravia-gin-dark-cherry': '/bar-menu/belgravia-gin-and-dark-cherry.png',
  'belgravia-gin-tonic': '/bar-menu/belgravia-gin-and-tonic.png',
  'belgravia-gin-passion': '/bar-menu/belgravia-gin-and-passion.png',
  'gordons-gin': '/bar-menu/gordons.jpg',
  'gordon-s-gin': '/bar-menu/gordons.jpg',
  'beefeater-london-pink-strawberry-gin': '/bar-menu/beefeater-london-pink-strawberry-gin.jpg',
  'beefeater-london-dry-gin': '/bar-menu/beefeater-london-dry-gin.jpg',
  
  // Spirits - use exact bar-menu images
  'jack-daniels-tennessee-whiskey': '/bar-menu/jack.jpg',
  'jack-daniel-s-tennessee-whiskey': '/bar-menu/jack.jpg',
  'j-b-whisky': '/bar-menu/j-and-b-whisky.jpg',
  'klipdrift': '/bar-menu/klipdrift.jpg',
  'richelieu': '/bar-menu/richelieu.jpg',
  'kwv-3-year': '/bar-menu/kwv-3-year.jpg',
  'kwv-5-year': '/bar-menu/kwv-5-year.jpg',
  'kwv-10': '/bar-menu/kwv-10-year.jpg',
  'bacardi-carta-blanca': '/bar-menu/bacardi-carta-blanca.png',
  'captain-morgan': '/bar-menu/captain-morgan.jpg',
  'skyy-vodka': '/bar-menu/skyy-vodka.jpg',
  'smirnoff': '/bar-menu/smirnoff.jpg',
  'amarula': '/bar-menu/amarula.jpg',
  'kahlua-coffee-liqueur': '/bar-menu/kahlua-2.jpg',
  'kahl-a-coffee-liqueur': '/bar-menu/kahlua-2.jpg',
  'aperol': '/bar-menu/aperol.png',
  'malibu': '/bar-menu/malibu.png',
  'monate': '/bar-menu/monate.png',
  'tipo-tinto-spiced': '/bar-menu/tipo-tinto-spiced.png',
  
  // Roses Cordials - use bar-menu images
  'roses-cordial': '/bar-menu/roses-cordials.png',
  'passion-fruit': '/bar-menu/roses-cordials-passion-fruit.png',
  'kola-tonic': '/bar-menu/roses-cordials-kola-tonic.png',
  'lime-cordial': '/bar-menu/roses-cordials-lime.png',
  
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
  'sprite': '/bar-menu/sprite-2.jpg',
  'sparletta-creme-soda': '/bar-menu/sparletta-creme-soda.jpg',
  'schweppes-mixers': '/bar-menu/schweppes-and-mixers.jpg',
  'valpre-water': '/bar-menu/valpre.jpg',
  'valpr-water': '/bar-menu/valpre.jpg',
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

// ─── bar-menu-images folder mapping ───────────────────────────────────────────
// Images organized by category folder in /public/bar-menu-images/

const categoryToFolder: Record<string, string> = {
  'Signature Cocktails': 'signature-cocktails',
  'Classic Cocktails': 'classic-cocktails',
  'Cocktails': 'extra-cocktails',
  'Non-Alcoholic Cocktails': 'non-alcoholic-cocktails',
  'Freezos': 'freezos',
  'Milkshakes': 'milkshakes',
  'Whisky': 'whiskies',
  'Brandy': 'brandies',
  'Gin': 'gins',
  'Vodka': 'vodka',
  'Rum': 'rum',
  'Shots': 'shots',
  'Shooters': 'shooters',
  'Beers': 'beers-ciders',
  'Ciders & RTDs': 'beers-ciders',
  'Sauvignon Blanc': 'wines/whites',
  'Chardonnay': 'wines/whites',
  'Chenin Blanc': 'wines/whites',
  'Rosé': 'wines/rose',
  'Cap Classique': 'wines/sparkling',
  'Merlot': 'wines/reds',
  'Pinotage': 'wines/reds',
  'Cabernet Sauvignon': 'wines/reds',
  'Shiraz': 'wines/reds',
  'Red Blends': 'wines/reds',
  'Other Varietals': 'wines/reds',
  'Special Board': 'special-combos',
  'Roses Cordials': 'beers-ciders',
  'Spirits & Liqueurs': 'beers-ciders',
  'Soft Drinks & Mixers': 'beers-ciders',
};

const barMenuItemMap: Record<string, string> = {
  // ── Signature Cocktails ─────────────────────────────────────────────────────
  'Boma Sunset': '01-boma-sunset.jpg',
  'Safari Sour': '02-safari-sour.jpg',
  'Thatched Toddy': '03-thatched-toddy.jpg',
  'Garden Spritz': '04-garden-spritz.jpg',
  // ── Classic Cocktails ───────────────────────────────────────────────────────
  'Classic Mojito': '05-classic-mojito.jpg',
  'Classic Martini': '06-classic-martini.jpg',
  'Margarita': '07-margarita.jpg',
  'Whiskey Sour': '08-whiskey-sour.jpg',
  'Old Fashioned': '09-old-fashioned.jpg',
  // ── Cocktails (Extra Cocktails) ─────────────────────────────────────────────
  'Caipirinha': 'caipirinha.jpg',
  'Pina Colada': 'pina-colada.jpg',
  'Long Island Iced Tea': 'long-island-iced-tea.jpg',
  'Cosmopolitan': 'cosmopolitan.jpg',
  'Sex on the Beach': 'sex-on-the-beach.jpg',
  'Strawberry Daiquiri': 'strawberry-daiquiri.jpg',
  'Yuzu Whiskey Sours': 'yuzu-whiskey-sour.jpg',
  'Mojito': 'mojito.jpg',
  'Rosemary Yuzu G&T': 'rosemary-yuzu-g-t.jpg',
  'Cherry Blossom Ginger G&T': 'cherry-blossom-ginger-g-t.jpg',
  'Brown Butter Old Fashioned': 'brown-butter-old-fashioned.jpg',
  // ── Non-Alcoholic Cocktails ─────────────────────────────────────────────────
  'Berry Citrus Twist': 'berry-citrus-twist.jpg',
  'Cosmo Crush': 'cosmo-crush.jpg',
  'No-Jito': 'no-jito.jpg',
  'Virgin Pina Colada': 'virgin-pina-colada.jpg',
  'Virgin Strawberry Daiquiri': 'virgin-strawberry-daiquiri.jpg',
  'Cherry Blossom Martini': 'cherry-blossom-martini.jpg',
  'Virgin Mojito': 'virgin-mojito.jpg',
  'Shirley Temple': 'shirley-temple.jpg',
  // ── Freezos ─────────────────────────────────────────────────────────────────
  'Coffee Freezo': 'coffee-freezo.jpg',
  'Spiced Chai Freezo': 'spiced-chai-freezo.jpg',
  'Decadent Chocolate Freezo': 'decadent-chocolate-freezo.jpg',
  'White Chocolate Freezo': 'white-chocolate-freezo.jpg',
  'Mango Freezo': 'mango-freezo.jpg',
  'Chocolate Freezo': 'chocolate-freezo.jpg',
  // ── Milkshakes ──────────────────────────────────────────────────────────────
  'Chocolate Shake': 'chocolate-shake.jpg',
  'Strawberry Shake': 'strawberry-shake.jpg',
  'Bubblegum Shake': 'bubblegum-shake.jpg',
  'Oreo Shake': 'oreo-shake.jpg',
  'Strawberry Milkshake': 'strawberry-milkshake.jpg',
  'Chocolate Milkshake': 'chocolate-milkshake.jpg',
  // ── Whisky ──────────────────────────────────────────────────────────────────
  'Jameson': 'jameson.jpg',
  'Jameson Select': 'jameson-select.jpg',
  'Monkey Shoulder': 'monkey-shoulder.jpg',
  'Bells': 'bells.jpg',
  'Johnnie Walker Black': 'johnnie-walker-black.jpg',
  'Jack Daniels': 'jack-daniels.jpg',
  'J&B Whisky': 'jb-rare.jpg',
  'Singleton 12 Years': 'singleton-12.jpg',
  // ── Brandy ──────────────────────────────────────────────────────────────────
  'Klipdrift': 'klipdrift.jpg',
  'Richelieu': 'richelieu.jpg',
  'KWV 10 Years': 'kwv-10.jpg',
  'KWV 3 Years': 'kwv-3.jpg',
  'KWV 5 Years': 'kwv-5.jpg',
  'Klipdrift Premium': 'klipdrift-premium.jpg',
  'Hennessy VS': 'hennessy-vs.jpg',
  'Hennessy VSOP': 'hennessy-vsop.jpg',
  // ── Gin ─────────────────────────────────────────────────────────────────────
  'Gordons Gin': 'gordons.jpg',
  'Bombay': 'bombay-sapphire.jpg',
  'Finery Gin': 'finery.jpg',
  'Inverroche Amber': 'inverroche-amber.jpg',
  'Beefeater Orange': 'beefeater-orange.jpg',
  'Beefeater Original': 'beefeater-original.jpg',
  'Beefeater Strawberry': 'beefeater-strawberry.jpg',
  // ── Rum ─────────────────────────────────────────────────────────────────────
  'Captain Morgan Black': 'captain-morgan-black.jpg',
  'Captain Morgan Spiced Gold': 'captain-morgan-spiced.jpg',
  'Red Heart': 'red-heart.jpg',
  // ── Vodka ───────────────────────────────────────────────────────────────────
  'Smirnoff 1818': 'smirnoff-1818.jpg',
  'Skyy Vodka': 'skyy-vodka.jpg',
  'Absolut Vodka': 'absolut-vodka.jpg',
  // ── Beers ───────────────────────────────────────────────────────────────────
  'Castle Lite': 'castle-lite.jpg',
  'Castle Lager': 'castle-lager.jpg',
  'Heineken': 'heineken.jpg',
  'Heineken Zero': 'heineken-zero.jpg',
  'Corona': 'corona.jpg',
  'Corona Zero': 'corona-zero.jpg',
  'Amstel Lager': 'amstel-lager.jpg',
  'Black Label': 'black-label.jpg',
  'Windhoek Lager': 'windhoek-lager.jpg',
  'Windhoek Draught': 'windhoek-draught.jpg',
  'Castle Milk Stout': 'castle-milk-stout.jpg',
  'Guinness Draught': 'guinness-draught.jpg',
  "Miller's Draft Bottle": 'millers-draft.jpg',
  'Hansa Pilsener': 'hansa-pilsener.jpg',
  'Flying Fish Lemon': 'flying-fish-lemon.jpg',
  'Flying Fish Apple': 'flying-fish-apple.jpg',
  // ── Ciders & RTDs ───────────────────────────────────────────────────────────
  'Hunters Dry': 'hunters-dry.jpg',
  'Hunters Gold': 'hunters-gold.jpg',
  'Hunters Extreme': 'hunters-extreme.jpg',
  'Savanna Dry': 'savanna-dry.jpg',
  'Savanna Lite': 'savanna-lite.jpg',
  'Savanna Zero': 'savanna-zero.jpg',
  'Belgravia Gin & Tonic': 'belgravia-gin-tonic.jpg',
  'Bernini Classic': 'bernini-classic.jpg',
  'Bernini Blush': 'bernini-blush.jpg',
  'Breezer Blueberry': 'breezer-blueberry.jpg',
  'Breezer Blackberry': 'breezer-blackberry.jpg',
  'Belgravia Gin & Dark Cherry': 'belgravia-gin-dark-cherry.jpg',
  'Brutal Fruit Ruby Apple': 'brutal-fruit-ruby-apple.jpg',
  // ── Shots ───────────────────────────────────────────────────────────────────
  'Jägermeister (750ml)': 'jagermeister.jpg',
  'Jägermeister (1L)': 'jagermeister.jpg',
  'Olmeca Gold': 'olmeca-gold.jpg',
  'Olmeca Silver': 'olmeca-silver.jpg',
  'Don Julio Reposado': 'don-julio-reposado.jpg',
  'Cactus Jack': 'cactus-jack.jpg',
  'Espolon': 'espolon.jpg',
  'Strawberry Lips': 'strawberry-lips.jpg',
  'Don Julio Silver': 'don-julio-silver.jpg',
  'Jack Fire': 'jack-fire.jpg',
  'Patrón': 'patron-silver.jpg',
  'Los Lacos Reposado': 'los-lacos-reposado.jpg',
  'Amarula': 'amarula.jpg',
  'Kahlua': 'kahlua.jpg',
  // ── Shooters ────────────────────────────────────────────────────────────────
  'Blowjob': 'blowjob.jpg',
  'Jäger Bomb': 'jager-bomb.jpg',
  'Springbok': 'springbok.jpg',
  'Sowetan Toilet': 'sowetan-toilet.jpg',
  'Suitcase': 'suitcase.jpg',
  'Liquid Cocaine': 'liquid-cocaine.jpg',
  // ── Wines ───────────────────────────────────────────────────────────────────
  'Spier (Sauvignon Blanc)': 'spier-sauvignon-blanc.jpg',
  'Spier Rosé': 'rose.jpg',
  'Krone Night Nectar': 'krone-night-nectar.jpg',
  'Krone Night Nectar Rosé': 'krone-night-nectar.jpg',
  'Krone Borealis Brut': 'krone-night-nectar.jpg',
  'Graham Beck Brut Rosé': 'graham-beck-brut-rose.jpg',
  "Moët & Chandon": 'moet-chandon.jpg',
  'Steenberg Chardonnay Brut': 'steenberg-chardonnay-brut.jpg',
  'Guardian Peak': 'guardian-peak-merlot.jpg',
  'Waterford': 'waterford-cabernet.jpg',
  'Fat Bastard': 'fat-bastard-cabernet.jpg',
  'Rust en Vrede': 'rust-en-vrede-cabernet.jpg',
  'Cederberg': 'cederberg-shiraz.jpg',
  'Meerlust Rubicon': 'meerlust-rubicon.jpg',
  'Alto Rouge': 'alto-rouge.jpg',
  'Boschendal Nicolas': 'boschendal-nicolas.jpg',
  'Pepperwind Syrah': 'shiraz.jpg',
  // ── Spirits & Liqueurs ─────────────────────────────────────────────────────
  'Bacardi Carta Blanca': 'bacardi-carta-blanca.jpg',
  'Aperol': 'aperol.jpg',
  'Malibu': 'malibu.jpg',
  'Monate': 'monate.jpg',
  'Tipo Tinto Spiced': 'tipo-tinto-spiced.jpg',
  // ── Roses Cordials ─────────────────────────────────────────────────────────
  'Roses Cordial': 'roses-cordial.jpg',
  'Passion Fruit': 'passion-fruit.jpg',
  'Kola Tonic': 'kola-tonic.jpg',
  'Lime Cordial': 'lime-cordial.jpg',
};

export function getBarMenuItemImage(itemName: string, categoryName: string): string | null {
  // Priority 1: Exact match in barMenuItemMap → bar-menu-images folder
  if (barMenuItemMap[itemName]) {
    const folder = categoryToFolder[categoryName];
    if (folder) {
      return `/bar-menu-images/${folder}/${barMenuItemMap[itemName]}`;
    }
  }

  const slug = itemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Priority 2: Check old drinkSlugMapOurBarMenu for /bar-menu/ or /menu/our-bar-menu/ paths
  if (drinkSlugMapOurBarMenu[slug]) {
    return drinkSlugMapOurBarMenu[slug];
  }

  // Priority 3: Check old drinkSlugMap for /cocktails-and-drinks/ paths
  if (drinkSlugMap[slug]) {
    return drinkSlugMap[slug];
  }

  return null;
}