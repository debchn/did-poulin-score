# Product Vision

## What is this?

A personal notification app for PWHL fans. Users subscribe to specific events for specific players and receive push notifications via [ntfy.sh](https://ntfy.sh) when those events happen during a live game.

The name "Did Poulin Score?" reflects the original use case: knowing the moment Marie-Philip Poulin scores without watching the game.

---

## User flows

### Authentication

- Sign in with Google (Supabase Auth + Google OAuth).
- No email/password option.

### Dashboard — first-time setup

- After signing in, user is prompted to enter their **ntfy.sh topic string** (a private string they choose, e.g. `my-secret-pwhl-alerts-abc123`).
- This topic is stored in their profile. It is the target for all their notifications.
- User is shown how to subscribe to this topic in the ntfy app.

### Player browsing

Single flat list of all active PWHL players across all teams, with client-side search by name. Shows: player name, jersey number, position, team.

### Player detail page

Clicking a player opens their detail page. From here:

- Player bio shown: name, team, position, jersey number, hometown.
- **Event subscriptions** — a list of checkboxes, one per subscribable event type (see below).
- Checking a box subscribes to that event for that player.
- Each subscription has an optional **custom message** field. If left blank, the default message is sent (see defaults below).

### Notification message defaults

| Event | Default message |
|-------|----------------|
| Goal | `{first_name} {last_name} scored!` |
| Assist | `{first_name} {last_name} got an assist!` |
| Quality shot (no goal) | `{first_name} {last_name} had a quality shot!` |
| Hit (laid) | `{first_name} {last_name} laid a hit!` |
| Hit (received) | `{first_name} {last_name} took a hit!` |
| Penalty (taken) | `{first_name} {last_name} took a penalty: {penalty_type}` |

Custom messages can reference `{first_name}`, `{last_name}`, `{team}`, and `{event}` as template variables.

---

## Subscribable event types

Derived from what the HockeyTech API exposes per-player in the play-by-play feed:

| Event | API source | Notes |
|-------|-----------|-------|
| Goal | `goal` event, `scoredBy.id` | Stable `game_goal_id` dedup key |
| Assist | `goal` event, `assists[].id` | Same event, different player match |
| Quality shot (non-goal) | `shot` event, `shooter.id` | `shotQuality` = `"Quality on net"` or `"Quality blocked"`. No stable ID; dedup by composite key (period, time, shooter.id). |
| Hit (laid) | `hit` event, `hitter.id` | TBD — confirm field name from API sample |
| Hit (received) | `hit` event, `hittee.id` | TBD — confirm field name from API sample |
| Penalty taken | `penalty` event, `takenBy.id` | Stable `game_penalty_id` dedup key |
| Penalty by type | same as above | Sub-option: filter to specific `description` values (e.g. "Boarding") |

Observed `shotQuality` values from the play-by-play feed: `"Quality goal"`, `"Quality on net"`, `"Quality blocked"`, `"Non quality goal"`, `"Non quality on net"`, `"Non quality blocked"`. Goals are handled separately via the `goal` event — the shot subscription only fires on `"Quality on net"` and `"Quality blocked"`.

---

## Scope by milestone

### Alpha
- Auth (Google sign-in) + ntfy topic setup.
- Single flat player list with client-side search.
- Player detail page with event subscription checkboxes + optional custom message.
- Poller: goals, assists, quality shots, penalties. ntfy delivery.

### Beta
- **By-team browsing** — team list → roster → player detail.

### v1
- **Team-level subscriptions** — e.g. "notify me when Ottawa scores", "notify me when any Ottawa player takes a penalty". Scope TBD.

### v2
- Move beyond ntfy.sh — native push via a dedicated app.

---

## Permanently out of scope

- Multiple ntfy topics per user (one topic, all subscriptions).
- Admin tooling or moderation layer.
