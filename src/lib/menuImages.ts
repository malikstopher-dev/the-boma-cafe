export interface MenuImageConfig {
  categoryFallbacks: Record<string, string>;
  itemImages: Record<string, string>;
}

// Level 1: Specific item images - unique images for each menu item
const ITEM_IMAGES: Record<string, string> = {
  // BREAKFAST
  'Day Breaker': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  'Cheese Griller Breakfast': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop',
  'Wors Breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
  'Carb-Conscious Breakfast': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop',
  'Boma Breakfast': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',

  // TOASTIES - group by type
  'Cheese & Tomato': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Chicken & Mayo': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Bacon, Egg & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Lamb Russian & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Lamb Patty & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Beef Patty & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Steak & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',

  // HUNGRY... ISH - mixed grill items
  '8 Wings & Chips': 'https://images.unsplash.com/photo-1608039829572-9432d2d1f104?w=400&h=300&fit=crop',
  'Wors & 1/4 Chicken': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  '200g Ribs & 5 Wings': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Wors & 5 Wings': 'https://images.unsplash.com/photo-1608039829572-9432d2d1f104?w=400&h=300&fit=crop',
  '10 Samoosas': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  '200g Wors & Ribs': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  '200g Ribs & 1/4 Chicken': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  '8 Wings & Ribs': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  '200g Ribs & Steak': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Boma Basket': 'https://images.unsplash.com/photo-1556804332-2a8f4d9b7f7f?w=400&h=300&fit=crop',

  // CURRIES & BUNNIES
  'Lamb Bunny Chow': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'Beef Bunny Chow': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Butter Chicken Bunny Chow': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Lamb Durban Curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Beef Durban Curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Butter Chicken Durban Curry': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop',
  'Lamb Roti Roll': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Beef Roti Roll': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'Butter Chicken Roti Roll': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop',

  // HOT BEVERAGES
  'Rbos Cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
  'Vanilla Latte': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
  'Brown Butter Latte': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
  'Hazelnut Latte': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
  'Chai Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
  'Spicy Chai': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
  'Five Roses Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
  'Rooibos Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
  'Hot Chocolate': 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=300&fit=crop',
  'Americano': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop',
  'Espresso': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop',
  'Cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
  'Café Latte': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
  'Filter Coffee': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop',
  'Moccachino': 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=300&fit=crop',

  // FREEZOS
  'Coffee Freezo': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=300&fit=crop',
  'Spiced Chai Freezo': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
  'Decadent Chocolate Freezo': 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=300&fit=crop',
  'White Chocolate Freezo': 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=300&fit=crop',

  // MILKSHAKES
  'Chocolate Shake': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',
  'Strawberry Shake': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
  'Bubblegum Shake': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'Oreo Shake': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',

  // CLASSIC COCKTAILS
  'Classic Martini': 'https://images.unsplash.com/photo-1575023782549-62ca0d244b69?w=400&h=300&fit=crop',
  'Margarita': 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=400&h=300&fit=crop',
  'Caipirinha': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=300&fit=crop',
  'Mojito': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
  'Pina Colada': 'https://images.unsplash.com/photo-1515444749299-224754c8e78c?w=400&h=300&fit=crop',
  'Strawberry Daiquiri': 'https://images.unsplash.com/photo-1598880940080-ff9a29891b85?w=400&h=300&fit=crop',
  'Cosmopolitan': 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&h=300&fit=crop',
  'Long Island Iced Tea': 'https://images.unsplash.com/photo-1559954086-6b3e3a4a5412?w=400&h=300&fit=crop',
  'Sex on the beach': 'https://images.unsplash.com/photo-1545421267-1f13d8b5894c?w=400&h=300&fit=crop',
  'Rosemary Yuzu G&T': 'https://images.unsplash.com/photo-1583318432732-a19e0708d30c?w=400&h=300&fit=crop',
  'Cherry blossom ginger G&T': 'https://images.unsplash.com/photo-1470337458705-8b9b1b7c8d90?w=400&h=300&fit=crop',
  'Yuzu whiskey Sours': 'https://images.unsplash.com/photo-1515023782549-62ca0d244b69?w=400&h=300&fit=crop',
  'Brown butter Old Fashioned': 'https://images.unsplash.com/photo-1470337458705-8b9b1b7c8d90?w=400&h=300&fit=crop',

  // NON-ALCOHOLIC COCKTAILS
  'Berry Citrus Twist': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
  'Cosmo Crush': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'No-Jito': 'https://images.unsplash.com/photo-1543429258-c7b1b5c5cce4?w=400&h=300&fit=crop',
  'Virgin Pina Colada': 'https://images.unsplash.com/photo-1515444749299-224754c8e78c?w=400&h=300&fit=crop',
  'Virgin Strawberry Daiquiri': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
  'Cherry blossom martini': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',

  // BURGERS
  'Classic Beef Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Chicken Burger': 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop',
  'Boma Double Burger': 'https://images.unsplash.com/photo-1550547660-d9450f859043?w=400&h=300&fit=crop',
  'Veggie Burger': 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=300&fit=crop',

  // BURGER EXTRAS
  'Egg': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  'Bacon': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
  'Avo': 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=300&fit=crop',
  'Cheese': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop',

  // FRIES & EXTRAS
  'Chunky Chips': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
  'Sweet Potato': 'https://images.unsplash.com/photo-1529589510304-b7e994a92f60?w=400&h=300&fit=crop',
  'Onion Rings': 'https://images.unsplash.com/photo-1639024471287-9b3a0b5c9b4f?w=400&h=300&fit=crop',

  // PIZZA
  'Margherita': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
  'BBQ Chicken Pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'Meat Lovers Pizza': 'https://images.unsplash.com/photo-1595708680250-7f380d413703?w=400&h=300&fit=crop',
  'Vegetarian Pizza': 'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=400&h=300&fit=crop',

  // DESSERTS
  'Chocolate Brownie': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
  'Tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
  'Cheesecake': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',
  'Ice Cream Sundae': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',

  // KIDS CORNER
  'Kids Burger & Chips': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
  'Kids Chicken & Chips': 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop',
  'Pasta': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',

  // PLATTERS
  'Boma Platter': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop',
  'Meat Platter': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Seafood Platter': 'https://images.unsplash.com/photo-1553247407-23251b9c19e8?w=400&h=300&fit=crop',
  'Veggie Platter': 'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=400&h=300&fit=crop',

  // SOFT DRINKS
  'Coke': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'Fanta': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'Sprite': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',

  // JUICES
  'Orange Juice': 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=300&fit=crop',
  'Apple Juice': 'https://images.unsplash.com/photo-1576673442511-7e39b6545c87?w=400&h=300&fit=crop',

  // SMOOTHIES
  'Berry Blast': 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=300&fit=crop',
  'Tropical': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'Green Power': 'https://images.unsplash.com/photo-1610970881699-44a8ad1fcd8c?w=400&h=300&fit=crop',
};

// Level 2: Category fallback images - premium, consistent per category
const CATEGORY_FALLBACKS: Record<string, string> = {
  'Breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
  'Toasties': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Hungry... Ish': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Curries & Bunnies': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Flame-Grilled': 'https://images.unsplash.com/photo-1555041469-a586c61b9fe4?w=400&h=300&fit=crop',
  'Braai Platters': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop',
  'Hot Beverages': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
  'Cold Beverages': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'DRNK Freezos': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=300&fit=crop',
  'Milkshakes': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',
  'Classic Cocktails': 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=400&h=300&fit=crop',
  'Non-Alcoholic Cocktails': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
  'Burgers': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Burger Extras': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
  'Fries & Extras': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
  'Pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
  'Desserts': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
  'Kids Corner': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
  'Platters': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop',
  'Soft Drinks': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'Juices': 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=300&fit=crop',
  'Smoothies': 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=300&fit=crop',
  'Mocktails': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
};

// Level 3: Safe default fallback - premium generic food image
const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';

// Get menu item image with 3-level fallback strategy
export function getMenuItemImage(item: { name: string; category: string }): string {
  // Level 1: Try exact item match
  if (ITEM_IMAGES[item.name]) {
    return ITEM_IMAGES[item.name];
  }
  
  // Level 2: Try category fallback
  if (CATEGORY_FALLBACKS[item.category]) {
    return CATEGORY_FALLBACKS[item.category];
  }
  
  // Level 3: Safe default fallback
  return DEFAULT_FALLBACK;
}

// Export for direct use
export const menuImageConfig: MenuImageConfig = {
  categoryFallbacks: CATEGORY_FALLBACKS,
  itemImages: ITEM_IMAGES
};