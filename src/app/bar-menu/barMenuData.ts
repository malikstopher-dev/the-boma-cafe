export interface BarItem {
  id: string;
  name: string;
  bottle?: number;
  single?: number;
  glass?: number;
  shot?: number;
  price?: string;
}

export interface BarCategory {
  id: string;
  name: string;
  items: BarItem[];
}

export const barCategories: BarCategory[] = [
  {
    id: 'signature-cocktails',
    name: 'Signature Cocktails',
    items: [
      { id: 'sc1', name: 'Boma Sunset', single: 125 },
      { id: 'sc2', name: 'Safari Sour', single: 115 },
      { id: 'sc3', name: 'Thatched Toddy', single: 135 },
      { id: 'sc4', name: 'Garden Spritz', single: 110 },
    ],
  },
  {
    id: 'classic-cocktails',
    name: 'Classic Cocktails',
    items: [
      { id: 'cc1', name: 'Classic Mojito', single: 85 },
      { id: 'cc2', name: 'Classic Martini', single: 79 },
      { id: 'cc3', name: 'Margarita', single: 90 },
      { id: 'cc4', name: 'Whiskey Sour', single: 95 },
      { id: 'cc5', name: 'Old Fashioned', single: 100 },
    ],
  },
  {
    id: 'cocktails',
    name: 'Cocktails',
    items: [
      { id: 'ck1', name: 'Caipirinha', single: 94 },
      { id: 'ck2', name: 'Mojito', single: 91 },
      { id: 'ck3', name: 'Pina Colada', single: 96 },
      { id: 'ck4', name: 'Strawberry Daiquiri', single: 88 },
      { id: 'ck5', name: 'Cosmopolitan', single: 74 },
      { id: 'ck6', name: 'Long Island Iced Tea', single: 110 },
      { id: 'ck7', name: 'Sex on the Beach', single: 66 },
      { id: 'ck8', name: 'Rosemary Yuzu G&T', single: 110 },
      { id: 'ck9', name: 'Cherry Blossom Ginger G&T', single: 104 },
      { id: 'ck10', name: 'Yuzu Whiskey Sours', single: 103 },
      { id: 'ck11', name: 'Brown Butter Old Fashioned', single: 77 },
    ],
  },
  {
    id: 'non-alcoholic',
    name: 'Non-Alcoholic Cocktails',
    items: [
      { id: 'na1', name: 'Berry Citrus Twist', single: 55 },
      { id: 'na2', name: 'Cosmo Crush', single: 55 },
      { id: 'na3', name: 'No-Jito', single: 56 },
      { id: 'na4', name: 'Virgin Pina Colada', single: 58 },
      { id: 'na5', name: 'Virgin Strawberry Daiquiri', single: 65 },
      { id: 'na6', name: 'Cherry Blossom Martini', single: 52 },
      { id: 'na7', name: 'Virgin Mojito', single: 55 },
      { id: 'na8', name: 'Shirley Temple', single: 50 },
    ],
  },
  {
    id: 'freezos',
    name: 'Freezos',
    items: [
      { id: 'fz1', name: 'Coffee Freezo', single: 45 },
      { id: 'fz2', name: 'Spiced Chai Freezo', single: 45 },
      { id: 'fz3', name: 'Decadent Chocolate Freezo', single: 40 },
      { id: 'fz4', name: 'White Chocolate Freezo', single: 45 },
      { id: 'fz5', name: 'Mango Freezo', single: 65 },
      { id: 'fz6', name: 'Chocolate Freezo', single: 65 },
    ],
  },
  {
    id: 'milkshakes',
    name: 'Milkshakes',
    items: [
      { id: 'ms1', name: 'Chocolate Shake', single: 46 },
      { id: 'ms2', name: 'Strawberry Shake', single: 51 },
      { id: 'ms3', name: 'Bubblegum Shake', single: 46 },
      { id: 'ms4', name: 'Oreo Shake', single: 46 },
      { id: 'ms5', name: 'Strawberry Milkshake', single: 75 },
      { id: 'ms6', name: 'Chocolate Milkshake', single: 75 },
    ],
  },
  {
    id: 'whisky',
    name: 'Whisky',
    items: [
      { id: 'w1', name: 'Jameson', bottle: 750, single: 45 },
      { id: 'w2', name: 'Jameson Select', bottle: 1275, single: 45 },
      { id: 'w3', name: 'Monkey Shoulder', bottle: 950, single: 45 },
      { id: 'w4', name: 'Bells', single: 25 },
      { id: 'w5', name: 'Johnnie Walker Black', bottle: 1250, single: 40 },
      { id: 'w6', name: 'Jack Daniels', bottle: 1000, single: 40 },
      { id: 'w7', name: 'J&B Whisky', bottle: 800, single: 30 },
      { id: 'w8', name: 'Singleton 12 Years', bottle: 950, single: 55 },
    ],
  },
  {
    id: 'brandy',
    name: 'Brandy',
    items: [
      { id: 'b1', name: 'Klipdrift', bottle: 475, single: 30 },
      { id: 'b2', name: 'Richelieu', bottle: 500, single: 30 },
      { id: 'b3', name: 'KWV 10 Years', bottle: 550, single: 40 },
      { id: 'b4', name: 'KWV 3 Years', bottle: 500, single: 40 },
      { id: 'b5', name: 'KWV 5 Years', bottle: 500, single: 45 },
      { id: 'b6', name: 'Klipdrift Premium', bottle: 700, single: 45 },
      { id: 'b7', name: 'Hennessy VS', bottle: 1250, single: 50 },
      { id: 'b8', name: 'Hennessy VSOP', bottle: 2300, single: 70 },
    ],
  },
  {
    id: 'vodka',
    name: 'Vodka',
    items: [
      { id: 'v1', name: 'Smirnoff 1818', bottle: 650, single: 35 },
      { id: 'v2', name: 'Skyy Vodka', bottle: 900, single: 35 },
      { id: 'v3', name: 'Absolut Vodka', bottle: 800, single: 30 },
    ],
  },
  {
    id: 'gin',
    name: 'Gin',
    items: [
      { id: 'g1', name: 'Gordons Gin', bottle: 950, single: 30 },
      { id: 'g2', name: 'Bombay', single: 40 },
      { id: 'g3', name: 'Finery Gin', single: 40 },
      { id: 'g4', name: 'Inverroche Amber', single: 40 },
      { id: 'g5', name: 'Beefeater Orange', bottle: 750, single: 35 },
      { id: 'g6', name: 'Beefeater Original', bottle: 750, single: 35 },
      { id: 'g7', name: 'Beefeater Strawberry', bottle: 750, single: 35 },
    ],
  },
  {
    id: 'rum',
    name: 'Rum',
    items: [
      { id: 'r1', name: 'Captain Morgan Black', bottle: 600, single: 35 },
      { id: 'r2', name: 'Captain Morgan Spiced Gold', single: 35 },
      { id: 'r3', name: 'Red Heart', bottle: 480, single: 25 },
    ],
  },
  {
    id: 'shots',
    name: 'Shots',
    items: [
      { id: 's1', name: 'Jägermeister (750ml)', bottle: 950, shot: 40 },
      { id: 's2', name: 'Jägermeister (1L)', bottle: 1500 },
      { id: 's3', name: 'Olmeca Gold', bottle: 875, shot: 40 },
      { id: 's4', name: 'Olmeca Silver', bottle: 875, shot: 40 },
      { id: 's5', name: 'Don Julio Reposado', bottle: 2400, shot: 80 },
      { id: 's6', name: 'Cactus Jack', bottle: 750, shot: 35 },
      { id: 's7', name: 'Espolon', bottle: 1286, shot: 50 },
      { id: 's8', name: 'Strawberry Lips', shot: 30 },
      { id: 's9', name: 'Don Julio Silver', bottle: 2000, shot: 75 },
      { id: 's10', name: 'Jack Fire', shot: 40 },
      { id: 's11', name: 'Patrón', bottle: 2447, shot: 80 },
      { id: 's12', name: 'Los Lacos Reposado', shot: 60 },
      { id: 's13', name: 'Amarula', bottle: 425, shot: 25 },
      { id: 's14', name: 'Kahlua', shot: 25 },
    ],
  },
  {
    id: 'shooters',
    name: 'Shooters',
    items: [
      { id: 'sh1', name: 'Blowjob', single: 40 },
      { id: 'sh2', name: 'Jäger Bomb', single: 40 },
      { id: 'sh3', name: 'Springbok', single: 40 },
      { id: 'sh4', name: 'Sowetan Toilet', single: 40 },
      { id: 'sh5', name: 'Suitcase', single: 50 },
      { id: 'sh6', name: 'Liquid Cocaine', single: 35 },
    ],
  },
  {
    id: 'cordials',
    name: 'Roses Cordials',
    items: [
      { id: 'c1', name: 'Roses Cordial', single: 10 },
      { id: 'c2', name: 'Passion Fruit', single: 10 },
      { id: 'c3', name: 'Kola Tonic', single: 10 },
      { id: 'c4', name: 'Lime Cordial', single: 10 },
    ],
  },
  {
    id: 'spirits-liqueurs',
    name: 'Spirits & Liqueurs',
    items: [
      { id: 'sl1', name: 'Bacardi Carta Blanca', price: 'Ask server' },
      { id: 'sl2', name: 'Aperol', price: 'Ask server' },
      { id: 'sl3', name: 'Malibu', price: 'Ask server' },
      { id: 'sl4', name: 'Monate', price: 'Ask server' },
      { id: 'sl5', name: 'Tipo Tinto Spiced', price: 'Ask server' },
    ],
  },
  {
    id: 'beers',
    name: 'Beers',
    items: [
      { id: 'be1', name: 'Castle Lite', single: 35 },
      { id: 'be2', name: 'Castle Lager', single: 35 },
      { id: 'be3', name: 'Heineken', single: 40 },
      { id: 'be4', name: 'Corona', single: 40 },
      { id: 'be5', name: 'Amstel Lager', single: 40 },
      { id: 'be6', name: 'Black Label', single: 35 },
      { id: 'be7', name: 'Windhoek Lager', single: 45 },
      { id: 'be8', name: 'Windhoek Draught', single: 45 },
      { id: 'be9', name: 'Castle Milk Stout', single: 35 },
      { id: 'be10', name: 'Guinness Draught', single: 50 },
      { id: 'be11', name: "Miller's Draft Bottle", single: 40 },
      { id: 'be12', name: 'Hansa Pilsener', single: 35 },
      { id: 'be13', name: 'Heineken Zero', single: 35 },
      { id: 'be14', name: 'Corona Zero', single: 35 },
      { id: 'be15', name: 'Flying Fish Lemon', single: 35 },
      { id: 'be16', name: 'Flying Fish Apple', single: 35 },
    ],
  },
  {
    id: 'ciders',
    name: 'Ciders & RTDs',
    items: [
      { id: 'ci1', name: 'Hunters Dry', single: 35 },
      { id: 'ci2', name: 'Hunters Gold', single: 35 },
      { id: 'ci3', name: 'Hunters Extreme', single: 35 },
      { id: 'ci4', name: 'Savanna Dry', single: 35 },
      { id: 'ci5', name: 'Savanna Lite', single: 35 },
      { id: 'ci6', name: 'Savanna Zero', single: 35 },
      { id: 'ci7', name: 'Belgravia Gin & Tonic', single: 35 },
      { id: 'ci8', name: 'Belgravia Gin & Dark Cherry', single: 35 },
      { id: 'ci9', name: 'Belgravia Gin & Pink Tonic', single: 35 },
      { id: 'ci10', name: 'Belgravia Gin & Dry Lemon', single: 35 },
      { id: 'ci11', name: 'Black Crown Gin & Dry Lemon', single: 35 },
      { id: 'ci12', name: 'Bernini Classic', single: 35 },
      { id: 'ci13', name: 'Bernini Blush', single: 35 },
      { id: 'ci14', name: 'Breezer Blueberry', single: 35 },
      { id: 'ci15', name: 'Breezer Blackberry', single: 35 },
      { id: 'ci16', name: 'Breeder Watermelon', single: 35 },
      { id: 'ci17', name: 'Brutal Fruit Ruby Apple', single: 35 },
      { id: 'ci18', name: 'Brutal Fruit Litchi', single: 35 },
    ],
  },
  {
    id: 'sauvignon-blanc',
    name: 'Sauvignon Blanc',
    items: [
      { id: 'sb1', name: 'Spier', bottle: 200, glass: 50 },
      { id: 'sb2', name: 'Van Loveren', bottle: 200, glass: 50 },
    ],
  },
  {
    id: 'chardonnay',
    name: 'Chardonnay',
    items: [
      { id: 'ch1', name: 'Spier', bottle: 195, glass: 65 },
      { id: 'ch2', name: 'Meerlust', bottle: 250 },
    ],
  },
  {
    id: 'chenin-blanc',
    name: 'Chenin Blanc',
    items: [
      { id: 'cb1', name: 'Spier', bottle: 200 },
    ],
  },
  {
    id: 'rose',
    name: 'Rosé',
    items: [
      { id: 'ro1', name: 'Spier Rosé', bottle: 200 },
      { id: 'ro2', name: 'Millstream Rosé', bottle: 200 },
    ],
  },
  {
    id: 'cap-classique',
    name: 'Cap Classique',
    items: [
      { id: 'cc1', name: 'Krone Night Nectar', single: 600 },
      { id: 'cc2', name: 'Krone Night Nectar Rosé', single: 600 },
      { id: 'cc3', name: 'Krone Borealis Brut', single: 600 },
      { id: 'cc4', name: 'Graham Beck Brut Rosé', single: 450 },
      { id: 'cc5', name: 'Boschendal Luxe Nectar', single: 420 },
      { id: 'cc6', name: 'Steenberg Chardonnay Brut', single: 300 },
      { id: 'cc7', name: 'Steenberg Pinot Noir Brut', single: 300 },
      { id: 'cc8', name: 'Annabelle Cuvée Rosé', single: 180 },
      { id: 'cc9', name: "Moët & Chandon", price: 'Ask server' },
    ],
  },
  {
    id: 'merlot',
    name: 'Merlot',
    items: [
      { id: 'm1', name: 'Guardian Peak', single: 450 },
      { id: 'm2', name: 'Van Loveren', single: 250 },
      { id: 'm3', name: 'Meerlust', single: 950 },
    ],
  },
  {
    id: 'pinotage',
    name: 'Pinotage',
    items: [
      { id: 'p1', name: 'Van Loveren', bottle: 200, glass: 65 },
    ],
  },
  {
    id: 'cabernet-sauvignon',
    name: 'Cabernet Sauvignon',
    items: [
      { id: 'cs1', name: 'Waterford', single: 450 },
      { id: 'cs2', name: 'Van Loveren', single: 250 },
      { id: 'cs3', name: 'Fat Bastard', single: 320 },
      { id: 'cs4', name: 'Meerlust', single: 750 },
      { id: 'cs5', name: 'Stellenbosch', single: 250 },
      { id: 'cs6', name: 'Rust en Vrede', single: 750 },
    ],
  },
  {
    id: 'shiraz',
    name: 'Shiraz',
    items: [
      { id: 'shz1', name: 'Cederberg', single: 470 },
      { id: 'shz2', name: 'Guardian Peak', single: 350 },
      { id: 'shz3', name: 'Kevin Arnold', single: 320 },
    ],
  },
  {
    id: 'red-blends',
    name: 'Red Blends',
    items: [
      { id: 'rb1', name: 'Meerlust Rubicon', single: 850 },
      { id: 'rb2', name: 'Optima', single: 490 },
      { id: 'rb3', name: 'R&R Baron Edmond', single: 900 },
      { id: 'rb4', name: 'R&R Classique', single: 450 },
      { id: 'rb5', name: 'Alto Rouge', bottle: 300, glass: 75 },
      { id: 'rb6', name: 'Rust en Vrede', single: 750 },
      { id: 'rb7', name: 'Boschendal Nicolas', single: 450 },
      { id: 'rb8', name: 'Stellenbosch Reserve Vanderstel', single: 420 },
    ],
  },
  {
    id: 'other-varietals',
    name: 'Other Varietals',
    items: [
      { id: 'ov1', name: 'The Wolf Trap', single: 220 },
      { id: 'ov2', name: 'Pepperwind Syrah', single: 600 },
      { id: 'ov3', name: 'Van Loveren Blanc de Blanc', single: 200 },
      { id: 'ov4', name: 'Nederburg', price: 'Ask server' },
      { id: 'ov5', name: 'The Beach House', price: 'Ask server' },
    ],
  },
  {
    id: 'special-board',
    name: 'Special Board',
    items: [
      { id: 'sbr1', name: 'Richelieu + Mixer', price: 'Ask server' },
      { id: 'sbr2', name: 'Klipdrift + Mixer', price: 'Ask server' },
      { id: 'sbr3', name: 'KWV 3yr + Mixer', price: 'Ask server' },
      { id: 'sbr4', name: 'Captain Morgan + Mixer', price: 'Ask server' },
    ],
  },
  {
    id: 'soft-drinks',
    name: 'Soft Drinks & Mixers',
    items: [
      { id: 'sd1', name: 'Sprite', price: 'Ask server' },
      { id: 'sd2', name: 'Sparletta Creme Soda', price: 'Ask server' },
      { id: 'sd3', name: 'Schweppes / Mixers', price: 'Ask server' },
      { id: 'sd4', name: 'Valpré Water', price: 'Ask server' },
      { id: 'sd5', name: 'Still Water', price: 'Ask server' },
      { id: 'sd6', name: 'Liqui Fruit', price: 'Ask server' },
      { id: 'sd7', name: 'Tropika', price: 'Ask server' },
      { id: 'sd8', name: 'Appletiser', price: 'Ask server' },
      { id: 'sd9', name: 'Red Bull / Energy Drinks', price: 'Ask server' },
      { id: 'sd10', name: 'Juice Dispensers / House Juice', price: 'Ask server' },
    ],
  },
];
