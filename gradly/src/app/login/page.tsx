"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [titleText, setTitleText] = useState("");
  const [subText, setSubText]     = useState("");
  const [showBtn, setShowBtn]     = useState(false);
  const [showAuth, setShowAuth]   = useState(false);

  const [mode, setMode]         = useState<Mode>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const router   = useRouter();
  const supabase = createClient();

  // Typewriter: "gradly" then subtitle, then reveal button
  useEffect(() => {
    const fullTitle = "gradly";
    const fullSub   = "made for students, by students";
    let i = 0;
    const t1 = setInterval(() => {
      setTitleText(fullTitle.slice(0, i + 1));
      if (++i === fullTitle.length) {
        clearInterval(t1);
        let j = 0;
        const t2 = setInterval(() => {
          setSubText(fullSub.slice(0, j + 1));
          if (++j === fullSub.length) {
            clearInterval(t2);
            setTimeout(() => setShowBtn(true), 200);
          }
        }, 40);
      }
    }, 120);
    return () => clearInterval(t1);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-8xl font-bold mb-2">
          {titleText}
          <span className="inline-block w-1 h-12 bg-white ml-2 animate-pulse" />
        </h1>
        <p className="text-gray-500 tracking-[0.3em] uppercase min-h-[1.5rem]">{subText}</p>

        <div className="mt-16 flex flex-col items-center gap-4">
          {showBtn && (
            <button
              onClick={() => setShowAuth(true)}
              className="w-48 py-3 bg-white text-black font-bold hover:invert transition-all tracking-widest uppercase text-xs"
            >
              Access_System
            </button>
          )}
        </div>
      </div>

      {/* Auth modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-gray-800 p-10 bg-black relative">
            {/* Status pip */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="text-[10px] text-gray-600">
                {showConfirm ? "PENDING_CONFIRM" : "READY"}
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  showConfirm ? "bg-yellow-500" : "bg-green-500"
                }`}
              />
            </div>

            {showConfirm ? (
              /* ─── Confirmation screen ─── */
              <div>
                <h2 className="text-lg tracking-widest mb-6 text-gray-400 uppercase">
                  Confirm_Email
                </h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                  Account initialized. A confirmation link has been dispatched
                  to <span className="text-white">{email}</span>. Verify your
                  terminal to proceed.
                </p>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setMode("login");
                  }}
                  className="w-full py-4 bg-white text-black font-bold uppercase text-xs tracking-widest"
                >
                  Back_To_Login
                </button>
              </div>
            ) : (
              /* ─── Auth form ─── */
              <>
                <h2 className="text-lg tracking-widest mb-2 text-gray-400 uppercase">
                  {mode === "login" ? "Authenticate" : "Initialize"}
                </h2>

                {/* Mode toggle */}
                <div className="flex gap-6 mb-8">
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setError(null); }}
                      className={`text-[10px] uppercase tracking-[0.3em] transition-colors ${
                        mode === m ? "text-green-500" : "text-gray-600 hover:text-gray-400"
                      }`}
                    >
                      {m === "login" ? "Sign_In" : "Create_Account"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent border-b border-gray-800 py-2 outline-none focus:border-white transition-colors text-sm"
                      placeholder="STUDENT_EMAIL"
                      required
                      autoComplete="email"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border-b border-gray-800 py-2 outline-none focus:border-white transition-colors text-sm"
                      placeholder="ACCESS_KEY"
                      required
                      minLength={6}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />

                    {error && (
                      <p className="text-red-400 text-[10px] tracking-wider uppercase">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-white text-black font-bold uppercase text-xs tracking-widest mt-4 disabled:opacity-50 transition-opacity"
                    >
                      {loading
                        ? "Processing..."
                        : mode === "login"
                        ? "Initialize_Uplink"
                        : "Register_Terminal"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAuth(false)}
                      className="w-full text-[10px] text-gray-600 uppercase tracking-widest mt-2 hover:text-gray-400 transition-colors"
                    >
                      Abort
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
