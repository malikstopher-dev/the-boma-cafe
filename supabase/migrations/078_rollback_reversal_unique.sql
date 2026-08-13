-- H4: at most one rollback reversal per original movement. Reversal notes
-- carry the source transaction id, so this partial unique index rejects a
-- second reversal for the same movement — a concurrent or crashed retry of
-- the rollback reuses the existing reversal instead of double-posting.
CREATE UNIQUE INDEX idx_inventory_transactions_rollback_reversal
  ON public.inventory_transactions (notes)
  WHERE notes LIKE 'Rollback of import batch %';