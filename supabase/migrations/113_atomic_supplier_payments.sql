-- 113_atomic_supplier_payments.sql
-- H-11: locked, capped and idempotent supplier payment recording.

ALTER TABLE public.inventory_supplier_payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE public.inventory_supplier_payments
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID
    REFERENCES public.admin_accounts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_payments_idempotency
  ON public.inventory_supplier_payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_invoice_id UUID,
  p_supplier_id UUID,
  p_amount NUMERIC,
  p_paid_at TIMESTAMPTZ,
  p_recorded_by_admin_id UUID,
  p_method TEXT DEFAULT 'EFT',
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_invoice public.inventory_supplier_invoices%ROWTYPE;
  v_payment public.inventory_supplier_payments%ROWTYPE;
  v_paid NUMERIC;
  v_remaining NUMERIC;
  v_status TEXT;
  v_invoice_found BOOLEAN;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive' USING ERRCODE = '22023';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_payment
    FROM public.inventory_supplier_payments
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      IF v_payment.amount <> p_amount
         OR (p_invoice_id IS NOT NULL AND v_payment.invoice_id <> p_invoice_id)
         OR (p_supplier_id IS NOT NULL AND NOT EXISTS (
           SELECT 1 FROM public.inventory_supplier_invoices
           WHERE id = v_payment.invoice_id AND supplier_id = p_supplier_id
         )) THEN
        RAISE EXCEPTION 'Idempotency key was already used for a different payment'
          USING ERRCODE = '22023';
      END IF;
      SELECT status INTO v_status
      FROM public.inventory_supplier_invoices
      WHERE id = v_payment.invoice_id;
      RETURN jsonb_build_object(
        'id', v_payment.id,
        'invoice_id', v_payment.invoice_id,
        'status', v_status,
        'already_recorded', TRUE
      );
    END IF;
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice
    FROM public.inventory_supplier_invoices
    WHERE id = p_invoice_id
    FOR UPDATE;
  ELSE
    IF p_supplier_id IS NULL THEN
      RAISE EXCEPTION 'Either invoiceId or supplierId is required' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_invoice
    FROM public.inventory_supplier_invoices
    WHERE supplier_id = p_supplier_id
      AND status IN ('pending', 'partial', 'overdue')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;
  v_invoice_found := FOUND;

  -- Re-check after the invoice lock. Concurrent retries can both miss the
  -- fast-path lookup above, but only one may insert the keyed payment.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_payment
    FROM public.inventory_supplier_payments
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      IF v_payment.amount <> p_amount
         OR (p_invoice_id IS NOT NULL AND v_payment.invoice_id <> p_invoice_id)
         OR (p_supplier_id IS NOT NULL AND NOT EXISTS (
           SELECT 1 FROM public.inventory_supplier_invoices
           WHERE id = v_payment.invoice_id AND supplier_id = p_supplier_id
         )) THEN
        RAISE EXCEPTION 'Idempotency key was already used for a different payment'
          USING ERRCODE = '22023';
      END IF;
      SELECT status INTO v_status
      FROM public.inventory_supplier_invoices
      WHERE id = v_payment.invoice_id;
      RETURN jsonb_build_object(
        'id', v_payment.id,
        'invoice_id', v_payment.invoice_id,
        'status', v_status,
        'already_recorded', TRUE
      );
    END IF;
  END IF;

  IF NOT v_invoice_found THEN
    IF p_invoice_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invoice not found' USING ERRCODE = 'P0002';
    END IF;
    RAISE EXCEPTION 'This supplier has no open invoices to pay against' USING ERRCODE = 'P0002';
  END IF;

  IF v_invoice.status NOT IN ('pending', 'partial', 'overdue') THEN
    RAISE EXCEPTION 'Invoice % is %, not payable', v_invoice.id, v_invoice.status
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
  FROM public.inventory_supplier_payments
  WHERE invoice_id = v_invoice.id;

  v_remaining := v_invoice.total_amount - v_paid;
  IF p_amount > v_remaining + 0.004 THEN
    RAISE EXCEPTION 'Payment amount % exceeds remaining invoice balance %', p_amount, v_remaining
      USING ERRCODE = '22003';
  END IF;

  INSERT INTO public.inventory_supplier_payments (
    invoice_id, amount, paid_at, method, reference, notes,
    created_by, created_by_admin_id, idempotency_key
  ) VALUES (
    v_invoice.id, p_amount, COALESCE(p_paid_at, NOW()), p_method,
    p_reference, p_notes, NULL, p_recorded_by_admin_id, p_idempotency_key
  )
  RETURNING * INTO v_payment;

  v_status := CASE
    WHEN v_remaining - p_amount <= 0.004 THEN 'paid'
    ELSE 'partial'
  END;

  UPDATE public.inventory_supplier_invoices
  SET status = v_status, updated_at = NOW()
  WHERE id = v_invoice.id;

  INSERT INTO public.inventory_audit_log (
    table_name, record_id, action, changes, performed_by
  ) VALUES (
    'inventory_supplier_payments',
    v_payment.id,
    'created',
    jsonb_build_object(
      'invoice_id', v_invoice.id,
      'amount', p_amount,
      'paid_at', COALESCE(p_paid_at, v_payment.paid_at),
      'remaining_before', v_remaining,
      'remaining_after', GREATEST(v_remaining - p_amount, 0),
      'recorded_by_admin_id', p_recorded_by_admin_id
    ),
    NULL
  );

  RETURN jsonb_build_object(
    'id', v_payment.id,
    'invoice_id', v_invoice.id,
    'status', v_status,
    'already_recorded', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_supplier_payment(
  UUID, UUID, NUMERIC, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(
  UUID, UUID, NUMERIC, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, TEXT
) TO service_role;

NOTIFY pgrst, 'reload schema';
