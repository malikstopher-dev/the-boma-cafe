'use client';

import { MenuItem, MenuCategory, MenuAddOn, MenuChoice, MenuSize } from '@/types';

export interface MenuSection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export const MENU_SECTIONS: MenuSection[] = [
  { id: 'food', name: 'Food', icon: '🍽️' },
  { id: 'drinks', name: 'Drinks', icon: '🍹' },
  { id: 'pizza', name: 'Wood-Fired Pizza', icon: '🍕' },
];

export const MENU_CATEGORIES: Record<string, MenuCategory[]> = {
  food: [
    { id: '1', name: 'Breakfast', description: 'Start your day right', order: 1, isActive: true },
    { id: '2', name: 'Toasties', description: 'Grilled to perfection', order: 2, isActive: true },
    { id: '3', name: 'Hungry... Ish', description: 'Filling meals & sharing plates', order: 3, isActive: true },
    { id: '4', name: 'Curries & Bunnies', description: 'Durban-inspired flavors', order: 4, isActive: true },
    { id: '10', name: 'Burgers', description: 'Handcrafted burgers', order: 10, isActive: true },
    { id: '11', name: 'Burger Extras', description: 'Add to your burger', order: 11, isActive: true },
    { id: '12', name: 'Fries & Extras', description: 'Sides & accompaniments', order: 12, isActive: true },
    { id: '14', name: 'Desserts', description: 'Sweet endings', order: 14, isActive: true },
  ],
  drinks: [
    { id: '5', name: 'Hot Beverages', description: 'Coffee & tea selection', order: 5, isActive: true },
    { id: '6', name: 'DRNK Freezos', description: 'Blended frozen drinks', order: 6, isActive: true },
    { id: '7', name: 'Milkshakes', description: 'Classic thick shakes', order: 7, isActive: true },
    { id: '8', name: 'Classic Cocktails', description: 'Signature cocktails', order: 8, isActive: true },
    { id: '9', name: 'Non-Alcoholic Cocktails', description: 'Mocktails & virgin drinks', order: 9, isActive: true },
  ],
  pizza: [
    { id: '13', name: 'Pizza', description: 'Wood-fired perfection', order: 13, isActive: true },
  ],
};

export const COMMON_ADDONS: Record<string, MenuAddOn[]> = {
  cheese: [
    { name: 'Extra Cheese', price: 12 },
    { name: 'Mozzarella', price: 15 },
    { name: 'Cheddar', price: 12 },
  ],
  meat: [
    { name: 'Extra Bacon', price: 25 },
    { name: 'Extra Chicken', price: 22 },
    { name: 'Extra Beef', price: 20 },
  ],
  sides: [
    { name: 'Extra Chips', price: 25 },
    { name: 'Side Salad', price: 30 },
    { name: 'Onion Rings', price: 28 },
  ],
  sauces: [
    { name: 'Extra Sauce', price: 5 },
    { name: 'Chili Sauce', price: 5 },
    { name: 'Garlic Sauce', price: 5 },
    { name: 'Mayo', price: 5 },
    { name: 'BBQ Sauce', price: 5 },
    { name: 'Peri-Peri', price: 5 },
  ],
  extras: [
    { name: 'Double Shot', price: 25 },
    { name: 'Add Ice', price: 0 },
    { name: 'Add Lemon', price: 0 },
    { name: 'Add Mint', price: 0 },
  ],
};

export const PIZZA_SIZES: MenuSize[] = [
  { name: 'Small', price: 0 },
  { name: 'Medium', price: 30 },
  { name: 'Large', price: 70 },
];

export const DRINK_SIZES: Record<string, MenuSize[]> = {
  small: [
    { name: '300ml', price: 0 },
  ],
  medium: [
    { name: '400ml', price: 10 },
  ],
  large: [
    { name: '500ml', price: 20 },
  ],
  glass: [
    { name: 'Glass', price: 0 },
  ],
  pitcher: [
    { name: 'Pitcher', price: 80 },
  ],
};

export const getCategoriesBySection = (sectionId: string): MenuCategory[] => {
  return MENU_CATEGORIES[sectionId] || [];
};

export const getAllCategories = (): MenuCategory[] => {
  return Object.values(MENU_CATEGORIES).flat();
};

export const getCategoryByName = (name: string): MenuCategory | undefined => {
  return getAllCategories().find(c => c.name === name);
};

export const filterItemsByCategory = (items: MenuItem[], categoryName: string): MenuItem[] => {
  return items.filter(item => item.category === categoryName && !item.isOutOfStock);
};

export const filterItemsByTag = (items: MenuItem[], tag: string): MenuItem[] => {
  return items.filter(item => item.tags?.includes(tag));
};

export const getFeaturedItems = (items: MenuItem[], limit: number = 6): MenuItem[] => {
  return items.filter(item => item.isFeatured).slice(0, limit);
};

export const sortByOrder = <T extends { order: number }>(items: T[]): T[] => {
  return [...items].sort((a, b) => a.order - b.order);
};

export const groupBySubcategory = (items: MenuItem[]): Record<string, MenuItem[]> => {
  return items.reduce((acc, item) => {
    const sub = item.subcategory || 'Other';
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);
};

export const formatPrice = (price: number): string => {
  return `R${price}`;
};

export const formatPriceWithSize = (basePrice: number, size: string, sizePrice: number = 0): string => {
  const total = basePrice + sizePrice;
  return size === 'Small' ? `R${basePrice}` : `R${total}`;
};