-- Access token for secure customer portal access
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS access_token TEXT;

CREATE INDEX IF NOT EXISTS idx_quotes_access_token ON quotes (access_token);

-- Version history table
CREATE TABLE IF NOT EXISTS quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  generated_by TEXT NOT NULL DEFAULT 'system',
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_versions_quote_id ON quote_versions (quote_id);
