import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import styles from "./Dashboard.module.css";

interface UserProfile {
  ntfy_topic: string;
}

export function Dashboard() {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("user_profiles")
        .select("ntfy_topic")
        .eq("id", session!.user.id)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, [session]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!topicInput.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("user_profiles")
      .upsert({ id: session!.user.id, ntfy_topic: topicInput.trim() })
      .select("ntfy_topic")
      .single();
    setProfile(data);
    setSaving(false);
  }

  if (loading) return null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <button type="button" onClick={signOut}>Sign out</button>
      </header>

      {profile ? (
        <section className={styles.section}>
          <p>
            Notifications send to ntfy topic: <strong>{profile.ntfy_topic}</strong>
          </p>
          <button type="button" onClick={() => { setProfile(null); setTopicInput(profile.ntfy_topic); }}>
            Edit topic
          </button>
          <Link to="/players">Browse players →</Link>
        </section>
      ) : (
        <section className={styles.section}>
          <h2>Set your ntfy topic</h2>
          <p>
            Choose a unique private string. Subscribe to it in the{" "}
            <a href="https://ntfy.sh" target="_blank" rel="noreferrer">ntfy app</a>.
          </p>
          <form onSubmit={saveProfile} className={styles.form}>
            <input
              type="text"
              placeholder="e.g. my-pwhl-alerts-abc123"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              required
            />
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
