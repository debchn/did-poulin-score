# One-time setup

Do these steps once. Each section ends with which secret to store where.

## Prerequisites

Install the Supabase CLI (needed for secrets, migrations, and config push):

```bash
brew install supabase/tap/supabase
supabase login
```

`supabase login` opens a browser to authenticate your account.

---

## 1. Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Name it `did-poulin-score`. Pick a strong DB password — save it now, you won't see it again.
3. Note the **Project Reference ID** (20-char string in the URL: `app.supabase.com/project/<ref>`).
4. Go to **Account → Access tokens** → **Generate new token** → name it `github-actions`.

Secrets to store:

| Secret | Where | Value |
|--------|-------|-------|
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions | The token you just generated |
| `SUPABASE_PROJECT_REF` | GitHub Actions | 20-char project ref from the URL |
| `SUPABASE_DB_PASSWORD` | GitHub Actions | DB password you set at project creation |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | GitHub Actions | **Settings → API → Publishable key** (`sb_publishable_...`) |

---

## 2. Cloudflare account + API token

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → create a free account if needed.
2. Note your **Account ID** (right sidebar on the main dashboard, or any zone page).
3. **My Profile → API Tokens → Create Token**.
   - Use the **"Edit Cloudflare Workers"** template, then also add **Cloudflare Pages: Edit** permission.
   - Set TTL to "No expiry" or however long you like.

4. Create the Cloudflare Pages project (one-time only — after this, the workflow handles deploys):
   ```bash
   cd frontend
   npx wrangler pages project create did-poulin-score --production-branch=main
   ```

5. Set the Worker secret (run once; the workflow handles redeploys but not secret rotation):
   ```bash
   cd workers/poller
   echo "YOUR_SECRET_KEY" | npx wrangler secret put SUPABASE_SECRET_KEY
   ```
   Get the secret key from Supabase → **Settings → API → Secret key** (`sb_secret_...`).

   > **Never** put the secret key in `wrangler.toml` `[vars]`, a `VITE_*` env var, or anywhere it ends up in the frontend bundle or the repo. Workers secrets are encrypted at rest and never exposed to clients.

Secrets to store:

| Secret | Where | Value |
|--------|-------|-------|
| `CLOUDFLARE_API_TOKEN` | GitHub Actions | Token you just created |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions | Account ID from dashboard |

---

## 3. Google OAuth app

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project (or reuse one).
2. **APIs & Services → OAuth consent screen** → External → fill in app name + your email.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret**.

---

## 4. Link Supabase config (push auth provider config to the project)

`env(...)` in `config.toml` reads from your **local shell environment** at push time. Pass the values inline:

```bash
supabase link --project-ref YOUR_PROJECT_REF
GOOGLE_CLIENT_ID=your-client-id GOOGLE_CLIENT_SECRET=your-client-secret supabase config push --project-ref YOUR_PROJECT_REF
```

No warnings = success. Verify under Authentication → Providers → Google in the dashboard that the Client ID is populated.

This activates Google sign-in on your Supabase project.

---

## 6. GitHub Actions secrets summary

Add all of the following at **github.com → your repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Description |
|-------------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token |
| `SUPABASE_PROJECT_REF` | 20-char project ref |
| `SUPABASE_DB_PASSWORD` | DB password from project creation |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) from Supabase Settings → API |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

> `SUPABASE_SECRET_KEY` goes directly into the Worker via `wrangler secret put` — **not** into GitHub Actions.
> The OAuth client credentials are passed as local shell env vars when running `supabase config push` — **not** into GitHub Actions and **not** via `supabase secrets set`.

---

## Offseason note

Supabase free tier pauses projects after 7 days of inactivity. During the PWHL season the cron Worker hitting the DB keeps it warm. In the offseason, either resume the project manually or upgrade to Pro to disable auto-pause.
