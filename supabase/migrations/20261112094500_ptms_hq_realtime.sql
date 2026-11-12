-- Enable live PTMS Home updates for existing owner-scoped records.
-- RLS policies remain the authorization boundary for every Realtime change.
DO $$
DECLARE
  target_table text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'Supabase Realtime publication is not available in this project.';
  END IF;

  FOREACH target_table IN ARRAY ARRAY['pruden_tasks', 'pruden_approvals', 'pruden_audit_events'] LOOP
    IF to_regclass(format('public.%I', target_table)) IS NULL THEN
      RAISE EXCEPTION 'Required PTMS relation public.% is missing.', target_table;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = target_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target_table);
    END IF;
  END LOOP;
END $$;
