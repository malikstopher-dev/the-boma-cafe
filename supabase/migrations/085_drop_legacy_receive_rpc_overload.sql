-- 085_drop_legacy_receive_rpc_overload.sql
-- P1a follow-up: 084's CREATE OR REPLACE used a NEW signature
-- (8 args vs the old 6), so the old 6-arg receive_purchase_order
-- overload survived and PostgREST now answers every call with
-- PGRST203 (ambiguous candidates). The 6-arg overload is dead:
-- the only caller (receive route) always passes the admin params,
-- and the 8-arg function defaults them anyway.
-- Dropping it also removes its old REVOKE/GRANT state.

DROP FUNCTION IF EXISTS public.receive_purchase_order(
  UUID, TEXT, TEXT, UUID, UUID, JSONB
);

NOTIFY pgrst, 'reload schema';