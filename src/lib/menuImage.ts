const LEGACY_IMAGE_MAP: Record<string, string> = {
  'Day Breaker': '/menu/day-breaker.jpg',
  'Cheese Griller Breakfast': '/menu/cheese-griller-breakfast.jpg',
  'Wors Breakfast': '/menu/wors-breakfast.jpg',
  'Carb-Conscious Breakfast': '/menu/carb-conscious-breakfast.jpg',
  'Boma Breakfast': '/menu/boma-breakfast.jpg',
  'Cheese & Tomato': '/menu/cheese-and-tomato.jpg',
  'Chicken & Mayo': '/menu/chicken-and-mayo.jpg',
'Bacon, Egg & Cheese': '/menu/bacon-egg-and-cheese.jpg',
  'Steak & Cheese': '/menu/steak-and-cheese.jpg',
  '8 Wings & Chips': '/menu/8-wings-and-chips.jpg',
  'Wors & 1/4 Chicken': '/menu/wors-and-1-4-chicken.jpg',
  '200g Ribs & 5 Wings': '/menu/200g-ribs-and-5-wings.jpeg',
  'Wors & 5 Wings': '/menu/wors-and-5-wings.jpg',
  '200g Wors & Ribs': '/menu/200g-wors-and-ribs.jpg',
  '200g Ribs & 1/4 Chicken': '/menu/200g-ribs-and-1-4-chicken.jpg',
  '8 Wings & Ribs': '/menu/8-wings-and-ribs.jpg',
  '200g Ribs & Steak': '/menu/200g-ribs-and-steak.jpg',
  'Boma Basket': '/menu/boma-basket.jpg',
  'Lamb Bunny Chow': '/menu/lamb-bunny-chow.jpg',
  'Beef Bunny Chow': '/menu/beef-bunny-chow.jpg',
  'Butter Chicken Bunny Chow': '/menu/butter-chicken-bunny-chow.jpg',
  'Lamb Durban Curry': '/menu/lamb-durban-curry.jpg',
  'Beef Durban Curry': '/menu/beef-durban-curry.jpg',
  'Butter Chicken Durban Curry': '/menu/butter-chicken-durban-curry.jpg',
  'Lamb Roti Roll': '/menu/lamb-roti-roll.jpg',
  'Rooibos Cappuccino': '/menu/rbos-cappuccino.jpg',
  'Vanilla Latte': '/menu/vanilla-latte.jpg',
  'Brown Butter Latte': '/menu/brown-butter-latte.jpg',
  'Hazelnut Latte': '/menu/hazelnut-latte.webp',
  'Chai Tea': '/menu/chai-tea.jpg',
  'Spicy Chai': '/menu/spicy-chai.jpg',
  'Five Roses Tea': '/menu/five-roses-tea.jpg',
  'Rooibos Tea': '/menu/rooibos-tea.jpg',
  'Hot Chocolate': '/menu/hot-chocolate.jpg',
  'Americano': '/menu/americano.jpg',
  'Espresso': '/menu/expresso.jpg',
  'Cappuccino': '/menu/cappuccino.jpg',
  'CafÃ© Latte': '/menu/cafe-latte.jpg',
  'Filter Coffee': '/menu/filter-coffee.jpg',
  'Moccachino': '/menu/moccachino.jpg',
  'Coffee Freezo': '/menu/coffee-freezo.jpg',
  'Spiced Chai Freezo': '/menu/spiced-chai-freezo.jpg',
  'Decadent Chocolate Freezo': '/menu/decadent-chocolate-freezo.jpg',
  'White Chocolate Freezo': '/menu/white-chocolate-freezo.jpg',
  'Chocolate Shake': '/menu/chocolate-shake.jpg',
  'Strawberry Shake': '/menu/strawberry-shake.jpg',
  'Bubblegum Shake': '/menu/bubblegum-shake.jpg',
  'Oreo Shake': '/menu/oreo-shake.jpg',
  'Mojito': '/menu/mojito.jpg',
  'Classic Martini': '/menu/classic-martini.jpg',
  'Margarita': '/menu/margarita.jpg',
  'Caipirinha': '/menu/caipirinha.jpg',
  'Pina Colada': '/menu/pina-colada.jpg',
  'Strawberry Daiquiri': '/menu/strawberry-daiquiri.jpg',
  'Cosmopolitan': '/menu/cosmopolitan.jpg',
  'Long Island Iced Tea': '/menu/long-island-iced-tea.jpg',
  'Sex on the Beach': '/menu/sex-on-the-beach.jpg',
  'Rosemary Yuzu G&T': '/menu/rosemary-yuzu-g-and-t.jpg',
  'Cherry Blossom Ginger G&T': '/menu/cherry-blossom-ginger-g-and-t.jpg',
  'Yuzu Whiskey Sours': '/menu/yuzu-whiskey-sours.jpg',
  'Brown Butter Old Fashioned': '/menu/brown-butter-old-fashioned.jpg',
  'Berry Citrus Twist': '/menu/berry-citrus-twist.jpg',
  'Cosmo Crush': '/menu/cosmo-crush.jpg',
  'No-Jito': '/menu/no-jito.jpg',
  'Virgin Pina Colada': '/menu/virgin-pina-colada.jpg',
  'Virgin Strawberry Daiquiri': '/menu/virgin-strawberry-daiquiri.jpg',
  'Cherry Blossom Martini': '/menu/cherry-blossom-martini.jpg',
  'Classic Beef Burger': '/menu/classic-beef-burger.jpg',
  'Chicken Burger': '/menu/chicken-burger.jpg',
  'Boma Double Burger': '/menu/boma-double-burger.jpg',
  'Veggie Burger': '/menu/veggie-burger.jpg',
  'Egg': '/menu/egg.jpg',
  'Bacon': '/menu/bacon.png',
  'Avo': '/menu/avo.jpg',
  'Cheese': '/menu/cheese.jpg',
  'Beef Patty': '/menu/beef-patty.jpg',
  'Lamb Patty': '/menu/lamb-patty.jpg',
  'Lamb Patty & Cheese': '/menu/lamb-patty-and-cheese.jpg',
  'Lamb Russian & Cheese': '/menu/lamb-russian-and-cheese.jpg',
  'Beef Patty & Cheese': '/menu/beef-patty-cheese.jpg',
  'Small Fries': '/menu/small-fries.jpg',
  'Medium Fries': '/menu/medium-fries.jpg',
  'Large Fries': '/menu/large-fries.jpg',
  'Something Meaty': '/menu/pizza.webp',
  'Something Cheesy': '/menu/something-cheesy.jpg',
  'BBQ Chicken': '/menu/bbq-chicken.jpg',
  'Lamb Curry & Cheese': '/menu/lamb-curry-and-cheese.jpg',
  'Margherita': '/menu/margherita.jpg',
  'Sausage': '/menu/sausage.jpg',
  'Regina': '/menu/regina-pizza.jpg',
  'Hawaiian': '/menu/hawaiian-pizza.jpg',
  'Pizza Extra: Ham': '/menu/pizza.webp',
  'Pizza Extra: Salami': '/menu/pizza-extra-salami.jpg',
  'Pizza Extra: Mushrooms': '/menu/pizza-extra-mushrooms.jpg',
  'Pizza Extra: Peppers': '/menu/pizza-extra-peppers.jpg',
  'Pizza Extra: Cheese': '/menu/pizza-extra-cheese.jpg',
  'Pizza Extra: Olives': '/menu/black-olive-pizza-gourmet-restaurant.jpg',
  'Pizza Extra: Bacon': '/menu/beacon.jpg',
  'Cheese Cake': '/menu/cheese-cake.jpg',
  'Carrot Cake': '/menu/carrot-cake.jpg',
  'Chocolate Cake': '/menu/chocolate-cake.jpg',
  'Ice Cream & Chocolate Sauce': '/menu/ice-cream-and-chocolate-sauce.jpg',
  'Seasonal Fruit': '/menu/seasonal-fruit.jpg',
  'Chicken Strips & Fries': '/menu/chicken-strips-and-fries.jpg',
  'Wings & Fries': '/menu/wings-and-fries.jpg',
  'Ribs & Wings': '/menu/ribs-and-wings.jpg',
  'Burger & Waffle Fries': '/menu/burger-and-waffle-fries.jpg',
  'Kiddies Pizza (20cm)': '/menu/pizza.webp',
  'Milkshake': '/menu/milkshake.jpg',
  'Juice': '/menu/juice.jpg',
  'Boma Pastry Platter': '/menu/boma-pastry-platter.jpg',
  'Boma Platter': '/menu/boma-platter.jpg',
  'Boma Chicken Platter': '/menu/boma-chicken-platter.jpg',
  'Boma Meaty Platter': '/menu/boma-meaty-platter.jpg',
  'Boma Sandwich Platter': '/menu/boma-sandwich-platter.jpg',
  'Boma Hungry Mix Platter': '/menu/boma-hungry-mix-platter.jpg',
  'Boma Sweet Platter 1': '/menu/boma-sweet-platter-1.jpg',
  'Boma Sweet Platter 2': '/menu/boma-sweet-platter-2.jpg',
  'Customized Platter': '/menu/boma-platter.jpg',
  '1/4 Chicken and Chips': '/menu/1-4-chicken-and-chips.jpg',
  '1/2 Chicken and Chips': '/menu/1-2-chicken-and-chips.webp',
  '1/4 Chicken, Pap & Gravy': '/menu/1-4-chicken-pap-and-gravy.jpg',
  '1/4 Chicken Tikka, Chips & Roti': '/menu/1-4-chicken-tikka-chips-and-roti.jpg',
  '2 Piece Hake & Chips': '/menu/2-piece-hake-and-chips.jpg',
  '300g T-Bone Steak': '/menu/300g-t-bone-steak.jpg',
  '300g T-Bone Steak, Egg & Chips': '/menu/300g-t-bone-steak-egg-and-chips.jpg',
  '500g T-Bone Steak': '/menu/500g-t-bone-steak.jpg',
  '300g Steak Sirloin': '/menu/300g-steak-sirloin.jpg',
  '300g Rack of Ribs': '/menu/300g-rack-of-ribs.jpg',
  '500g Rack of Ribs': '/menu/500g-rack-of-ribs.jpg',
  'Braai Platter for 2': '/menu/braai-platter-for-2.jpg',
  'Braai Platter for 4': '/menu/braai-platter-for-4.jpg',
  'Braai Platter for 6': '/menu/braai-platter-for-6.jpg',
  'Beef Roti Roll': '/menu/beef-roti-roll.jpg',
  'Butter Chicken Roti Roll': '/menu/butter-chicken-roti-roll.jpg',
  'Cold Drink / Soda': '/menu/cold-drink-soda.jpg',
  'Appletiser / Grapetiser': '/menu/appletiser-grapetiser.jpg',
  'Still / Sparkling Water': '/menu/still-sparkling-water.jpg',
  'Liquifruit': '/menu/liquifruit.jpg',
  'Red Bull': '/menu/red-bull.jpg',
  'Rock Shandy': '/menu/rock-shandy.jpg',
  'Steelworks': '/menu/steelworks.jpg',
  'Fresh Juice': '/menu/fresh-juice.jpg',
  'Chocolate Freezo': '/menu/chocolate-freezo.jpg',
};

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const IMAGE_EXTS = ['webp', 'jpg', 'jpeg', 'png'] as const;

export function getMenuImage(name: string, ext: string = 'jpg'): string {
  const slug = slugify(name);
  return `/menu/${slug}.${ext}`;
}

export function getImagePathWithExt(name: string): { paths: string[], fallback: string } {
  const slug = slugify(name);
  const paths = IMAGE_EXTS.map(ext => `/menu/${slug}.${ext}`);
  const fallback = '/menu/boma-breakfast.jpg';
  return { paths, fallback };
}

export const FALLBACK_IMAGE = '/menu/fallback.jpg';

export function getMenuItemImage(itemName: string): string {
  if (LEGACY_IMAGE_MAP[itemName]) {
    return LEGACY_IMAGE_MAP[itemName];
  }
  const slug = slugify(itemName);
  const slugPath = `/menu/${slug}.jpg`;
  return slugPath;
}
