-- Create order_events table to log every status change
CREATE TABLE IF NOT EXISTS order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  created_by TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by order
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at);

-- Enable RLS
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anon insert order_events" ON order_events;
DROP POLICY IF EXISTS "Allow authenticated read order_events" ON order_events;
DROP POLICY IF EXISTS "Allow authenticated insert order_events" ON order_events;

-- Allow anon/service-role insert (for backend trigger inserts)
CREATE POLICY "Allow anon insert order_events"
  ON order_events FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated read (admin/kitchen)
CREATE POLICY "Allow authenticated read order_events"
  ON order_events FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated insert (admin/kitchen actions)
CREATE POLICY "Allow authenticated insert order_events"
  ON order_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for order_events (so kitchen/admin see events live)
ALTER PUBLICATION supabase_realtime ADD TABLE order_events;
