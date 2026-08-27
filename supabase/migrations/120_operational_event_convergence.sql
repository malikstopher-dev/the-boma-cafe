-- Batch 4 / M-03, M-05, M-08: atomic chat writes, recipient-scoped
-- notifications, complete order status signals, and transaction-bound order
-- event history.

CREATE OR REPLACE FUNCTION public.create_staff_conversation(
  p_member_ids TEXT[],
  p_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_members TEXT[];
  v_conversation public.staff_conversations%ROWTYPE;
BEGIN
  SELECT array_agg(DISTINCT member_id ORDER BY member_id)
  INTO v_members
  FROM unnest(p_member_ids) AS member_id
  WHERE NULLIF(member_id, '') IS NOT NULL;

  IF COALESCE(array_length(v_members, 1), 0) < 2 THEN
    RAISE EXCEPTION 'At least 2 member_ids required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(array_to_string(v_members, '|'), 0));

  SELECT c.* INTO v_conversation
  FROM public.staff_conversations AS c
  WHERE ARRAY(
    SELECT m.user_id
    FROM public.staff_conversation_members AS m
    WHERE m.conversation_id = c.id
    ORDER BY m.user_id
  ) = v_members
  LIMIT 1;

  IF FOUND THEN
    RETURN to_jsonb(v_conversation);
  END IF;

  INSERT INTO public.staff_conversations (title, is_group)
  VALUES (NULLIF(p_title, ''), array_length(v_members, 1) > 2)
  RETURNING * INTO v_conversation;

  INSERT INTO public.staff_conversation_members (conversation_id, user_id)
  SELECT v_conversation.id, member_id FROM unnest(v_members) AS member_id;

  RETURN to_jsonb(v_conversation);
END;
$$;

REVOKE ALL ON FUNCTION public.create_staff_conversation(TEXT[], TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_conversation(TEXT[], TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.send_staff_message(
  p_conversation_id UUID,
  p_sender_id TEXT,
  p_sender_aliases TEXT[],
  p_message TEXT DEFAULT NULL,
  p_message_type TEXT DEFAULT 'text',
  p_voice_url TEXT DEFAULT NULL,
  p_voice_duration NUMERIC DEFAULT NULL,
  p_admin_override BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_message public.staff_messages%ROWTYPE;
BEGIN
  IF NOT p_admin_override AND NOT EXISTS (
    SELECT 1 FROM public.staff_conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = ANY(p_sender_aliases)
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.staff_messages (
    conversation_id, sender_id, message, message_type, voice_url, voice_duration
  ) VALUES (
    p_conversation_id, p_sender_id, NULLIF(p_message, ''), COALESCE(NULLIF(p_message_type, ''), 'text'),
    NULLIF(p_voice_url, ''), p_voice_duration
  ) RETURNING * INTO v_message;

  INSERT INTO public.staff_notifications (user_id, type, title, message, metadata)
  SELECT
    member.user_id,
    'new_message',
    'New Message',
    COALESCE(NULLIF(p_message, ''), 'Voice message'),
    jsonb_build_object('conversation_id', p_conversation_id, 'sender_id', p_sender_id, 'message_id', v_message.id)
  FROM public.staff_conversation_members AS member
  WHERE member.conversation_id = p_conversation_id
    AND NOT (member.user_id = ANY(p_sender_aliases));

  INSERT INTO public.realtime_events (event_name, table_name, entity_id, scope_type, scope_id)
  SELECT 'chat.notification', 'staff_messages', v_message.id, 'recipient', member.user_id
  FROM public.staff_conversation_members AS member
  WHERE member.conversation_id = p_conversation_id
    AND NOT (member.user_id = ANY(p_sender_aliases));

  RETURN to_jsonb(v_message);
END;
$$;

REVOKE ALL ON FUNCTION public.send_staff_message(UUID, TEXT, TEXT[], TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_staff_message(UUID, TEXT, TEXT[], TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.emit_staff_notification_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.realtime_events (event_name, table_name, entity_id, scope_type, scope_id)
  VALUES ('notification.new', 'staff_notifications', NEW.id, 'recipient', NEW.user_id);
  DELETE FROM public.realtime_events WHERE created_at < now() - interval '24 hours';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_realtime_notification_new ON public.staff_notifications;
CREATE TRIGGER trg_realtime_notification_new
  AFTER INSERT ON public.staff_notifications
  FOR EACH ROW EXECUTE FUNCTION public.emit_staff_notification_event();

CREATE OR REPLACE FUNCTION public.emit_order_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_event TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  v_event := CASE NEW.status
    WHEN 'confirmed' THEN 'order.confirmed'
    WHEN 'preparing' THEN 'order.preparing'
    WHEN 'ready' THEN 'order.ready'
    WHEN 'served' THEN 'order.completed'
    WHEN 'completed' THEN 'order.completed'
    WHEN 'cancelled' THEN 'order.cancelled'
    WHEN 'rejected' THEN 'order.rejected'
    ELSE NULL
  END;
  IF v_event IS NOT NULL THEN
    INSERT INTO public.realtime_events (event_name, table_name, entity_id, scope_type, scope_id)
    VALUES (v_event, 'orders', NEW.id, 'station', NEW.station);
    DELETE FROM public.realtime_events WHERE created_at < now() - interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_event_actor TEXT;

CREATE OR REPLACE FUNCTION public.audit_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.order_events (order_id, event_type, to_status, created_by, metadata)
  VALUES (
    NEW.id, 'ORDER_CREATED', NEW.status, COALESCE(NULLIF(NEW.last_event_actor, ''), 'system'),
    jsonb_build_object('order_ref', NEW.order_ref, 'total', NEW.total)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_event_type TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  v_event_type := CASE NEW.status
    WHEN 'confirmed' THEN 'ORDER_CONFIRMED'
    WHEN 'preparing' THEN 'ORDER_PREPARING'
    WHEN 'packing' THEN 'ORDER_PACKING'
    WHEN 'ready' THEN 'ORDER_READY'
    WHEN 'served' THEN 'ORDER_COMPLETED'
    WHEN 'completed' THEN 'ORDER_COMPLETED'
    WHEN 'cancelled' THEN 'ORDER_CANCELLED'
    WHEN 'rejected' THEN 'ORDER_REJECTED'
    ELSE 'ORDER_UPDATED'
  END;
  INSERT INTO public.order_events (order_id, event_type, from_status, to_status, created_by, metadata)
  VALUES (NEW.id, v_event_type, OLD.status, NEW.status, COALESCE(NULLIF(NEW.last_event_actor, ''), 'system'), '{}'::jsonb);
  NEW.last_event_actor := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_order_created ON public.orders;
CREATE TRIGGER trg_audit_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_order_created();

DROP TRIGGER IF EXISTS trg_audit_order_status_change ON public.orders;
CREATE TRIGGER trg_audit_order_status_change
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_order_status_change();

CREATE OR REPLACE FUNCTION public.cancel_public_order(p_order_id UUID, p_expected_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found'); END IF;
  IF v_order.status IS DISTINCT FROM p_expected_status THEN
    RETURN jsonb_build_object('outcome', 'conflict', 'status', v_order.status);
  END IF;
  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('outcome', 'not_allowed', 'status', v_order.status);
  END IF;
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('outcome', 'paid', 'status', v_order.status);
  END IF;
  UPDATE public.orders SET status = 'cancelled', last_event_actor = 'customer'
  WHERE id = v_order.id AND status = p_expected_status;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'conflict'); END IF;
  RETURN jsonb_build_object('outcome', 'cancelled', 'status', 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_public_order(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_public_order(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
