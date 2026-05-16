export interface PlayerRow {
  id: number;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: string | null;
  teams: { name: string; code: string; logo_url: string | null } | null;
}

export function filterPlayers(players: PlayerRow[], query: string): PlayerRow[] {
  const q = query.toLowerCase().trim();
  if (!q) return players;
  return players.filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
  );
}
