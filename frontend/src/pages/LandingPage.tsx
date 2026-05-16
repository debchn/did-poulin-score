import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import styles from "./LandingPage.module.css";

export function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate("/dashboard", { replace: true });
  }, [session, loading, navigate]);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  return (
    <main className={styles.page}>
      <h1>Did Poulin Score?</h1>
      <p>Get notified the moment your favourite PWHL player does something worth knowing about.</p>
      <button type="button" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </main>
  );
}
