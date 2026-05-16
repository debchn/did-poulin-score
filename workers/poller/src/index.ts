import { fetchScorebar, fetchPlayByPlay, isLiveGame } from "./hockeytech";
import { extractEvents, formatDefaultMessage } from "./events";
import type { EventType } from "./events";
import { sendNotification } from "./notify";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
}

interface ActivePref {
  player_id: number;
  event_type: EventType;
  custom_message: string | null;
  ntfy_topic: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(run(env));
  },
};

async function run(env: Env): Promise<void> {
  const rest = `${env.SUPABASE_URL}/rest/v1`;
  const serviceHeaders = {
    apikey: env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };

  async function get<T>(path: string, params: Record<string, string> = {}, schema = "public"): Promise<T> {
    const q = new URLSearchParams(params);
    const headers: Record<string, string> = { ...serviceHeaders };
    if (schema !== "public") headers["db-schema"] = schema;
    const res = await fetch(`${rest}/${path}?${q}`, { headers });
    if (!res.ok) throw new Error(`Supabase GET ${path} ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async function upsertSeenEvents(rows: { game_id: number; event_key: string; event_type: string }[]): Promise<void> {
    if (rows.length === 0) return;
    const res = await fetch(`${rest}/seen_events?on_conflict=game_id,event_key`, {
      method: "POST",
      headers: {
        ...serviceHeaders,
        "Prefer": "resolution=ignore-duplicates",
        "db-schema": "internal",
      },
      body: JSON.stringify(rows),
    });
    if (!res.ok) console.error(`seen_events upsert failed: ${res.status} ${await res.text()}`);
  }

  console.log("poller started");

  // ── 1. Find live games ───────────────────────────────────────────────────────

  const scorebar = await fetchScorebar();
  const liveGames = scorebar.filter(isLiveGame);
  console.log(`live games: ${liveGames.length}`);

  if (liveGames.length === 0) return;

  // ── 2. Load all active notification preferences upfront ──────────────────────
  // Join user_profiles to get ntfy_topic in one query.

  const rawPrefs = await get<Array<{
    player_id: number;
    event_type: string;
    custom_message: string | null;
    user_profiles: { ntfy_topic: string } | null;
  }>>("notification_preferences", {
    select: "player_id,event_type,custom_message,user_profiles(ntfy_topic)",
    active: "eq.true",
  });

  const prefs: ActivePref[] = rawPrefs
    .filter((p) => p.user_profiles?.ntfy_topic)
    .map((p) => ({
      player_id: p.player_id,
      event_type: p.event_type as EventType,
      custom_message: p.custom_message,
      ntfy_topic: p.user_profiles!.ntfy_topic,
    }));

  console.log(`active prefs loaded: ${prefs.length}`);

  if (prefs.length === 0) return;

  // ── 3. Process each live game ────────────────────────────────────────────────

  for (const game of liveGames) {
    const gameId = parseInt(game.ID, 10);

    // Load already-seen event keys for this game
    const seenRows = await get<Array<{ event_key: string }>>(
      "seen_events",
      { select: "event_key", game_id: `eq.${gameId}` },
      "internal"
    );
    const seen = new Set(seenRows.map((r) => r.event_key));

    // Fetch and extract all events from the play-by-play
    const pbp = await fetchPlayByPlay(game.ID);
    const allEvents = extractEvents(pbp);

    // Filter to events we haven't seen yet
    const newEvents = allEvents.filter((e) => !seen.has(e.eventKey));
    console.log(`game ${gameId}: ${allEvents.length} events, ${newEvents.length} new`);

    if (newEvents.length === 0) continue;

    // ── 4. Match new events against prefs and notify ─────────────────────────

    const notifications: Promise<void>[] = [];

    for (const event of newEvents) {
      const matches = prefs.filter(
        (p) => p.player_id === event.playerId && p.event_type === event.eventType
      );

      for (const pref of matches) {
        const message =
          pref.custom_message ??
          formatDefaultMessage(event.playerFirstName, event.playerLastName, event.eventType);
        notifications.push(sendNotification(pref.ntfy_topic, message));
      }
    }

    // Fire notifications and mark events seen concurrently
    await Promise.all([
      ...notifications,
      upsertSeenEvents(
        newEvents.map((e) => ({
          game_id: gameId,
          event_key: e.eventKey,
          event_type: e.eventType,
        }))
      ),
    ]);
  }

  console.log("poller done");
}
