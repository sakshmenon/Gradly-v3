"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getYearInSchool } from "@/lib/utils/planning";
import { DEMO_EXPLORE_SEARCH } from "@/lib/demo/config";
import { isDemoActive } from "@/lib/demo/store";

const demoSleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type UserResult = {
  id: string;
  display_name: string | null;
  major: string | null;
  starting_semester: string | null;
};

export default function ExploreClient({ currentUserId }: { currentUserId: string }) {
  const [isSearching, setIsSearching] = useState(false);
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<UserResult[] | null>(null);
  const router = useRouter();
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    async function runExploreDemo() {
      if (!isDemoActive()) return;
      setIsSearching(true);
      setQuery(DEMO_EXPLORE_SEARCH);
      await demoSleep(900);
      const sb = createClient();
      const { data } = await sb
        .from("users")
        .select("id, display_name")
        .ilike("display_name", `%${DEMO_EXPLORE_SEARCH}%`)
        .neq("id", currentUserIdRef.current)
        .limit(10);
      const q = DEMO_EXPLORE_SEARCH.toLowerCase();
      const peer =
        data?.find((u) => (u.display_name ?? "").toLowerCase().includes(q)) ??
        data?.[0];
      if (peer?.id) {
        window.dispatchEvent(
          new CustomEvent("gradly-demo-explore-nav", {
            detail: { peerId: peer.id },
          })
        );
        await demoSleep(450);
        router.push(`/explore/${peer.id}`);
      }
    }

    function onExploreDemo() {
      void runExploreDemo();
    }
    window.addEventListener("gradly-demo-explore-search", onExploreDemo);
    return () =>
      window.removeEventListener("gradly-demo-explore-search", onExploreDemo);
  }, [router]);

  // Debounced user search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setResults(null); return; }

    const timer = setTimeout(async () => {
      const sb = createClient();
      const { data } = await sb
        .from("users")
        .select("id, display_name, major, starting_semester")
        .ilike("display_name", `%${trimmed}%`)
        .neq("id", currentUserId)
        .limit(10);
      setResults(data ?? []);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  function closeSearch() {
    setIsSearching(false);
    setQuery("");
    setResults(null);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative h-full px-10">

      {/* Faded "EXPLORE" background text */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.06 }}
        className="absolute text-9xl font-bold tracking-[0.6em] uppercase italic select-none pointer-events-none"
      >
        EXPLORE
      </motion.h1>

      {/* Search trigger */}
      <div className="w-full max-w-lg relative z-10">
        <button
          onClick={() => setIsSearching(true)}
          className="w-full bg-gray-950/40 border border-gray-900 p-6 text-center text-gray-600 text-[11px] tracking-[0.5em] hover:text-white hover:border-gray-500 transition-all uppercase"
        >
          Search Users
        </button>
      </div>

      {/* Search modal */}
      <AnimatePresence>
        {isSearching && (
          <div className="fixed inset-0 z-30 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/80"
              onClick={closeSearch}
            />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.98, opacity: 0 }}
              className="relative z-10 w-[450px] bg-gray-950 border border-gray-800 rounded-xl p-10 shadow-2xl"
            >
              {/* Search input */}
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                className="w-full bg-transparent border-b border-gray-800 text-2xl py-4 outline-none focus:border-green-500 uppercase font-bold text-white mb-6 tracking-[0.2em]"
                placeholder="search users"
                autoComplete="off"
              />

              {/* Results */}
              {results !== null && (
                <div className="space-y-1">
                  {results.length === 0 ? (
                    <div className="p-4 text-[10px] text-gray-700 tracking-widest uppercase text-center">
                      No users found
                    </div>
                  ) : (
                    results.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => router.push(`/explore/${u.id}`)}
                        className="w-full text-left p-4 text-[10px] tracking-[0.4em] text-gray-500 border border-transparent hover:border-gray-800 hover:bg-white/5 hover:text-white transition-all"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="uppercase">{u.display_name ?? "(No name)"}</span>
                          {(u.major || u.starting_semester) && (
                            <span className="text-gray-700 text-[8px] tracking-wider">
                              {[
                                u.major,
                                u.starting_semester ? getYearInSchool(u.starting_semester) : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Abort */}
              <button
                onClick={closeSearch}
                className="mt-6 w-full text-[9px] text-gray-700 hover:text-gray-400 tracking-widest transition-colors text-center"
              >
                exit
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
