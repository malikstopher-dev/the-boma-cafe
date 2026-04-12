'use client';

import { MenuItem, MenuAddOn, MenuSize } from '@/types';

export interface MenuItemWithSelection {
  item: MenuItem;
  selectedSize?: string;
  selectedAddOns: string[];
}

export function hasSizes(item: MenuItem): boolean {
  return (item.variants?.length ?? 0) > 0;
}

export function hasAddOns(item: MenuItem): boolean {
  return (item.addOns?.length ?? 0) > 0;
}

export function needsCustomization(item: MenuItem): boolean {
  return hasSizes(item) || hasAddOns(item);
}

export function getStartingPrice(item: MenuItem): number {
  if (item.variants && item.variants.length > 0) {
    return Math.min(...item.variants.map(v => v.price));
  }
  return item.price || 0;
}

export function formatStartingPrice(item: MenuItem): string {
  const price = getStartingPrice(item);
  if (hasSizes(item)) {
    return `From R${price}`;
  }
  return `R${price}`;
}

export function formatPrice(price: number): string {
  return `R${price}`;
}

export function getSizePrice(item: MenuItem, sizeName: string): number {
  const size = item.variants?.find(v => v.name === sizeName);
  return size?.price ?? item.price ?? 0;
}

export function calculateAddOnsTotal(item: MenuItem, selectedAddOns: string[]): number {
  if (!item.addOns) return 0;
  return selectedAddOns.reduce((total, addOnName) => {
    const addOn = item.addOns?.find(a => a.name === addOnName);
    return total + (addOn?.price ?? 0);
  }, 0);
}

export function calculateItemTotal(
  item: MenuItem,
  selectedSize?: string,
  selectedAddOns?: string[]
): number {
  let basePrice = item.price ?? 0;
  
  if (selectedSize && item.variants) {
    const size = item.variants.find(v => v.name === selectedSize);
    if (size) {
      basePrice = size.price;
    }
  }
  
  const addOnsTotal = calculateAddOnsTotal(item, selectedAddOns ?? []);
  
  return basePrice + addOnsTotal;
}

export function getDefaultSize(item: MenuItem): string | undefined {
  if (item.variants && item.variants.length > 0) {
    return item.variants[0].name;
  }
  return undefined;
}

export function formatTotalPrice(total: number): string {
  return `R${total}`;
}

export function buildItemNameWithOptions(
  item: MenuItem,
  selectedSize?: string,
  selectedAddOns?: string[]
): string {
  let name = item.name;
  const parts: string[] = [];
  
  if (selectedSize) {
    parts.push(selectedSize);
  }
  
  if (selectedAddOns && selectedAddOns.length > 0) {
    const addOnNames = selectedAddOns.join(', ');
    parts.push(`+ ${addOnNames}`);
  }
  
  if (parts.length > 0) {
    name += ` (${parts.join(', ')})`;
  }
  
  return name;
}
