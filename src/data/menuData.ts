'use client';

import { MenuItem, MenuCategory } from '@/types';

export interface MenuDataSection {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

export interface MenuData {
  categories: MenuCategory[];
  sections: MenuDataSection[];
}

export function buildMenuData(categories: MenuCategory[], items: MenuItem[]): MenuData {
  const activeCategories = categories
    .filter(c => c.isActive)
    .sort((a, b) => a.order - b.order);

  const sections: MenuDataSection[] = activeCategories.map(cat => {
    const categoryItems = items
      .filter(item => item.category === cat.name && !item.isOutOfStock)
      .sort((a, b) => a.order - b.order);

    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      items: categoryItems
    };
  }).filter(section => section.items.length > 0);

  return {
    categories: activeCategories,
    sections
  };
}

export function getItemsBySubcategory(items: MenuItem[], subcategory: string): MenuItem[] {
  return items.filter(item => item.subcategory === subcategory).sort((a, b) => a.order - b.order);
}

export function getUniqueSubcategories(items: MenuItem[]): string[] {
  const subs = new Set(items.map(item => item.subcategory).filter(Boolean) as string[]);
  return Array.from(subs);
}