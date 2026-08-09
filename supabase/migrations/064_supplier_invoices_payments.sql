-- ============================================================
-- Migration 064: Supplier invoices, payments & delivery
-- verification (Owner Dashboard payables model, 09 Aug 2026)
--
-- Adds the missing data needed to answer "how much do we owe
-- suppliers":
--   1. supplier invoice records (standalone or linked to a
--      receiving event / PO)
--   2. supplier payments (each tracked, auditable, reversible)
--   3. verification workflow on receiving events
--      (pending -> verified / rejected)
--
-- All changes are additive; no existing column/table is altered.
-- Access follows migration 063/061: anon + authenticated roles
-- are revoked; only server-side admin client (service_role)
-- can use these tables.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add columns to inventory_po_receipts (existing table)
-- ------------------------------------------------------------
ALTER TABLE public.inventory_po_receipts
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.staff_profiles(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_po_receipts_verification
  ON public.inventory_po_receipts(verification_status, verified_at);

-- ------------------------------------------------------------
-- 2. Supplier invoices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_supplier_invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id    UUID NOT NULL REFERENCES public.inventory_suppliers(id),
  receipt_id     UUID REFERENCES public.inventory_po_receipts(id),
  invoice_number TEXT,
  invoice_date   DATE,
  due_date       DATE,
  total_amount   NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'void')),
  notes          TEXT,
  created_by     UUID REFERENCES public.staff_profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier
  ON public.inventory_supplier_invoices(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_receipt
  ON public.inventory_supplier_invoices(receipt_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due
  ON public.inventory_supplier_invoices(due_date) WHERE due_date IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Supplier payments (against an invoice)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_supplier_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES public.inventory_supplier_invoices(id),
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method       TEXT NOT NULL DEFAULT 'EFT' CHECK (method IN ('EFT', 'Cash', 'Card', 'Cheque', 'Other')),
  reference    TEXT,
  notes        TEXT,
  created_by   UUID REFERENCES public.staff_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_invoice
  ON public.inventory_supplier_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_paid
  ON public.inventory_supplier_payments(paid_at);

-- ------------------------------------------------------------
-- 4. Close access to non-service roles (migration 063 pattern)
-- ------------------------------------------------------------
REVOKE ALL ON public.inventory_supplier_invoices FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.inventory_supplier_payments FROM PUBLIC, anon, authenticated;