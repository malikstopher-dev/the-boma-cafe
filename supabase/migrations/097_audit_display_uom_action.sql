-- E3: allow display-uom changes in the audit trail.
-- inventory_audit_log.action CHECK (039) only allowed
-- created/updated/archived/restored/hard_deleted; the products PATCH
-- display-UOM block writes 'display_uom_updated', which was silently
-- rejected (the route did not inspect the insert error). Extend the CHECK.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_audit_log_action_check'
      AND conrelid = 'inventory_audit_log'::regclass
  ) THEN
    ALTER TABLE inventory_audit_log
      DROP CONSTRAINT inventory_audit_log_action_check;
    ALTER TABLE inventory_audit_log
      ADD CONSTRAINT inventory_audit_log_action_check
      CHECK (action IN ('created', 'updated', 'archived', 'restored', 'hard_deleted', 'display_uom_updated'));
  END IF;
END
$$;