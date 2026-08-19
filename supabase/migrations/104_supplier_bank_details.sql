-- Isolated supplier banking details. Payload encryption is performed by the
-- application; this table never stores plaintext banking fields.

CREATE TABLE IF NOT EXISTS public.inventory_supplier_bank_details (
  supplier_id UUID PRIMARY KEY REFERENCES public.inventory_suppliers(id) ON DELETE CASCADE,
  payload_ciphertext TEXT NOT NULL,
  payload_iv TEXT NOT NULL,
  payload_auth_tag TEXT NOT NULL,
  account_last4 CHAR(4) NOT NULL CHECK (account_last4 ~ '^[0-9]{4}$'),
  key_version SMALLINT NOT NULL DEFAULT 1 CHECK (key_version > 0),
  created_by_admin_id UUID REFERENCES public.admin_accounts(id),
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_supplier_bank_details ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_supplier_bank_details FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.inventory_supplier_bank_details TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_supplier_bank_details(
  p_supplier_id UUID,
  p_payload_ciphertext TEXT,
  p_payload_iv TEXT,
  p_payload_auth_tag TEXT,
  p_account_last4 TEXT,
  p_key_version SMALLINT,
  p_admin_id UUID,
  p_changed_fields JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing BOOLEAN;
  v_now TIMESTAMPTZ := now();
BEGIN
  PERFORM 1 FROM public.inventory_suppliers WHERE id = p_supplier_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier not found: %', p_supplier_id; END IF;
  IF p_account_last4 IS NULL OR p_account_last4 !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Invalid account_last4'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.inventory_supplier_bank_details WHERE supplier_id = p_supplier_id)
    INTO v_existing;

  INSERT INTO public.inventory_supplier_bank_details (
    supplier_id, payload_ciphertext, payload_iv, payload_auth_tag, account_last4,
    key_version, created_by_admin_id, updated_by_admin_id, created_at, updated_at
  ) VALUES (
    p_supplier_id, p_payload_ciphertext, p_payload_iv, p_payload_auth_tag, p_account_last4,
    p_key_version, p_admin_id, p_admin_id, v_now, v_now
  )
  ON CONFLICT (supplier_id) DO UPDATE SET
    payload_ciphertext = EXCLUDED.payload_ciphertext,
    payload_iv = EXCLUDED.payload_iv,
    payload_auth_tag = EXCLUDED.payload_auth_tag,
    account_last4 = EXCLUDED.account_last4,
    key_version = EXCLUDED.key_version,
    updated_by_admin_id = EXCLUDED.updated_by_admin_id,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, after_values)
  VALUES (
    p_admin_id,
    CASE WHEN v_existing THEN 'supplier_bank_details.update' ELSE 'supplier_bank_details.create' END,
    'inventory_supplier_bank_details', p_supplier_id::TEXT,
    jsonb_build_object('account_last4', p_account_last4, 'key_version', p_key_version, 'changed_fields', COALESCE(p_changed_fields, '[]'::JSONB))
  );

  RETURN jsonb_build_object('supplier_id', p_supplier_id, 'account_last4', p_account_last4, 'key_version', p_key_version, 'updated_at', v_now);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_supplier_bank_details(UUID, TEXT, TEXT, TEXT, TEXT, SMALLINT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_supplier_bank_details(UUID, TEXT, TEXT, TEXT, TEXT, SMALLINT, UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_supplier_bank_details(
  p_supplier_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_last4 TEXT;
  v_deleted INTEGER;
BEGIN
  SELECT account_last4 INTO v_last4
    FROM public.inventory_supplier_bank_details
    WHERE supplier_id = p_supplier_id
    FOR UPDATE;
  DELETE FROM public.inventory_supplier_bank_details WHERE supplier_id = p_supplier_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN RAISE EXCEPTION 'Banking details not found: %', p_supplier_id; END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, after_values)
  VALUES (p_admin_id, 'supplier_bank_details.delete', 'inventory_supplier_bank_details', p_supplier_id::TEXT,
          jsonb_build_object('account_last4', v_last4));
  RETURN jsonb_build_object('supplier_id', p_supplier_id, 'deleted', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_supplier_bank_details(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_supplier_bank_details(UUID, UUID) TO service_role;
