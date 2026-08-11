-- 070_seed_bar_kitchen_units.sql
-- Seed the missing units of measure for the Stock Sheet UNIT dropdown.
-- Prod only had Each / Kilogram / Litre / TestUOM; bar stock needs tots,
-- bottles, cases; kitchen needs gram / box / bag / pack.

INSERT INTO inventory_uoms (name, symbol, category)
SELECT v.name, v.symbol, v.category
  FROM (VALUES
    ('Tots',       'tot',  'continuous'),
    ('Bottle',     'btl',  'discrete'),
    ('Case',       'cs',   'discrete'),
    ('Pack',       'pk',   'discrete'),
    ('Box',        'box',  'discrete'),
    ('Bag',        'bag',  'discrete'),
    ('Gram',       'g',    'continuous'),
    ('Millilitre', 'ml',   'continuous')
  ) AS v(name, symbol, category)
 WHERE NOT EXISTS (SELECT 1 FROM inventory_uoms u WHERE u.name = v.name);
