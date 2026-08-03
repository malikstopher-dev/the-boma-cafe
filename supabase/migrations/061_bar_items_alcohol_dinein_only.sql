-- ============================================================
-- Migration 061: Alcohol flag + dine-in-only enforcement
-- ============================================================

-- 1. Add is_alcohol to bar_items (default false = non-alcoholic)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bar_items' AND column_name = 'is_alcohol') THEN
    ALTER TABLE bar_items ADD COLUMN is_alcohol BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Backfill: mark known alcoholic categories as alcohol
--    (match against the seeded category names from barMenuData)
UPDATE bar_items
SET is_alcohol = true
WHERE category_id IN (
  SELECT id FROM bar_categories
  WHERE LOWER(TRIM(name)) IN (
    'signature cocktails', 'classic cocktails', 'cocktails',
    'whisky', 'whiskey', 'brandy', 'cognac', 'vodka', 'gin', 'rum',
    'shots', 'shooters', 'tequila', 'roses cordials', 'spirits & liqueurs',
    'beers', 'beer', 'ciders & rtds', 'cider',
    'sauvignon blanc', 'chardonnay', 'chenin blanc', 'rosé', 'rose',
    'cap classique', 'champagne', 'prosecco', 'merlot', 'pinotage',
    'cabernet sauvignon', 'shiraz', 'red blends', 'white blends',
    'other varietals', 'special board', 'wines', 'wine', 'port', 'sherry'
  )
);

-- 3. Dine-in only: block pickup for every alcoholic item
UPDATE bar_items
SET available_for_pickup = false
WHERE is_alcohol = true;

-- 4. Index for fast pickup/alcohol filtering
CREATE INDEX IF NOT EXISTS idx_bar_items_alcohol
  ON bar_items(is_alcohol) WHERE is_alcohol = true;
