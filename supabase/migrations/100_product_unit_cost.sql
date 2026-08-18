-- E1A: product unit cost column on inventory_products.
-- The ledger already carries unit_cost on transactions (P0, migration 083);
-- this column is the product's CURRENT cost for display and for the smart
-- product import (E1A). Additive, nullable, guarded.

ALTER TABLE inventory_products
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2);