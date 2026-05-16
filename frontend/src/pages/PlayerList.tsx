import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { filterPlayers } from "../lib/filterPlayers";
import type { PlayerRow as Player } from "../lib/filterPlayers";
import styles from "./PlayerList.module.css";

export function PlayerList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("players")
        .select("id, first_name, last_name, position, jersey_number, teams(name, code, logo_url)")
        .order("last_name");
      setPlayers((data as unknown as Player[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => filterPlayers(players, query), [players, query]);

  if (loading) return <p className={styles.status}>Loading players…</p>;

  return (
    <main className={styles.page}>
      <h1>Players</h1>
      <input
        className={styles.search}
        type="search"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search players"
      />
      {filtered.length === 0 ? (
        <p className={styles.status}>No players match "{query}".</p>
      ) : (
        <ul className={styles.list} role="list">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link to={`/players/${p.id}`} className={styles.row}>
                {p.teams?.logo_url && (
                  <img src={p.teams.logo_url} alt={p.teams.code} className={styles.logo} />
                )}
                <span className={styles.name}>
                  {p.first_name} {p.last_name}
                </span>
                <span className={styles.meta}>
                  #{p.jersey_number} · {p.position} · {p.teams?.name ?? "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
