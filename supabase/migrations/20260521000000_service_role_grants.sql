-- The roster-sync and poller workers use the secret key (service_role) to write
-- reference data. service_role bypasses RLS but still needs table-level privileges.
GRANT SELECT, INSERT, UPDATE ON public.teams TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.players TO service_role;
