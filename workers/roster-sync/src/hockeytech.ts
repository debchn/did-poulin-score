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
  const text = await res.text();
  // API always wraps response in bare parens: ({...}) or ([...])
  const json = text.startsWith("(") ? text.slice(1, -1) : text;
  return JSON.parse(json) as T;
}

// ── Types matching the API shapes we care about ────────────────────────────────

export interface HtTeam {
  id: string;
  name: string;
  city: string;
  code: string;
  nickname: string;
  team_logo_url: string;
}

export interface HtPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  tp_jersey_number: string;
  shoots: string;
  height: string;
  weight: string;
  birthdate: string;
  birthtown: string;
  birthprov: string;
  birthcntry: string;
  player_image: string;
}

// ── API calls ──────────────────────────────────────────────────────────────────

export async function fetchCurrentSeasonId(): Promise<number> {
  const data = await fetchJson<{ current_season_id: string }>(
    url({ feed: "statviewfeed", view: "bootstrap", season: "latest", pageName: "scorebar", site_id: 0, league_id: "", lang: "en" })
  );
  return parseInt(data.current_season_id, 10);
}

export async function fetchTeams(seasonId: number): Promise<HtTeam[]> {
  const data = await fetchJson<{ SiteKit: { Teamsbyseason: HtTeam[] } }>(
    url({ feed: "modulekit", view: "teamsbyseason", season_id: seasonId })
  );
  return data.SiteKit.Teamsbyseason;
}

export async function fetchRoster(teamId: string, seasonId: number): Promise<HtPlayer[]> {
  const data = await fetchJson<{ SiteKit: { Roster: HtPlayer[] } }>(
    url({ feed: "modulekit", view: "roster", team_id: teamId, season_id: seasonId })
  );
  // Roster is a flat array of player objects (staff entries have no player_id)
  return data.SiteKit.Roster.filter((p) => Boolean(p.player_id));
}
