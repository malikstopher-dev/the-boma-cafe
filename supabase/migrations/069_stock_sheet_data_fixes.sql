-- 069_stock_sheet_data_fixes.sql
-- Production data fixes for the Stock Sheet screenshots (2026-08-11):
--   1. Deduplicate inventory_categories (prod had 10x 'Mixers' + 10x 'Spirits'
--      from repeated imports — the stock sheet dropdown could only ever show
--      those two names, and both tabs looked identical).
--   2. Seed the missing bar + kitchen category sets so Bar Stock and Kitchen
--      Stock get distinct, realistic options.
--   3. Seed the missing 'Kitchen' location (cost_centre_id is NOT NULL since
--      migration 066, so it must be inserted WITH a cost centre).

-- 1a. Deduplicate categories: point every product at the earliest category
--     row with the same name, then drop the copies.
UPDATE inventory_products p
   SET category_id = kept.id
  FROM (
    SELECT DISTINCT ON (name) id, name
      FROM inventory_categories
     ORDER BY name, created_at, id
  ) AS kept
 WHERE p.category_id IS NOT NULL
   AND kept.name = (SELECT c.name FROM inventory_categories c WHERE c.id = p.category_id)
   AND p.category_id <> kept.id;

-- 1b. Delete the duplicate category rows (any row that has an earlier
--     same-named row). The earliest row per name survives.
DELETE FROM inventory_categories c
 WHERE EXISTS (
   SELECT 1 FROM inventory_categories earlier
    WHERE earlier.name = c.name
      AND (earlier.created_at, earlier.id) < (c.created_at, c.id)
 );

-- 2. Seed the category sets (idempotent by name).
INSERT INTO inventory_categories (name, parent_id)
SELECT v.name, NULL::uuid
  FROM (VALUES
    -- Bar stock
    ('Wines & Bubbles'), ('Beers & Ciders'), ('Liqueurs'), ('Non-Alcoholic'),
    -- Kitchen stock
    ('Meat & Poultry'), ('Seafood'), ('Dairy'), ('Produce'), ('Dry Store'),
    ('Sauces & Spices'), ('Bakery'), ('Frozen'), ('Packaging')
  ) AS v(name)
 WHERE NOT EXISTS (SELECT 1 FROM inventory_categories c WHERE c.name = v.name);

-- 3. Seed the Kitchen location with its Kitchen cost centre.
INSERT INTO inventory_locations (name, code, cost_centre_id)
SELECT 'Kitchen', 'KITCHEN', cc.id
  FROM cost_centres cc
 WHERE cc.name = 'Kitchen'
   AND NOT EXISTS (SELECT 1 FROM inventory_locations l WHERE l.name = 'Kitchen');
