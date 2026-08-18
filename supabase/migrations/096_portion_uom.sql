-- 096_portion_uom.sql
-- E3: seed a Portion UOM so kitchen products can be counted/displayed in
-- portions (display-UOM machinery already exists via inventory_product_uoms
-- is_display + conversion_factor; the ledger stays in base units).

INSERT INTO inventory_uoms (name, symbol, category)
SELECT v.name, v.symbol, v.category
  FROM (VALUES
    ('Portion', 'por', 'discrete')
  ) AS v(name, symbol, category)
 WHERE NOT EXISTS (SELECT 1 FROM inventory_uoms u WHERE u.name = v.name);