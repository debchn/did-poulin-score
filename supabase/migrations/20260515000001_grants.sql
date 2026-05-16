-- PostgREST requires explicit GRANTs in addition to RLS policies.
-- RLS controls which rows; GRANTs control whether the role can touch the table at all.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT ON public.players TO authenticated;
