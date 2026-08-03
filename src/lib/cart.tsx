'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { OrderType } from '@/lib/pos/types';

interface CartItem {
  id: string;
  menuItemId?: string;
  barItemId?: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  selectedSize?: string;
  selectedAddOns?: string[];
  spiceLevel?: string;
  basting?: string;
  starch?: string;
  dietaryFlags?: string[];
  notes?: string;
  station?: 'kitchen' | 'bar';
  availableForPickup?: boolean;
  isAlcohol?: boolean;
}

interface CartContextType {
  items: CartItem[];
  isCartOpen: boolean;
  orderType: OrderType;
  openCart: () => void;
  closeCart: () => void;
  setOrderType: (type: OrderType) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('pickup');

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  useEffect(() => {
    const stored = localStorage.getItem('boma_cart');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setItems(parsed);
      } catch (e) {}
    }
    const storedType = localStorage.getItem('boma_order_type');
    if (storedType === 'pickup' || storedType === 'delivery' || storedType === 'dine-in') {
      setOrderType(storedType);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('boma_cart', JSON.stringify(items));
    } catch { /* storage full or unavailable — persistence loss is non-critical */ }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('boma_order_type', orderType);
    } catch {}
  }, [orderType]);

  const addItem = (item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, isCartOpen, orderType, openCart, closeCart, setOrderType, addItem, removeItem, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
