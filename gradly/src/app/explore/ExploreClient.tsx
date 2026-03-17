"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getYearInSchool } from "@/lib/utils/planning";

type UserResult = {
  id: string;
  display_name: string | null;
  major: string | null;
  starting_semester: string | null;
};

export default function ExploreClient({ currentUserId }: { currentUserId: string }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<UserResult[] | null>(null);

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

  return (
    <section>
      <h2>Search Users</h2>
      <input
        type="search"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      {results !== null && (
        <ul>
          {results.length === 0 && <li><em>No users found.</em></li>}

          {results.map((u) => (
            <li key={u.id}>
              <a href={`/explore/${u.id}`}>
                <strong>{u.display_name ?? "(No name)"}</strong>
                {u.major && <> &mdash; {u.major}</>}
                {u.starting_semester && (
                  <> ({getYearInSchool(u.starting_semester)})</>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
