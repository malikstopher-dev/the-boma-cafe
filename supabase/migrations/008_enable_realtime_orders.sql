-- Enable Realtime on the orders table for kitchen display live updates
-- Run this via Supabase Dashboard SQL Editor or:
--   psql "$SUPABASE_DB_URL" -f supabase/migrations/008_enable_realtime_orders.sql

alter publication supabase_realtime add table orders;
