import { fetchCurrentSeasonId, fetchTeams, fetchRoster } from "./hockeytech";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
}

async function runSync(env: Env): Promise<void> {
  const headers = {
    "apikey": env.SUPABASE_SECRET_KEY,
    "Authorization": `Bearer ${env.SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
  };

  const rest = `${env.SUPABASE_URL}/rest/v1`;

  async function upsert(table: string, rows: object[]): Promise<void> {
    if (rows.length === 0) return;
    const res = await fetch(`${rest}/${table}`, {
      method: "POST",
      headers,
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`upsert ${table} failed ${res.status}: ${body}`);
    }
  }

  console.log("roster-sync started");

  const seasonId = await fetchCurrentSeasonId();
  console.log(`season_id: ${seasonId}`);

  const teams = await fetchTeams(seasonId);
  console.log(`fetched ${teams.length} teams`);

  await upsert(
    "teams",
    teams.map((t) => ({
      id: parseInt(t.id, 10),
      name: t.name,
      city: t.city,
      code: t.code,
      nickname: t.nickname,
      logo_url: t.team_logo_url,
      updated_at: new Date().toISOString(),
    }))
  );

  let playerCount = 0;

  for (const team of teams) {
    const players = await fetchRoster(team.id, seasonId);

    await upsert(
      "players",
      players.map((p) => ({
        id: parseInt(p.player_id, 10),
        first_name: p.first_name,
        last_name: p.last_name,
        position: p.position || null,
        jersey_number: p.tp_jersey_number || null,
        shoots: p.shoots || null,
        height: p.height || null,
        weight: p.weight || null,
        birthdate: p.birthdate || null,
        birthtown: p.birthtown || null,
        birthprov: p.birthprov || null,
        birthcountry: p.birthcntry || null,
        image_url: p.player_image || null,
        current_team_id: parseInt(team.id, 10),
        updated_at: new Date().toISOString(),
      }))
    );

    playerCount += players.length;
    console.log(`team ${team.code}: upserted ${players.length} players`);
  }

  console.log(`roster-sync done — ${teams.length} teams, ${playerCount} players`);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname === "/__scheduled") {
      ctx.waitUntil(runSync(env));
      return new Response("triggered\n");
    }
    return new Response("roster-sync worker — trigger via cron only\n", { status: 405 });
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runSync(env);
  },
};
