# Did Poulin Score?

A web app that notifies users via [ntfy](https://ntfy.sh) when specific PWHL events happen (e.g. "notify me when Marie-Philip Poulin scores a goal").

## Owner context

The owner is a frontend developer using this project to brush up on React (coming from two years of Angular) for interviews. Code quality, clean architecture, and "things I can point to in an interview" matter. Explain trade-offs when they come up.

## Stack

- **Language:** TypeScript end-to-end.
- **Frontend:** Vite + React + TypeScript, deployed to **Cloudflare Pages**.
- **Database & Auth:** **Supabase** (Postgres + Supabase Auth with Google OAuth). Row Level Security handles authorization. The frontend talks directly to Postgres via the Supabase JS client for CRUD on user notification preferences. No custom API server.
- **Poller:** A **Cloudflare Worker** with a Cron Trigger. Polls the HockeyTech PWHL API during games, diffs against previous state (stored in Workers KV or a Supabase table), and POSTs to each subscribed user's ntfy topic when their watched event fires.

## Hard constraints

- **No credit card required** on any service used. Cloudflare and Supabase free tiers both qualify; Render, Fly, Railway, Vercel-with-DB-addons do not (or have caveats). Don't suggest stack changes that violate this without flagging it explicitly.
- **Infra as code / minimize ClickOps.** Everything possible lives in the repo:
  - Supabase schema, RLS policies, and auth provider config in `supabase/migrations/*.sql` and `supabase/config.toml` (referencing secrets via `env(...)`).
  - Cloudflare Worker config (cron triggers, KV bindings, env vars) in `wrangler.toml`.
  - Cloudflare Pages build config also in `wrangler.toml` or equivalent.
  - GitHub Actions workflow that runs `supabase db push` and `wrangler deploy` on merge to `main`.
- Only secret **values** live outside the repo (GitHub Actions secrets, `supabase secrets set`, `wrangler secret put`). Their **references** are in committed config.

## Security model (read this before writing any migration)

The frontend talks to Postgres directly via the Supabase JS client. The schema, table names, column names, and publishable key are **all publicly visible in the Network tab** — this is by design and unavoidable with this architecture. Security relies entirely on Row Level Security being correct. The mental model: assume an attacker has the publishable key, knows the schema, and can craft any request. With that assumption, can they do anything bad? If yes, the policies are wrong.

Rules, non-negotiable:

- **Every table in the `public` schema has RLS enabled.** A migration that creates a table without `ALTER TABLE foo ENABLE ROW LEVEL SECURITY` is incomplete and must be rejected in review. If a table genuinely should not be exposed to PostgREST at all (e.g. the poller's game state cache), put it in a separate schema like `internal` or `private` that isn't exposed to the API, rather than relying on RLS alone.
- **Write separate policies for SELECT, INSERT, UPDATE, DELETE.** Do not use `FOR ALL`. Every INSERT and UPDATE policy needs a `WITH CHECK` clause that prevents users from writing rows claiming a different `user_id` than `auth.uid()`. Pattern to follow:
  ```sql
  CREATE POLICY "read own" ON t FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "insert own" ON t FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "update own" ON t FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "delete own" ON t FOR DELETE USING (auth.uid() = user_id);
  ```
- **The secret key bypasses RLS entirely.** It belongs only in the Cloudflare Worker (via `wrangler secret put SUPABASE_SECRET_KEY`). It must never appear in the frontend bundle, never in a `VITE_*` env var (Vite inlines those into the client), never in a public env var of any kind. The frontend only ever uses the publishable key.
- **Internal tables go in a non-public schema.** The poller's `game_state_cache` (or equivalent) lives in an `internal` schema. The Worker uses the secret key to access it. This is defense in depth: even if RLS were wrong, PostgREST wouldn't expose the schema in the first place.
- **Rate limiting.** Supabase Auth endpoints have configurable rate limits declared in `supabase/config.toml` — set sensible values there. PostgREST data endpoints don't have built-in per-user rate limits; for v1, RLS plus the free-tier bandwidth ceiling is acceptable. If abuse becomes real, the path forward is Cloudflare in front of the Supabase domain with WAF rules — flag that as a future step, don't build it preemptively.

## HockeyTech PWHL API (observed, undocumented)

Captured from the official PWHL stats site during a live game on 2026-05-10. Sample responses are in `docs/hockeytech-samples/`.

**Base URL & auth:**
```
https://lscluster.hockeytech.com/feed/index.php
  ?feed=statviewfeed
  &view=<endpoint>
  &game_id=<int>
  &key=446521baf8c38984
  &client_code=pwhl
  &lang=en
  &league_id=         (always blank)
  &site_id=0          (sometimes present)
  &callback=<jsonp>   (only when calling as JSONP)
```
The `key` value is the same one the public PWHL site uses. Calling server-side from a Cloudflare Worker means we can skip the JSONP wrapper entirely and request JSON directly (omit the `callback` param, then `JSON.parse` the response body — or strip the `angular.callbacks._XX(` wrapper if it's still returned).

**The official site polls every 30 seconds.** Match that cadence, or go a bit faster.

**Three endpoints (view= values):**

1. **`gameSummary`** — current score, period stats, all goals so far, status fields. Top-level keys: `details`, `homeTeam`, `visitingTeam`, `periods[]`, `referees`, etc. The `details` object has `started` ("1"/"0"), `final` ("1"/"0"), and `status` ("Unofficial Final", etc.) — use these to gate the poller (only poll games where `started === "1"` and `final === "0"`). Goals live under `periods[].goals[]`.

2. **`gameCenterPlayByPlay`** — array of event objects, much richer than gameSummary. Event types observed: `goal`, `shot`, `hit`, `blocked_shot`, `penalty`, `faceoff`, `goalie_change`. **This is the primary endpoint for notifications** — it has shots, hits, and penalties which gameSummary doesn't expose as events.

3. **`teamsForSeason`** — team list with IDs, names, codes, logos. Returns teams active in the current season segment, so during playoffs it returns only the remaining teams. The captured sample is from the 2026 semifinals — 4 teams (Boston, Minnesota, Montréal, Ottawa). The full 2025–26 regular season has 8 teams (the four above plus New York, Seattle, Toronto, Vancouver), and the 2026–27 season expands to 11 with the addition of Detroit, Hamilton, and Las Vegas. **Don't hard-code the team list from the sample, and don't assume the count is stable across seasons or even within a season.** Refetch when the season changes; refetching every poll is also fine — the response is small and almost certainly cached upstream.

**Goal event shape (from both `gameSummary` and `gameCenterPlayByPlay`):**
```json
{
  "game_goal_id": "1651",   // stable, same across both endpoints — USE AS DEDUP KEY
  "team": { "id": 5, "abbreviation": "OTT", ... },
  "period": { "id": "1", "longName": "1st" },
  "time": "6:38",
  "scoredBy": { "id": 241, "firstName": "Sarah", "lastName": "Wozniewicz", ... },
  "assists": [ { "id": 240, ... }, { "id": 115, ... } ],
  "properties": {
    "isPowerPlay": "1", "isShortHanded": "0", "isEmptyNet": "0",
    "isPenaltyShot": "0", "isInsuranceGoal": "0", "isGameWinningGoal": "0"
  }
}
```
Note: `properties.*` values are string `"0"`/`"1"`, not booleans. Parse accordingly.

**Penalty event shape:** has `game_penalty_id` — stable dedup key like goals. Includes `takenBy`, `servedBy`, `description` (e.g. "Boarding"), `minutes`, `isPowerPlay`.

**Shot event shape:** has `shooter`, `goalie`, `time`, `period`, `shotType`, `xLocation`, `yLocation`, `isGoal`. **No stable ID.** If we want shot notifications, dedup by (game_id, period.id, time, shooter.id) as a composite key — imperfect but the only option.

**Diff strategy for the poller:**
- For goals and penalties: track seen `game_goal_id` / `game_penalty_id` per game in Workers KV or a Postgres `internal.seen_events` table. On each poll, set-diff against the previous list; new IDs fire notifications.
- For shots/hits: composite key as above.
- Player IDs are stable across the season — use `scoredBy.id` as the foreign key in `notification_preferences`, not the name. Names can disambiguate badly (multiple players named Sarah).

**Known unknowns that remain:**
- How quickly events appear in the feed after they happen on the ice (target sub-minute end-to-end, but unverified).
- Whether the API returns 4xx/5xx during scheduled maintenance or between games.
- Whether goals can be retroactively edited (overturned reviews) — the poller should treat a `game_goal_id` that disappears from a later poll as a "goal overturned" event, possibly worth its own notification type.

## Other known unknowns

- Supabase free tier **pauses projects after 7 days of inactivity**. The cron Worker hitting the DB keeps it warm during the PWHL season, but offseason this will pause. Note this in the README.
- Cloudflare Workers free tier has a 10ms **CPU** limit per invocation, but wall-clock time waiting on `fetch` doesn't count. The poller fanning out HTTP requests is fine; heavy in-process computation is not.

## What was considered and rejected

- **Epic Stack** (the owner downloaded this first). Rejected because it's opinionated around Fly.io + LiteFS, and Fly now requires a credit card. Unwinding Epic Stack's deployment assumptions is more work than starting clean.
- **Render, Railway, Fly.io.** All now require a card or run on consumable trial credits as of 2026.
- **Express + a separate DB host.** Workable but more moving parts than necessary; Supabase + Worker covers it with less code.

## Working style

- Ask before making non-obvious architectural decisions. Don't silently introduce new dependencies or services.
- When something requires a one-time dashboard step (creating the Supabase project, generating an OAuth app in Google Cloud, generating a Cloudflare API token), document it in `SETUP.md` rather than burying it in chat.
- Prefer SQL migrations over ad-hoc dashboard schema changes. Every schema change is a new timestamped file in `supabase/migrations/`.
- Keep `wrangler.toml` and `supabase/config.toml` readable — they're part of the interview story.
