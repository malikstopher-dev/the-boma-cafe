-- 077_reservation_consume_unique.sql
-- H2 (P0/P1 remediation): close the reservation consumption double-post
-- window at the database level.
--
-- Problem: consumeReservation() posts the SALE ledger transaction with
-- createTransaction() and THEN transitions the reservation to 'consumed'
-- in a separate round-trip. Two races can double-post the SALE:
--   1. concurrent /consume calls both pass the pre-check, both create the
--      SALE, and only one wins the guarded status update, and
--   2. a crash between createTransaction and the status update leaves the
--      SALE posted with the reservation still 'active' — a retry re-posts.
--
-- One reservation is consumed in a single SALE (the engine always consumes
-- the full remaining quantity and sets status 'consumed'; there is no
-- partial-consume path), so the invariant "at most one SALE transaction per
-- reservation" is enforced here. The engine (reservations.ts) catches the
-- resulting 23505 duplicate-key error and reuses the posted transaction.

ALTER TABLE public.inventory_transactions
  ADD COLUMN reservation_id UUID REFERENCES public.inventory_reservations(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_inventory_transactions_reservation_sale
  ON public.inventory_transactions (reservation_id)
  WHERE transaction_type = 'sale';