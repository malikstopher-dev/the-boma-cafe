# PRODUCTION DATABASE BACKUP CHECKLIST

**Date:** 2026-07-12
**Purpose:** Backup critical tables before running migration 023
**Tool:** Supabase Dashboard SQL Editor or `psql`

---

## Pre-Migration Backup Steps

### Step 1: Export Schema

From Supabase Dashboard:
1. Go to **Project Settings** → **Database** → **Backups**
2. Click **Create a backup** (if available on your plan)

Or via `pg_dump` (requires database connection string):

```bash
pg_dump --schema-only --no-owner --no-privileges \
  "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  > schema_backup_20260712.sql
```

### Step 2: Export Data from Critical Tables

Run each of these in the **Supabase SQL Editor** or via `psql`:

#### Orders (most critical — transactional data)

```sql
-- Export orders
COPY (
  SELECT * FROM orders ORDER BY created_at DESC
) TO '/tmp/backup_orders_20260712.csv' WITH CSV HEADER;
```

Or via Supabase Dashboard:
1. Go to **Table Editor** → `orders`
2. Click **Export** → **Export as CSV**
3. Save as `backup_orders_20260712.csv`

#### Bookings

```sql
COPY (
  SELECT * FROM bookings ORDER BY created_at DESC
) TO '/tmp/backup_bookings_20260712.csv' WITH CSV HEADER;
```

#### Contact Messages (inquiries)

```sql
COPY (
  SELECT * FROM contact_messages ORDER BY created_at DESC
) TO '/tmp/backup_contact_messages_20260712.csv' WITH CSV HEADER;
```

#### Menu Items

```sql
COPY (
  SELECT * FROM menu_items ORDER BY order_index
) TO '/tmp/backup_menu_items_20260712.csv' WITH CSV HEADER;
```

#### Menu Categories

```sql
COPY (
  SELECT * FROM menu_categories ORDER BY order_index
) TO '/tmp/backup_menu_categories_20260712.csv' WITH CSV HEADER;
```

#### Gallery

```sql
COPY (
  SELECT * FROM gallery ORDER BY order_index
) TO '/tmp/backup_gallery_20260712.csv' WITH CSV HEADER;
```

#### Promotions

```sql
COPY (
  SELECT * FROM promotions ORDER BY order_index
) TO '/tmp/backup_promotions_20260712.csv' WITH CSV HEADER;
```

#### Events

```sql
COPY (
  SELECT * FROM events ORDER BY order_index
) TO '/tmp/backup_events_20260712.csv' WITH CSV HEADER;
```

#### Site Settings

```sql
COPY (
  SELECT * FROM site_settings ORDER BY key
) TO '/tmp/backup_site_settings_20260712.csv' WITH CSV HEADER;
```

#### Order Events (audit log)

```sql
COPY (
  SELECT * FROM order_events ORDER BY changed_at DESC
) TO '/tmp/backup_order_events_20260712.csv' WITH CSV HEADER;
```

### Step 3: Alternative — Full Table Dump via pg_dump

If you have direct database access:

```bash
# Set connection string
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Dump individual tables
pg_dump --data-only --table=orders $DATABASE_URL > backup_orders_20260712.sql
pg_dump --data-only --table=bookings $DATABASE_URL > backup_bookings_20260712.sql
pg_dump --data-only --table=contact_messages $DATABASE_URL > backup_contact_messages_20260712.sql
pg_dump --data-only --table=menu_items $DATABASE_URL > backup_menu_items_20260712.sql
pg_dump --data-only --table=menu_categories $DATABASE_URL > backup_menu_categories_20260712.sql
pg_dump --data-only --table=gallery $DATABASE_URL > backup_gallery_20260712.sql
pg_dump --data-only --table=promotions $DATABASE_URL > backup_promotions_20260712.sql
pg_dump --data-only --table=events $DATABASE_URL > backup_events_20260712.sql
pg_dump --data-only --table=site_settings $DATABASE_URL > backup_site_settings_20260712.sql
pg_dump --data-only --table=order_events $DATABASE_URL > backup_order_events_20260712.sql

# Or dump all tables at once
pg_dump --data-only $DATABASE_URL > backup_all_data_20260712.sql
```

---

## How to Restore Tables

### From CSV (Supabase Dashboard)

1. Go to **Table Editor** → select table
2. Click **Insert** → **Import from CSV**
3. Upload the backup CSV file
4. On conflict: choose **Skip** or **Update** as appropriate

### From SQL dump (psql)

```bash
# Restore a single table
psql $DATABASE_URL < backup_orders_20260712.sql

# Restore all data
psql $DATABASE_URL < backup_all_data_20260712.sql
```

### From CSV via psql

```bash
# Create temp table, copy from CSV, then upsert
psql $DATABASE_URL << 'EOF'
-- Example for orders:
CREATE TEMP TABLE orders_backup (LIKE orders INCLUDING ALL);
\COPY orders_backup FROM 'backup_orders_20260712.csv' WITH CSV HEADER;
INSERT INTO orders SELECT * FROM orders_backup
  ON CONFLICT (id) DO NOTHING;
DROP TABLE orders_backup;
EOF
```

---

## Post-Backup Verification

Run these queries to verify data integrity after backup:

```sql
-- Record counts (compare before/after)
SELECT 'orders' as tbl, COUNT(*) FROM orders
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'contact_messages', COUNT(*) FROM contact_messages
UNION ALL SELECT 'menu_items', COUNT(*) FROM menu_items
UNION ALL SELECT 'menu_categories', COUNT(*) FROM menu_categories
UNION ALL SELECT 'gallery', COUNT(*) FROM gallery
UNION ALL SELECT 'promotions', COUNT(*) FROM promotions
UNION ALL SELECT 'events', COUNT(*) FROM events
UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings
UNION ALL SELECT 'order_events', COUNT(*) FROM order_events;

-- Verify no orders with served/rejected status exist yet
SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY count DESC;

-- Verify latest order
SELECT id, order_ref, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5;
```

---

## Checklist

- [ ] Schema exported
- [ ] `orders` table exported
- [ ] `bookings` table exported
- [ ] `contact_messages` table exported
- [ ] `menu_items` table exported
- [ ] `menu_categories` table exported
- [ ] `gallery` table exported
- [ ] `promotions` table exported
- [ ] `events` table exported
- [ ] `site_settings` table exported
- [ ] `order_events` table exported
- [ ] Backup files saved to secure location (not in git repo)
- [ ] Row counts verified before migration
- [ ] Migration 023 applied
- [ ] Row counts verified after migration
- [ ] Order status transitions tested (served, rejected)
