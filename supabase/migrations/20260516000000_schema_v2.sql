-- v2 schema: replace placeholder notification_preferences with correct shape,
-- add user_profiles / teams / players, and internal schema for poller dedup.

-- ── Internal schema (not exposed via PostgREST) ──────────────────────────────

CREATE SCHEMA IF NOT EXISTS internal;

CREATE TABLE internal.seen_events (
  id         bigserial PRIMARY KEY,
  game_id    int  NOT NULL,
  event_key  text NOT NULL,
  event_type text NOT NULL,
  seen_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, event_key)
);

-- ── Public tables ─────────────────────────────────────────────────────────────

CREATE TABLE public.user_profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ntfy_topic text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own"   ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "insert own" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "update own" ON public.user_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete own" ON public.user_profiles FOR DELETE USING (auth.uid() = id);

-- ── Teams ─────────────────────────────────────────────────────────────────────

CREATE TABLE public.teams (
  id         int  PRIMARY KEY,  -- HockeyTech team id, stable
  name       text NOT NULL,
  city       text NOT NULL,
  code       text NOT NULL,
  nickname   text NOT NULL,
  logo_url   text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read; only the service role (roster-sync worker) writes.
CREATE POLICY "authenticated read" ON public.teams FOR SELECT TO authenticated USING (true);

-- ── Players ───────────────────────────────────────────────────────────────────

CREATE TABLE public.players (
  id              int  PRIMARY KEY,  -- HockeyTech player_id, stable
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  position        text,              -- "F", "D", "G"
  jersey_number   text,
  shoots          text,
  height          text,
  weight          text,
  birthdate       date,
  birthtown       text,
  birthprov       text,
  birthcountry    text,
  image_url       text,
  current_team_id int REFERENCES public.teams(id),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read" ON public.players FOR SELECT TO authenticated USING (true);

-- ── Notification preferences ──────────────────────────────────────────────────

-- Drop the placeholder table from the initial migration.
DROP TABLE IF EXISTS public.notification_preferences;

CREATE TABLE public.notification_preferences (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id      int         NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  event_type     text        NOT NULL CHECK (event_type IN (
                               'goal', 'assist', 'quality_shot',
                               'hit_laid', 'hit_received', 'penalty'
                             )),
  active         bool        NOT NULL DEFAULT true,
  custom_message text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, player_id, event_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own"   ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own" ON public.notification_preferences FOR DELETE USING (auth.uid() = user_id);
