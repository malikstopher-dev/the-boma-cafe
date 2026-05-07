'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cmsService } from '@/lib/client-cms';
import { getBarImage } from '@/lib/barImages';

interface DrinkItem {
  id: string;
  name: string;
  description?: string;
  price: string;
  category?: string;
  isFeatured?: boolean;
  image?: string;
}

const defaultDrinks: DrinkItem[] = [
  // Signature Cocktails
  { id: '1', name: 'Boma Sunset', description: 'Aged rum, passion fruit, lime, hint of chilli', price: '125', category: 'Signature Cocktails', isFeatured: true },
  { id: '2', name: 'Safari Sour', description: 'Amarula, honey, citrus, vanilla bean', price: '115', category: 'Signature Cocktails', isFeatured: true },
  { id: '3', name: 'Thatched Toddy', description: 'Spiced rum, warm spices, fresh ginger', price: '135', category: 'Signature Cocktails', isFeatured: false },
  { id: '4', name: 'Garden Spritz', description: 'Gin, elderflower, cucumber, prosecco', price: '110', category: 'Signature Cocktails', isFeatured: false },
  
  // Classic Cocktails
  { id: '5', name: 'Classic Mojito', description: 'White rum, fresh mint, lime, soda', price: '85', category: 'Classic Cocktails', isFeatured: true },
  { id: 'cc1', name: 'Classic Martini', description: 'Gin or vodka with dry vermouth', price: '79', category: 'Classic Cocktails' },
  { id: '6', name: 'Margarita', description: 'Tequila, triple sec, lime juice', price: '90', category: 'Classic Cocktails' },
  { id: '7', name: 'Whiskey Sour', description: 'Whiskey, lemon juice, sugar, egg white', price: '95', category: 'Classic Cocktails' },
  { id: '8', name: 'Old Fashioned', description: 'Bourbon, sugar, angostura bitters', price: '100', category: 'Classic Cocktails' },
  
  // Cocktails
  { id: 'ck1', name: 'Caipirinha', description: 'Cachaça, lime, sugar', price: '94', category: 'Cocktails' },
  { id: 'ck2', name: 'Mojito', description: 'White rum, fresh mint, lime, soda', price: '91', category: 'Cocktails' },
  { id: 'ck3', name: 'Pina Colada', description: 'White rum, coconut cream, pineapple', price: '96', category: 'Cocktails' },
  { id: 'ck4', name: 'Strawberry Daiquiri', description: 'White rum, strawberry, lime', price: '88', category: 'Cocktails' },
  { id: 'ck5', name: 'Cosmopolitan', description: 'Vodka, triple sec, cranberry, lime', price: '74', category: 'Cocktails' },
  { id: 'ck6', name: 'Long Island Iced Tea', description: 'Multiple spirits, cola', price: '110', category: 'Cocktails' },
  { id: 'ck7', name: 'Sex on the Beach', description: 'Vodka, peach schnapps, cranberry, orange', price: '66', category: 'Cocktails' },
  { id: 'ck8', name: 'Rosemary Yuzu G&T', description: 'Gin, rosemary, yuzu, tonic', price: '110', category: 'Cocktails' },
  { id: 'ck9', name: 'Cherry Blossom Ginger G&T', description: 'Gin, cherry, ginger, tonic', price: '104', category: 'Cocktails' },
  { id: 'ck10', name: 'Yuzu Whiskey Sours', description: 'Whiskey, yuzu, lemon', price: '103', category: 'Cocktails' },
  { id: 'ck11', name: 'Brown Butter Old Fashioned', description: 'Bourbon, brown butter syrup, bitters', price: '77', category: 'Cocktails' },
  
  // Non-Alcoholic Cocktails
  { id: 'na1', name: 'Berry Citrus Twist', description: 'Mixed berries, citrus', price: '55', category: 'Non-Alcoholic Cocktails' },
  { id: 'na2', name: 'Cosmo Crush', description: 'Cranberry, citrus', price: '55', category: 'Non-Alcoholic Cocktails' },
  { id: 'na3', name: 'No-Jito', description: 'Fresh mint, lime, soda water', price: '56', category: 'Non-Alcoholic Cocktails' },
  { id: 'na4', name: 'Virgin Pina Colada', description: 'Coconut, pineapple', price: '58', category: 'Non-Alcoholic Cocktails' },
  { id: 'na5', name: 'Virgin Strawberry Daiquiri', description: 'Strawberry, lime', price: '65', category: 'Non-Alcoholic Cocktails' },
  { id: 'na6', name: 'Cherry Blossom Martini', description: 'Cherry, vanilla', price: '52', category: 'Non-Alcoholic Cocktails' },
  { id: '9', name: 'Virgin Mojito', description: 'Fresh mint, lime, soda water', price: '55', category: 'Non-Alcoholic Cocktails' },
  { id: '10', name: 'Shirley Temple', description: 'Ginger ale, grenadine, fresh lime', price: '50', category: 'Non-Alcoholic Cocktails' },
  
  // Freezos
  { id: 'fz1', name: 'Coffee Freezo', description: 'Frozen coffee with milk', price: '45', category: 'Freezos' },
  { id: 'fz2', name: 'Spiced Chai Freezo', description: 'Spiced chai frozen drink', price: '45', category: 'Freezos' },
  { id: 'fz3', name: 'Decadent Chocolate Freezo', description: 'Rich chocolate frozen drink', price: '40', category: 'Freezos' },
  { id: 'fz4', name: 'White Chocolate Freezo', description: 'Creamy white chocolate frozen drink', price: '45', category: 'Freezos' },
  { id: '11', name: 'Mango Freezo', description: 'Frozen mango, ice, vanilla', price: '65', category: 'Freezos' },
  { id: '12', name: 'Chocolate Freezo', description: 'Chocolate, ice, milk', price: '65', category: 'Freezos' },
  
  // Milkshakes
  { id: 'ms1', name: 'Chocolate Shake', description: 'Rich chocolate shake', price: '46', category: 'Milkshakes' },
  { id: 'ms2', name: 'Strawberry Shake', description: 'Fresh strawberry shake', price: '51', category: 'Milkshakes' },
  { id: 'ms3', name: 'Bubblegum Shake', description: 'Bubblegum flavoured shake', price: '46', category: 'Milkshakes' },
  { id: 'ms4', name: 'Oreo Shake', description: 'Oreo cookie shake', price: '46', category: 'Milkshakes' },
  { id: '13', name: 'Strawberry Milkshake', description: 'Fresh strawberries, vanilla ice cream', price: '75', category: 'Milkshakes' },
  { id: '14', name: 'Chocolate Milkshake', description: 'Rich chocolate, ice cream', price: '75', category: 'Milkshakes' },
  
  // Special Board
  { id: 'sb1', name: 'Richelieu + Mixer', price: 'Ask server', category: 'Special Board' },
  { id: 'sb2', name: 'Klipdrift + Mixer', price: 'Ask server', category: 'Special Board' },
  { id: 'sb3', name: 'KWV 3yr + Mixer', price: 'Ask server', category: 'Special Board' },
  { id: 'sb4', name: 'Captain Morgan + Mixer', price: 'Ask server', category: 'Special Board' },
  
  // Beers
  { id: 'beer1', name: 'Corona Extra', price: 'Ask server', category: 'Beers' },
  { id: 'beer2', name: 'Heineken', price: 'Ask server', category: 'Beers' },
  { id: 'beer2b', name: 'Heineken 0.0', price: 'Ask server', category: 'Beers' },
  { id: 'beer3', name: 'Amstel Lager', price: 'Ask server', category: 'Beers' },
  { id: 'beer4', name: 'Castle Lager', price: 'Ask server', category: 'Beers' },
  { id: 'beer5', name: 'Castle Milk Stout', price: 'Ask server', category: 'Beers' },
  { id: 'beer6', name: 'Windhoek Lager', price: 'Ask server', category: 'Beers' },
  { id: 'beer7', name: 'Hansa Pilsener', price: 'Ask server', category: 'Beers' },
  { id: 'beer8', name: 'Black Label', price: 'Ask server', category: 'Beers' },
  { id: 'beer9', name: 'Guinness Draught', price: 'Ask server', category: 'Beers' },
  { id: 'beer10', name: 'Miller Genuine Draft', price: 'Ask server', category: 'Beers' },
  { id: 'beer11', name: 'Strongbow', price: 'Ask server', category: 'Beers' },
  
  // Ciders & Coolers
  { id: 'cider1', name: 'Bernini Classic', price: 'Ask server', category: 'Ciders & Coolers' },
  { id: 'cider2', name: 'Bernini Blush', price: 'Ask server', category: 'Ciders & Coolers' },
  { id: 'cider3', name: 'Brutal Fruit Spritzer', price: 'Ask server', category: 'Ciders & Coolers' },
  { id: 'cider4', name: 'Bacardi Breezer Blackberry', price: 'Ask server', category: 'Ciders & Coolers' },
  { id: 'cider5', name: 'Bacardi Breezer Blueberry', price: 'Ask server', category: 'Ciders & Coolers' },
  { id: 'cider6', name: 'Savanna Dry', price: 'Ask server', category: 'Ciders & Coolers' },
  { id: 'cider6b', name: 'Savanna Light', price: 'Ask server', category: 'Ciders & Coolers' },
  { id: 'cider6c', name: 'Savanna', price: 'Ask server', category: 'Ciders & Coolers' },
  { id: 'cider7', name: 'Hunters Gold', price: 'Ask server', category: 'Ciders & Coolers' },
  
  // Gin & Ready-To-Drink
  { id: 'gin1', name: 'Belgravia Gin & Pink Tonic', price: 'Ask server', category: 'Gin & Ready-To-Drink' },
  { id: 'gin2', name: 'Belgravia Gin & Dark Cherry', price: 'Ask server', category: 'Gin & Ready-To-Drink' },
  { id: 'gin3', name: 'Belgravia Gin & Tonic', price: 'Ask server', category: 'Gin & Ready-To-Drink' },
  { id: 'gin4', name: 'Belgravia Gin & Passion', price: 'Ask server', category: 'Gin & Ready-To-Drink' },
  { id: 'gin5', name: "Gordon's Gin", price: 'Ask server', category: 'Gin & Ready-To-Drink' },
  { id: 'gin6', name: 'Beefeater London Pink Strawberry Gin', price: 'Ask server', category: 'Gin & Ready-To-Drink' },
  { id: 'gin7', name: 'Beefeater London Dry Gin', price: 'Ask server', category: 'Gin & Ready-To-Drink' },
  
  // Spirits
  { id: 'spirit1', name: "Jack Daniel's Tennessee Whiskey", price: 'Ask server', category: 'Spirits' },
  { id: 'spirit2', name: 'J&B Whisky', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit3', name: 'Klipdrift', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit4', name: 'Richelieu', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit5', name: 'KWV 3 Year', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit6', name: 'KWV 5 Year', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit7', name: 'KWV 10', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit8', name: 'Bacardi Carta Blanca', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit9', name: 'Captain Morgan', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit10', name: 'Skyy Vodka', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit11', name: 'Smirnoff', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit12', name: 'Amarula', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit13', name: 'Kahlúa Coffee Liqueur', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit14', name: 'Aperol', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit15', name: 'Malibu', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit16', name: 'Monate', price: 'Ask server', category: 'Spirits' },
  { id: 'spirit17', name: 'Tipo Tinto Spiced', price: 'Ask server', category: 'Spirits' },
  
  // Wines
  { id: 'wine1', name: 'Spier', price: 'Ask server', category: 'Wines' },
  { id: 'wine2', name: 'Alto Rouge', price: 'Ask server', category: 'Wines' },
  { id: 'wine3', name: 'Guardian Peak', price: 'Ask server', category: 'Wines' },
  { id: 'wine4', name: 'VRL / Van Loveren', price: 'Ask server', category: 'Wines' },
  { id: 'wine5', name: 'Merlot', price: 'Ask server', category: 'Wines' },
  { id: 'wine6', name: 'Pinotage', price: 'Ask server', category: 'Wines' },
  { id: 'wine7', name: 'Sauvignon Blanc', price: 'Ask server', category: 'Wines' },
  { id: 'wine8', name: 'Chenin Blanc', price: 'Ask server', category: 'Wines' },
  { id: 'wine9', name: 'Chardonnay', price: 'Ask server', category: 'Wines' },
  { id: 'wine10', name: 'Rosé', price: 'Ask server', category: 'Wines' },
  { id: 'wine11', name: 'Nederburg', price: 'Ask server', category: 'Wines' },
  { id: 'wine12', name: 'The Beach House', price: 'Ask server', category: 'Wines' },
  { id: 'wine13', name: 'Optima', price: 'Ask server', category: 'Wines' },
  { id: 'wine14', name: 'PepperWind Syrah', price: 'Ask server', category: 'Wines' },
  
  // Sparkling & MCC
  { id: 'spark1', name: 'Krone', price: 'Ask server', category: 'Sparkling & MCC' },
  { id: 'spark2', name: 'Moët & Chandon', price: 'Ask server', category: 'Sparkling & MCC' },
  { id: 'spark3', name: 'Graham Beck', price: 'Ask server', category: 'Sparkling & MCC' },
  { id: 'spark4', name: 'Sparkling Rosé', price: 'Ask server', category: 'Sparkling & MCC' },
  { id: 'spark5', name: 'Assorted MCC / Sparkling Wine', price: 'Ask server', category: 'Sparkling & MCC' },
  
  // Soft Drinks & Mixers
  { id: 'soft1', name: 'Sprite', price: 'Ask server', category: 'Soft Drinks & Mixers' },
  { id: 'soft2', name: 'Sparletta Creme Soda', price: 'Ask server', category: 'Soft Drinks & Mixers' },
  { id: 'soft3', name: 'Schweppes / Mixers', price: 'Ask server', category: 'Soft Drinks & Mixers' },
  { id: 'soft4', name: 'Valpré Water', price: 'Ask server', category: 'Soft Drinks & Mixers' },
  { id: 'soft5', name: 'Still Water', price: 'Ask server', category: 'Soft Drinks & Mixers' },
  { id: 'soft6', name: 'Liqui Fruit', price: 'Ask server', category: 'Soft Drinks & Mixers' },
  { id: 'soft7', name: 'Tropika', price: 'Ask server', category: 'Soft Drinks & Mixers' },
  { id: 'soft8', name: 'Appletiser', price: 'Ask server', category: 'Soft Drinks & Mixers' },
  { id: 'soft9', name: 'Red Bull', price: 'Ask server', category: 'Soft Drinks & Mixers' },
  { id: 'soft10', name: 'Juice Dispensers / House Juice', price: 'Ask server', category: 'Soft Drinks & Mixers' },
];

const categoryOrder = [
  'Signature Cocktails',
  'Classic Cocktails',
  'Cocktails',
  'Non-Alcoholic Cocktails',
  'Freezos',
  'Milkshakes',
  'Beers',
  'Ciders & Coolers',
  'Gin & Ready-To-Drink',
  'Spirits',
  'Wines',
  'Sparkling & MCC',
  'Soft Drinks & Mixers',
  'Special Board'
];

const categoryPlaceholders: Record<string, { gradient: string; text: string }> = {
  'Signature Cocktails': { gradient: 'linear-gradient(135deg, #C26A2D 0%, #8B4513 100%)', text: 'Signature' },
  'Classic Cocktails': { gradient: 'linear-gradient(135deg, #AED581 0%, #558B2F 100%)', text: 'Classic' },
  'Cocktails': { gradient: 'linear-gradient(135deg, #CE93D8 0%, #6A1B9A 100%)', text: 'Cocktail' },
  'Non-Alcoholic Cocktails': { gradient: 'linear-gradient(135deg, #80DEEA 0%, #00838F 100%)', text: 'Mocktail' },
  'Freezos': { gradient: 'linear-gradient(135deg, #90CAF9 0%, #1565C0 100%)', text: 'Freezo' },
  'Milkshakes': { gradient: 'linear-gradient(135deg, #F48FB1 0%, #AD1457 100%)', text: 'Milkshake' },
  'Special Board': { gradient: 'linear-gradient(135deg, #FFD54F 0%, #FF6F00 100%)', text: 'Special' },
  'Beers': { gradient: 'linear-gradient(135deg, #FFB74D 0%, #E65100 100%)', text: 'Beer' },
  'Ciders & Coolers': { gradient: 'linear-gradient(135deg, #A5D6A7 0%, #2E7D32 100%)', text: 'Cider' },
  'Gin & Ready-To-Drink': { gradient: 'linear-gradient(135deg, #B39DDB 0%, #512DA8 100%)', text: 'Gin' },
  'Spirits': { gradient: 'linear-gradient(135deg, #BCAAA4 0%, #5D4037 100%)', text: 'Spirit' },
  'Wines': { gradient: 'linear-gradient(135deg, #880E4F 0%, #4A148C 100%)', text: 'Wine' },
  'Sparkling & MCC': { gradient: 'linear-gradient(135deg, #FFF9C4 0%, #F57F17 100%)', text: 'Sparkling' },
  'Soft Drinks & Mixers': { gradient: 'linear-gradient(135deg, #4FC3F7 0%, #0277BD 100%)', text: 'Soft Drink' },
};

const usedImagesPerCategory: Record<string, Set<string>> = {};

function DrinkCard({ drink, categoryUsedImages, cardIndex }: { drink: DrinkItem; categoryUsedImages?: Record<string, Set<string>>; cardIndex: number }) {
  const drinkImage = drink.image;
  const barImage = getBarImage(drink.name, drink.category || '', drink.image);
  const category = drink.category || 'Other';
  const placeholder = categoryPlaceholders[category] || { gradient: 'linear-gradient(135deg, #E6D3B3 0%, #8D6E63 100%)', text: 'Drink' };
  
  const hasInternetImage = drinkImage && typeof drinkImage === 'string' && drinkImage.startsWith('http');
  const hasLocalImage = barImage && typeof barImage === 'string' && barImage.startsWith('/');
  const rawImageUrl = hasInternetImage ? drinkImage : (hasLocalImage ? barImage : null);

  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'transform 0.2s, box-shadow 0.2s'
    }}>
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        aspectRatio: '16/10',
        overflow: 'hidden'
      }}>
        {!rawImageUrl ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: placeholder.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{
              fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontFamily: 'var(--font-display)',
            }}>
              {placeholder.text}
            </span>
          </div>
        ) : (
          <Image
            src={rawImageUrl!}
            alt={drink.name}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
          />
        )}
      </div>
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--dark-brown)', fontWeight: 600, margin: 0 }}>
            {drink.name}
          </h3>
          <span style={{ 
            fontSize: '1rem', 
            fontWeight: 700, 
            color: 'var(--primary)' 
          }}>
            {drink.price === 'Ask server' ? 'Ask server' : `R${drink.price}`}
          </span>
        </div>
        {drink.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
            {drink.description}
          </p>
        )}
        {drink.isFeatured && (
          <span style={{
            display: 'inline-block',
            background: 'var(--gold)',
            color: 'var(--dark-brown)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            ★ Featured
          </span>
        )}
      </div>
    </div>
  );
}

export default function BarMenuClient() {
  const [settings, setSettings] = useState<any>(null);
  const [drinks, setDrinks] = useState<DrinkItem[]>(defaultDrinks);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allSettings = await cmsService.getAllSettings();
        setSettings(allSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const groupedDrinks = categoryOrder.reduce((acc, cat) => {
    const items = drinks.filter(d => d.category === cat);
    if (items.length > 0) {
      acc[cat] = items;
    }
    return acc;
  }, {} as Record<string, DrinkItem[]>);

  const categoryUsedImages: Record<string, Set<string>> = {};
  for (const category of Object.keys(groupedDrinks)) {
    categoryUsedImages[category] = new Set();
    for (const drink of groupedDrinks[category]) {
      const rawImg = getBarImage(drink.name, drink.category || '', drink.image);
      const img = rawImg && rawImg.trim() !== '' ? rawImg : null;
      if (img && typeof img === 'string') {
        categoryUsedImages[category]!.add(img);
      }
    }
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <main style={{ paddingTop: '80px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🍹</div>
            <p style={{ color: 'var(--text-light)' }}>Loading bar menu...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={{ paddingTop: 0 }}>
        {/* Hero Section */}
        <div style={{ paddingTop: 80 }}>
        <section style={{
          background: 'url(/cocktails-and-drinks/2026-02-11-1.webp) center/cover no-repeat',
          padding: '4rem 5%',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-block',
              background: 'var(--warm)',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1rem',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Bar Menu
            </div>
            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              color: 'var(--white)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700
            }}>
              Cocktails & Drinks
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              color: 'var(--cream)',
              maxWidth: '550px',
              margin: '0 auto 2rem',
              lineHeight: 1.7
            }}>
              Signature cocktails, classic favourites, and refreshing drinks at The Boma Café
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/contact" className="btn btn-primary" style={{ padding: '0.875rem 2rem' }}>
                Contact Us
              </a>
              <a 
                href="https://wa.me/27729961190" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  padding: '0.875rem 2rem',
                  background: '#25D366',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                WhatsApp Booking
              </a>
            </div>
          </div>
        </section>
        </div>

        {/* Drinks Sections */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container">
            {Object.entries(groupedDrinks).map(([category, items]) => (
              <div key={category} style={{ marginBottom: '3rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ 
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
                    color: 'var(--dark-brown)',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--font-display)'
                  }}>
                    {category}
                  </h2>
                </div>
                <div className="barMenuGrid" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1rem',
                  maxWidth: '1000px',
                  margin: '0 auto'
                }}>
                  {items.map((drink, idx) => (
                    <div key={drink.id} className="barMenuCard">
                    <DrinkCard drink={drink} categoryUsedImages={categoryUsedImages} cardIndex={idx} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ 
          background: 'linear-gradient(135deg, var(--beige) 0%, var(--beige-light) 100%)', 
          padding: '4rem 5%', 
          textAlign: 'center' 
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
              color: 'var(--brown-heading)',
              marginBottom: '1rem' 
            }}>
              Ready for a Drink?
            </h2>
            <p style={{ color: 'var(--brown-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
              Join us for handcrafted cocktails and refreshing beverages in our rustic outdoor setting.
            </p>
            <a href="/contact" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>
              Book a Table
            </a>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}