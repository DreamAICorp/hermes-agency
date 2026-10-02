-- Website chats now record their contact on conversations.contact_id, set when
-- the chat starts or when its visitor first gives a name and email or phone.
-- Contact pages count conversations by contact_id only, so a widget visitor
-- that is later linked to someone else never brings older chats with it.
--
-- widget_visitors.contact_linked_at records when the visitor was last linked.
-- Deleting the contact clears contact_id but keeps this time, so a later link
-- only takes the visitor's unassigned chats that started after it.
--
-- Backfill, for rows that exist before this change:
--   1. Visitors linked to a contact get contact_linked_at = now().
--   2. Unlinked visitors that gave an email or submitted the lead form were
--      linked to a contact that has since been deleted. They also get
--      contact_linked_at = now(), so their existing chats are never handed to
--      whoever the visitor links to next.
--   3. Unassigned conversations of linked visitors get the visitor's contact.
-- Every statement only fills NULL columns, so no conversation that already has
-- a contact is reassigned and running this file again changes nothing.
--
-- The backfill needs a role that sees every row. Under row-level security the
-- updates would match nothing, so any other role skips it with a notice.
-- Production migrates as the table owner's superuser.

ALTER TABLE public.widget_visitors
  ADD COLUMN IF NOT EXISTS contact_linked_at timestamptz;

DO $$
DECLARE
  linked integer;
  sealed integer;
  attributed integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls)) THEN
    RAISE NOTICE 'Skipping the website chat contact backfill: % is subject to row-level security.', current_user;
    RETURN;
  END IF;

  UPDATE public.widget_visitors
  SET contact_linked_at = now()
  WHERE contact_id IS NOT NULL
    AND contact_linked_at IS NULL;
  GET DIAGNOSTICS linked = ROW_COUNT;

  UPDATE public.widget_visitors
  SET contact_linked_at = now()
  WHERE contact_id IS NULL
    AND contact_linked_at IS NULL
    AND (email IS NOT NULL OR metadata->>'submittedLead' = 'true');
  GET DIAGNOSTICS sealed = ROW_COUNT;

  UPDATE public.conversations conversation
  SET contact_id = visitor.contact_id
  FROM public.widget_visitors visitor
  WHERE conversation.widget_visitor_id = visitor.id
    AND conversation.business_id = visitor.business_id
    AND conversation.contact_id IS NULL
    AND visitor.contact_id IS NOT NULL;
  GET DIAGNOSTICS attributed = ROW_COUNT;

  RAISE NOTICE 'Website chat contacts: % linked visitors stamped, % previously linked visitors sealed, % conversations attributed.', linked, sealed, attributed;
END
$$;
