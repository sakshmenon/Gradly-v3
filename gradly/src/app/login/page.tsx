"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode]       = useState<Mode>("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const router   = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
      else setShowConfirm(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/");
    }

    setLoading(false);
  }

  return (
    <main>
      {/* Email confirmation popup */}
      {showConfirm && (
        <dialog open>
          <p>
            Account created! A confirmation email has been sent to <strong>{email}</strong>.
            Please check your inbox and click the link to activate your account.
          </p>
          <button onClick={() => { setShowConfirm(false); setMode("login"); }}>
            OK, take me to login
          </button>
        </dialog>
      )}

      <h1>Gradly</h1>
      <h2>{mode === "login" ? "Log In" : "Create Account"}</h2>

      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label><br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password">Password</label><br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Log In" : "Sign Up"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
      >
        {mode === "login"
          ? "Don't have an account? Sign up"
          : "Already have an account? Log in"}
      </button>
    </main>
  );
}
