import { MenuItem } from '@/types';

export interface UpsellRule {
  category: string;
  suggestedItems: string[];
  title: string;
  subtitle: string;
}

export const upsellRules: UpsellRule[] = [
  {
    category: 'Burgers',
    suggestedItems: ['Chips', 'Onion Rings', 'Milkshake', 'Coleslaw'],
    title: 'Complete Your Meal',
    subtitle: 'Add a side or drink to your burger'
  },
  {
    category: 'Flame-Grilled',
    suggestedItems: ['Chips', 'Salad', 'Garlic Bread', 'Cola'],
    title: 'Sides & Drinks',
    subtitle: 'Perfect companions for your flame-grilled selection'
  },
  {
    category: 'Curries & Bunnies',
    suggestedItems: ['Roti', 'Poppadoms', 'Mango Chutney', 'Lassi'],
    title: 'Complete Your Curry',
    subtitle: 'Traditional accompaniments to enhance your meal'
  },
  {
    category: 'Pizza',
    suggestedItems: ['Garlic Bread', 'Chicken Wings', 'Cola', 'Lasagna'],
    title: 'Perfect Pairings',
    subtitle: 'Starters and drinks to share'
  },
  {
    category: 'Breakfast',
    suggestedItems: ['Coffee', 'Fresh Juice', 'Muffin', 'Fruit Bowl'],
    title: 'Morning Boost',
    subtitle: 'Beverages and light bites to start your day'
  },
  {
    category: 'Pasta',
    suggestedItems: ['Garlic Bread', 'Caesar Salad', 'Tiramisu', 'Cola'],
    title: 'Italian Feast',
    subtitle: 'Complete your pasta experience'
  },
  {
    category: 'Salads',
    suggestedItems: ['Grilled Chicken', 'Soup of the Day', 'Bread Basket', 'Sparkling Water'],
    title: 'Light Bites',
    subtitle: 'Add protein or a starter'
  },
  {
    category: 'Kids Corner',
    suggestedItems: ['Juice Box', 'Ice Cream', 'Chips', 'Apple Juice'],
    title: 'Happy Meal Extras',
    subtitle: 'Treats for little ones'
  },
  {
    category: 'Platters',
    suggestedItems: ['Dips', 'Bread Basket', 'Sparkling Water', 'House Wine'],
    title: 'Share the Feast',
    subtitle: 'Extra sides and drinks for sharing'
  },
  {
    category: 'Braai Platters',
    suggestedItems: ['Pap & Gravy', 'Atchar', 'Cola', 'Red Wine'],
    title: 'Braai Accompaniments',
    subtitle: 'Traditional sides for your braai'
  },
  {
    category: 'Cocktails',
    suggestedItems: ['Tapas', 'Chips & Dip', 'Ice Cream', 'Coffee'],
    title: 'Perfect sippers',
    subtitle: 'Light bites to enjoy with your cocktail'
  },
  {
    category: 'Cold Beverages',
    suggestedItems: ['Muffin', 'Sandwich', 'Fruit Bowl'],
    title: 'Quick Bites',
    subtitle: 'Pair your drink with something tasty'
  },
  {
    category: 'Hot Beverages',
    suggestedItems: ['Cake', 'Muffin', 'Scone'],
    title: 'Sweet Treats',
    subtitle: 'Afternoon tea companions'
  },
  {
    category: 'Desserts',
    suggestedItems: ['Coffee', 'Liqueur', 'Fresh Fruit'],
    title: 'Finishing Touch',
    subtitle: 'Coffee or a digestif to end perfectly'
  },
  {
    category: 'Wood-Fired Pizza',
    suggestedItems: ['Garlic Bread', 'Chicken Wings', 'Cola', 'House Wine'],
    title: 'Pizza Plus',
    subtitle: 'Starters and drinks to share'
  }
];

export function getUpsellRule(category: string): UpsellRule | undefined {
  return upsellRules.find(rule => 
    category.toLowerCase() === rule.category.toLowerCase() ||
    category.toLowerCase().includes(rule.category.toLowerCase())
  );
}

export function getSuggestedItems(
  category: string,
  allMenuItems: MenuItem[]
): MenuItem[] {
  const rule = getUpsellRule(category);
  if (!rule) return [];
  
  return allMenuItems.filter(item => 
    rule.suggestedItems.some(suggested => 
      item.name.toLowerCase().includes(suggested.toLowerCase()) ||
      item.category.toLowerCase().includes(suggested.toLowerCase())
    ) && !item.isOutOfStock
  ).slice(0, 4);
}
