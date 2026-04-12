export interface MenuImageConfig {
  categoryFallbacks: Record<string, string>;
  itemImages: Record<string, string>;
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  'Breakfast': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  'Toasties': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Hungry... Ish': 'https://images.unsplash.com/photo-1608039829572-9432d2d1f104?w=400&h=300&fit=crop',
  'Curries & Bunnies': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'Flame-Grilled': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  'Braai Platters': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Hot Beverages': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
  'Cold Beverages': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'DRNK Freezos': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=300&fit=crop',
  'Milkshakes': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',
  'Classic Cocktails': 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=400&h=300&fit=crop',
  'Non-Alcoholic Cocktails': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
  'Burgers': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Burger Extras': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
  'Fries & Extras': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
  'Pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'Desserts': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
  'Kids Corner': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
  'Platters': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
};

const ITEM_IMAGES: Record<string, string> = {
  // BREAKFAST
  'Day Breaker': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  'Cheese Griller Breakfast': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop',
  'Wors Breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
  'Carb-Conscious Breakfast': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  'Boma Breakfast': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop',

  // TOASTIES
  'Cheese & Tomato': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Chicken & Mayo': 'https://images.unsplash.com/photo-1610450939271-611c2823e6b7?w=400&h=300&fit=crop',
  'Bacon, Egg & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Lamb Russian & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Lamb Patty & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Beef Patty & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Steak & Cheese': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',

  // HUNGRY... ISH
  '8 Wings & Chips': 'https://images.unsplash.com/photo-1608039829572-9432d2d1f104?w=400&h=300&fit=crop',
  'Wors & 1/4 Chicken': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  '200g Ribs & 5 Wings': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Wors & 5 Wings': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  '10 Samoosas': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  '200g Wors & Ribs': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  '200g Ribs & 1/4 Chicken': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  '8 Wings & Ribs': 'https://images.unsplash.com/photo-1608039829572-9432d2d1f104?w=400&h=300&fit=crop',
  '200g Ribs & Steak': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Boma Basket': 'https://images.unsplash.com/photo-1608039829572-9432d2d1f104?w=400&h=300&fit=crop',

  // CURRIES & BUNNIES
  'Lamb Bunny Chow': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'Beef Bunny Chow': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Butter Chicken Bunny Chow': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'Lamb Durban Curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Beef Durban Curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Butter Chicken Durban Curry': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'Lamb Roti Roll': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  'Beef Roti Roll': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'Butter Chicken Roti Roll': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',

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
  'Moccachino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',

  // DRNK FREEZOS - Each with unique images
  'Coffee Freezo': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=300&fit=crop',
  'Spiced Chai Freezo': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
  'Decadent Chocolate Freezo': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',
  'White Chocolate Freezo': 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=300&fit=crop',

  // MILKSHAKES - Each with unique images
  'Chocolate Shake': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',
  'Strawberry Shake': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
  'Bubblegum Shake': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'Oreo Shake': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',

  // CLASSIC COCKTAILS - Each with unique images
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
  'Cherry blossom ginger G&T': 'https://images.unsplash.com/photo-1583318432732-a19e0708d30c?w=400&h=300&fit=crop',
  'Yuzu whiskey Sours': 'https://images.unsplash.com/photo-1515023782549-62ca0d244b69?w=400&h=300&fit=crop',
  'Brown butter Old Fashioned': 'https://images.unsplash.com/photo-1470337458705-8b9b1b7c8d90?w=400&h=300&fit=crop',

  // NON-ALCOHOLIC COCKTAILS - Each with unique images
  'Berry Citrus Twist': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
  'Cosmo Crush': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'No-Jito': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
  'Virgin Pina Colada': 'https://images.unsplash.com/photo-1515444749299-224754c8e78c?w=400&h=300&fit=crop',
  'Virgin Strawberry Daiquiri': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
  'Cherry blossom martini': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',

  // BURGERS - Each with unique images
  'Classic Beef Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Chicken Burger': 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop',
  'Boma Double Burger': 'https://images.unsplash.com/photo-1550547660-d9450f859043?w=400&h=300&fit=crop',
  'Veggie Burger': 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=300&fit=crop',

  // BURGER EXTRAS - Each with unique images
  'Egg': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  'Bacon': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
  'Avo': 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=300&fit=crop',
  'Cheese': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop',
  'Beef Patty': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Lamb Patty': 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=300&fit=crop',

  // FRIES & EXTRAS
  'Small Fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
  'Medium Fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
  'Large Fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',

  // PIZZA - Each with unique images
  'Something Meaty': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'Something Cheesy': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
  'BBQ Chicken': 'https://images.unsplash.com/photo-1595944024804-5a687f3c935e?w=400&h=300&fit=crop',
  'Lamb Curry & Cheese': 'https://images.unsplash.com/photo-1604103829192-1297d2b9e535?w=400&h=300&fit=crop',
  'Margherita': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
  'Sausage': 'https://images.unsplash.com/photo-1619546813926-a78b6379c2ba?w=400&h=300&fit=crop',
  'Regina': 'https://images.unsplash.com/photo-1595944024804-5a687f3c935e?w=400&h=300&fit=crop',
  'Hawaiian': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'Pizza Extra: Ham': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'Pizza Extra: Salami': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
  'Pizza Extra: Mushrooms': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
  'Pizza Extra: Peppers': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
  'Pizza Extra: Cheese': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
  'Pizza Extra: Olives': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'Pizza Extra: Bacon': 'https://images.unsplash.com/photo-1595944024804-5a687f3c935e?w=400&h=300&fit=crop',

  // DESSERTS - Each with unique images
  'Cheese Cake': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',
  'Carrot Cake': 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=400&h=300&fit=crop',
  'Chocolate Cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
  'Ice Cream & Chocolate Sauce': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=300&fit=crop',
  'Seasonal Fruit': 'https://images.unsplash.com/photo-1511690656952-34342d5c71df?w=400&h=300&fit=crop',

  // KIDS CORNER
  'Chicken Strips & Fries': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
  'Wings & Fries': 'https://images.unsplash.com/photo-1608039829572-9432d2d1f104?w=400&h=300&fit=crop',
  'Ribs & Wings': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Burger & Waffle Fries': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Kiddies Pizza (20cm)': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'Milkshake': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',
  'Juice': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop',

  // PLATTERS - Each with unique images
  'Boma Pastry Platter': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'Boma Platter': 'https://images.unsplash.com/photo-1555939594-58d7cb560e0d?w=400&h=300&fit=crop',
  'Boma Chicken Platter': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  'Boma Meaty Platter': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Boma Sandwich Platter': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
  'Boma Hungry Mix Platter': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Boma Sweet Platter 1': 'https://images.unsplash.com/photo-1551014738-593c98783c09?w=400&h=300&fit=crop',
  'Boma Sweet Platter 2': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
  'Customized Platter': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',

  // FLAME-GRILLED
  '1/4 Chicken, Pap & Gravy': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  '300g T-Bone Steak, Egg & Chips': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  '500g T-Bone Steak': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop',
  '300g T-Bone Steak': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  '300g Steak Sirloin': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop',
  '500g Rack of Ribs': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  '300g Rack of Ribs': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  '2 Piece Hake & Chips': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
  '1/4 Chicken and Chips': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  '1/2 Chicken and Chips': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  '1/4 Chicken Tikka, Chips & Roti': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  'Full Chicken, Chips & 4 Rotis': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',

  // BRAAI PLATTERS
  'Braai Platter for 2': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Braai Platter for 4': 'https://images.unsplash.com/photo-1555939594-58d7cb560e0d?w=400&h=300&fit=crop',
  'Braai Platter for 6': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',

  // COLD BEVERAGES - Each with unique images
  'Cold Drink / Soda': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'Appletiser / Grapetiser': 'https://images.unsplash.com/photo-1511690656952-34342d5c71df?w=400&h=300&fit=crop',
  'Still / Sparkling Water': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop',
  'Liquifruit': 'https://images.unsplash.com/photo-1629203851122-3726c5f7c4bd?w=400&h=300&fit=crop',
  'Red Bull': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400&h=300&fit=crop',
  'Rock Shandy': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
  'Steelworks': 'https://images.unsplash.com/photo-1622543925917-7632a394a1f1?w=400&h=300&fit=crop',
  'Fresh Juice': 'https://images.unsplash.com/photo-1579622561880-5f459d6c8cfe?w=400&h=300&fit=crop',
};

export function getMenuItemImage(item: { name: string; category: string }): string {
  return ITEM_IMAGES[item.name] || CATEGORY_FALLBACKS[item.category] || CATEGORY_FALLBACKS['Breakfast'];
}
