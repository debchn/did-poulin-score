import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Checkbox } from "@base-ui-components/react/checkbox";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { EVENT_TYPES, EVENT_LABELS, formatDefaultMessage } from "../lib/events";
import type { EventType } from "../lib/events";
import styles from "./PlayerDetail.module.css";

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: string | null;
  birthtown: string | null;
  birthprov: string | null;
  birthcountry: string | null;
  image_url: string | null;
  teams: { name: string; code: string; logo_url: string | null } | null;
}

interface Preference {
  id: string;
  event_type: EventType;
  active: boolean;
  custom_message: string | null;
}

export function PlayerDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const [player, setPlayer] = useState<Player | null>(null);
  const [prefs, setPrefs] = useState<Map<EventType, Preference>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: playerData }, { data: prefsData }] = await Promise.all([
        supabase
          .from("players")
          .select("id, first_name, last_name, position, jersey_number, birthtown, birthprov, birthcountry, image_url, teams(name, code, logo_url)")
          .eq("id", id!)
          .single(),
        supabase
          .from("notification_preferences")
          .select("id, event_type, active, custom_message")
          .eq("user_id", session!.user.id)
          .eq("player_id", id!),
      ]);

      setPlayer(playerData as unknown as Player);
      const map = new Map<EventType, Preference>();
      for (const p of prefsData ?? []) {
        map.set(p.event_type as EventType, p as Preference);
      }
      setPrefs(map);
      setLoading(false);
    }
    load();
  }, [id, session]);

  async function handleToggle(eventType: EventType, checked: boolean) {
    const existing = prefs.get(eventType);

    if (existing) {
      const { data } = await supabase
        .from("notification_preferences")
        .update({ active: checked })
        .eq("id", existing.id)
        .select("id, event_type, active, custom_message")
        .single();
      setPrefs((prev) => new Map(prev).set(eventType, data as Preference));
    } else {
      const { data } = await supabase
        .from("notification_preferences")
        .insert({ user_id: session!.user.id, player_id: player!.id, event_type: eventType, active: true })
        .select("id, event_type, active, custom_message")
        .single();
      setPrefs((prev) => new Map(prev).set(eventType, data as Preference));
    }
  }

  async function handleMessageBlur(eventType: EventType, value: string) {
    const existing = prefs.get(eventType);
    if (!existing) return;
    const custom_message = value.trim() || null;
    const { data } = await supabase
      .from("notification_preferences")
      .update({ custom_message })
      .eq("id", existing.id)
      .select("id, event_type, active, custom_message")
      .single();
    setPrefs((prev) => new Map(prev).set(eventType, data as Preference));
  }

  if (loading || !player) return null;

  const hometown = [player.birthtown, player.birthprov, player.birthcountry].filter(Boolean).join(", ");

  return (
    <main className={styles.page}>
      <Link to="/players" className={styles.back}>← All players</Link>

      <section className={styles.bio}>
        {player.image_url && (
          <img src={player.image_url} alt={`${player.first_name} ${player.last_name}`} className={styles.photo} />
        )}
        <div>
          <h1>{player.first_name} {player.last_name}</h1>
          <dl className={styles.facts}>
            <dt>Team</dt>      <dd>{player.teams?.name ?? "—"}</dd>
            <dt>Position</dt>  <dd>{player.position ?? "—"}</dd>
            <dt>Number</dt>    <dd>#{player.jersey_number ?? "—"}</dd>
            {hometown && <><dt>Hometown</dt><dd>{hometown}</dd></>}
          </dl>
        </div>
      </section>

      <section>
        <h2>Notifications</h2>
        <ul className={styles.eventList} role="list">
          {EVENT_TYPES.map((eventType) => {
            const pref = prefs.get(eventType);
            const isActive = pref?.active ?? false;
            const defaultMsg = formatDefaultMessage(player.first_name, player.last_name, eventType);

            return (
              <li key={eventType} className={styles.eventRow}>
                <label className={styles.checkLabel}>
                  <Checkbox.Root
                    checked={isActive}
                    onCheckedChange={(checked) => handleToggle(eventType, checked as boolean)}
                    className={styles.checkbox}
                  >
                    <Checkbox.Indicator className={styles.indicator}>✓</Checkbox.Indicator>
                  </Checkbox.Root>
                  <span>{EVENT_LABELS[eventType]}</span>
                </label>

                {isActive && (
                  <input
                    type="text"
                    className={styles.customMsg}
                    defaultValue={pref?.custom_message ?? ""}
                    placeholder={defaultMsg}
                    aria-label={`Custom message for ${EVENT_LABELS[eventType]}`}
                    onBlur={(e) => handleMessageBlur(eventType, e.target.value)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
