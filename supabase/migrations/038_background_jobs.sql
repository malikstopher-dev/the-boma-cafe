-- ============================================================
-- Migration 038: Background Jobs Queue
--
-- Generic async job queue for long-running or resource-intensive
-- operations that must not execute inside user-facing request/response
-- cycles (PDF generation, email delivery, image processing, reports,
-- invoices, notifications, data exports, etc.).
--
-- Notify channel: background_jobs_inserted (LISTEN by worker)
-- ============================================================

-- ============================================================
-- 1. BACKGROUND JOBS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS background_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','failed','cancelled','dead_letter')),
  payload         JSONB NOT NULL,
  result          JSONB,
  error           JSONB,
  idempotency_key TEXT UNIQUE,
  priority        INT NOT NULL DEFAULT 0,
  retry_count     INT NOT NULL DEFAULT 0,
  max_retries     INT NOT NULL DEFAULT 3,
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  heartbeat_at    TIMESTAMPTZ,
  locked_by       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bgjobs_status
  ON background_jobs (status, priority DESC, scheduled_at ASC);

CREATE INDEX IF NOT EXISTS idx_bgjobs_type_status
  ON background_jobs (job_type, status);

CREATE INDEX IF NOT EXISTS idx_bgjobs_heartbeat
  ON background_jobs (status, heartbeat_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_bgjobs_idempotency
  ON background_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- 3. NOTIFY TRIGGER FOR WORKER WAKEUP
-- ============================================================

CREATE OR REPLACE FUNCTION notify_background_jobs_inserted()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('background_jobs_inserted', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_background_jobs_inserted ON background_jobs;
CREATE TRIGGER trg_background_jobs_inserted
  AFTER INSERT ON background_jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_background_jobs_inserted();

-- ============================================================
-- 4. EMAIL IDEMPOTENCY COLUMNS ON QUOTES
-- ============================================================

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS quotation_email_sent_at TIMESTAMPTZ;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS quotation_email_recipient TEXT;

-- ============================================================
-- 5. RELOAD POSTGREST SCHEMA
-- ============================================================

NOTIFY pgrst, 'reload schema';
