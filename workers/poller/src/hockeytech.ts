const BASE = "https://lscluster.hockeytech.com/feed/index.php";
const KEY = "446521baf8c38984";
const CLIENT = "pwhl";

function url(params: Record<string, string | number>): string {
  const q = new URLSearchParams({
    key: KEY,
    client_code: CLIENT,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  return `${BASE}?${q}`;
}

async function fetchJson<T>(u: string): Promise<T> {
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HockeyTech ${res.status}: ${u}`);
  return res.json() as Promise<T>;
}

// ── Scorebar ──────────────────────────────────────────────────────────────────

export interface ScorebarGame {
  ID: string;
  GameStatus: string; // "1" = scheduled, "2" = in-progress, "3" = unofficial final, "4" = final
  HomeID: string;
  VisitorID: string;
  HomeGoals: string;
  VisitorGoals: string;
  Period: string;
  GameClock: string;
}

export async function fetchScorebar(): Promise<ScorebarGame[]> {
  const data = await fetchJson<{ SiteKit: { Scorebar: ScorebarGame[] } }>(
    url({ feed: "modulekit", view: "scorebar", numberofdaysback: 0, numberofdaysahead: 0 })
  );
  return data.SiteKit.Scorebar;
}

// GameStatus "2" = in progress. "1" = not yet started. "4" = final.
// "3" = unofficial final (can still be updated). Exclude 1 and 4.
export function isLiveGame(game: ScorebarGame): boolean {
  return game.GameStatus === "2" || game.GameStatus === "3";
}

// ── Play-by-play ──────────────────────────────────────────────────────────────

export interface PxpGoal {
  event: "goal";
  id: string;
  goal_player_id: string;
  assist1_player_id: string | null;
  assist2_player_id: string | null;
  period_id: string;
  time_formatted: string;
  goal_scorer: PxpPlayer;
  assist1_player?: PxpPlayer;
  assist2_player?: PxpPlayer;
}

export interface PxpShot {
  event: "shot";
  id: string;
  player_id: string;
  period_id: string;
  time_formatted: string;
  shot_quality_description: string;
  game_goal_id: string; // non-empty if this shot was also a goal
  player: PxpPlayer;
}

export interface PxpBlockedShot {
  event: "blocked_shot";
  id: string;
  player_id: string;
  period_id: string;
  time: string;
  shot_quality_description: string;
  player: PxpPlayer;
}

export interface PxpHit {
  event: "hit";
  id: string;
  period: string;
  time_formatted: string;
  hitter: PxpPlayer;
}

export interface PxpPenalty {
  event: "penalty";
  id: string;
  period_id: string;
  time_off_formatted: string;
  lang_penalty_description: string;
  player_penalized_info: PxpPlayer;
}

export interface PxpPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  team_id: string;
  team_code: string;
}

export type PxpEvent = PxpGoal | PxpShot | PxpBlockedShot | PxpHit | PxpPenalty | { event: string };

export async function fetchPlayByPlay(gameId: string): Promise<PxpEvent[]> {
  const data = await fetchJson<{ GC: { Pxpverbose: PxpEvent[] } }>(
    url({ feed: "gc", tab: "pxpverbose", game_id: gameId })
  );
  return data.GC.Pxpverbose;
}
