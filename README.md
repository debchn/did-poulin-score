# Did Poulin Score?

Get notified the moment your favourite PWHL player does something worth knowing about — goals, assists, shots, hits, penalties — delivered to your phone via [ntfy.sh](https://ntfy.sh).

## Repo layout

```
frontend/          Vite + React app (Cloudflare Pages)
workers/
  poller/          Cron worker — polls HockeyTech API during live games, fires notifications
  roster-sync/     Cron worker — syncs team + player data weekly from HockeyTech
supabase/
  migrations/      SQL migrations (applied automatically on merge to main)
  config.toml      Auth config, rate limits
docs/
  product.md       Product vision and scope by milestone
  hockeytech-samples/  Raw API response samples + endpoint reference
```

## Local development

### Prerequisites

- Node 22+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/): `npm i -g wrangler`
- [Supabase CLI](https://supabase.com/docs/guides/cli): `brew install supabase/tap/supabase`
- Docker (for local Supabase)

### 1. Start local Supabase

```bash
supabase start
```

Spins up Postgres + Auth + PostgREST locally. On first run it applies all migrations automatically. Dashboard at `http://localhost:54323`.

Grab the local keys printed on startup (or run `supabase status`):
- **API URL** — `http://localhost:54321`
- **anon key** — use as `VITE_SUPABASE_PUBLISHABLE_KEY`
- **service_role key** — use as `SUPABASE_SECRET_KEY` in workers

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # then fill in values
npm install
npm run dev
```

`.env.local`:
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from supabase status>
```

App runs at `http://localhost:5173`.

### 3. Workers

Each worker reads from a `.dev.vars` file (gitignored):

```bash
cd workers/roster-sync       # or workers/poller
cp .dev.vars.example .dev.vars   # then fill in values
```

`.dev.vars`:
```
SUPABASE_URL=http://localhost:54321
SUPABASE_SECRET_KEY=<service_role key from supabase status>
```

**Run a worker:**
```bash
npx wrangler dev --test-scheduled
```

**Trigger the cron manually** (in a second terminal):
```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

Run `roster-sync` first to populate the `players` and `teams` tables before starting the frontend.

### 4. Tests

```bash
# Frontend unit tests (Vitest)
cd frontend && npm test

# Worker unit tests (Vitest)
cd workers/poller && npm test
```

## Deployment

Handled by GitHub Actions on merge to `main`:

1. Supabase migrations pushed (`supabase db push`)
2. `roster-sync` worker deployed
3. `poller` worker deployed
4. Frontend built and deployed to Cloudflare Pages

See `SETUP.md` for the one-time secrets and account setup required before the first deploy.

## Offseason note

Supabase free tier pauses projects after 7 days of inactivity. During the PWHL season the poller cron keeps the DB warm. In the offseason, resume the project manually from the Supabase dashboard.
