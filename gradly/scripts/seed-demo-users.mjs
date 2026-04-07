#!/usr/bin/env node
/**
 * Seeds five Supabase Auth users + profiles + sample schedules for the login-page presentation demo.
 *
 * Requirements:
 *   - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - `classes` table populated (run your catalog import first)
 *
 * Usage (from gradly/):
 *   node scripts/seed-demo-users.mjs
 *
 * Optional:
 *   DEMO_SEED_PASSWORD — default matches DEMO_DEFAULT_PASSWORD in src/lib/demo/config.ts
 *   DEMO_SEED_CURRENT_SEM — e.g. "Spring 2026"; used to label past/active/planned like the app (default Spring 2026)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const p = join(__dirname, "..", ".env.local");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD =
  process.env.DEMO_SEED_PASSWORD || "GradlyDemo2026!";

const ACCOUNTS = [
  {
    email: "demo.alex.mercer@gradly.demo",
    displayName: "Alex Mercer",
    role: "presenter",
  },
  {
    email: "demo.jordan.vale@gradly.demo",
    displayName: "Jordan Vane",
    role: "peer",
  },
  {
    email: "demo.sam.reyes@gradly.demo",
    displayName: "Sam Reyes",
    role: "extra",
  },
  {
    email: "demo.morgan.ellis@gradly.demo",
    displayName: "Morgan Ellis",
    role: "extra",
  },
  {
    email: "demo.riley.cho@gradly.demo",
    displayName: "Riley Cho",
    role: "extra",
  },
];

const START = "Fall 2024";
const END = "Spring 2028";
/** Past/active/upcoming labels for seeded rows — align with app’s `getSemesterInfo()` for your demo date. */
const SEED_CURRENT_SEM = process.env.DEMO_SEED_CURRENT_SEM || "Spring 2026";

const TERM_ORDER = { Spring: 0, Summer: 1, Fall: 2 };
const TERMS = ["Spring", "Summer", "Fall"];

function semIdx(term, year) {
  return year * 3 + TERM_ORDER[term];
}

function parseSemester(s) {
  const [t, y] = s.split(" ");
  return { term: t, year: Number.parseInt(y, 10) };
}

/** Mirrors `generateSemesterRange` in `src/lib/utils/planning.ts`. */
function generateSemesterRange(start, end, currentSem) {
  const s = parseSemester(start);
  const e = parseSemester(end);
  const c = parseSemester(currentSem);
  const startIdx = semIdx(s.term, s.year);
  const endIdx = semIdx(e.term, e.year);
  const currentIdx = semIdx(c.term, c.year);
  if (startIdx > endIdx) return [];
  const result = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const year = Math.floor(i / 3);
    const term = TERMS[i % 3];
    const type =
      i < currentIdx ? "past" : i === currentIdx ? "active" : "upcoming";
    result.push({ term, year, type });
  }
  return result;
}

async function ensureAuthUser(admin, email) {
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (!cErr && created?.user?.id) return created.user.id;

  const msg = cErr?.message ?? "";
  if (
    cErr &&
    (msg.toLowerCase().includes("already") || cErr.status === 422)
  ) {
    let page = 1;
    for (;;) {
      const { data: list, error: lErr } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (lErr) throw lErr;
      const found = list?.users?.find((u) => u.email === email);
      if (found?.id) return found.id;
      if (!list?.users?.length) break;
      page += 1;
      if (page > 50) break;
    }
  }
  throw cErr ?? new Error(`Could not create or find user ${email}`);
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: classRows, error: classErr } = await admin
    .from("classes")
    .select("course_id, class_kind")
    .or("class_kind.is.null,class_kind.eq.study")
    .limit(80);

  if (classErr) throw classErr;
  const pool = (classRows ?? [])
    .map((r) => r.course_id)
    .filter(
      (id) =>
        id &&
        String(id).replace(/\s+/g, "").toUpperCase().indexOf("COOP") !== 0
    );

  /** Distinct IDs so we never violate UNIQUE (user_id, course_id) when pool is short. */
  const uniquePool = [...new Set(pool)];

  const peerSemesters = generateSemesterRange(START, END, SEED_CURRENT_SEM);
  const peerSlots = peerSemesters.length;
  const extraSpring25 = 2; // total 3 courses in Spring 2025 for copy demo
  const minPool = 4 + peerSlots + extraSpring25 + 2; // presenter indices 0–3 + peer + buffer

  if (uniquePool.length < minPool) {
    console.error(
      `Need at least ${minPool} distinct non–co-op courses in public.classes (have ${uniquePool.length}). Import the catalog first.`
    );
    process.exit(1);
  }

  const pick = (i) => uniquePool[i];

  const idsByEmail = {};
  for (let i = 0; i < ACCOUNTS.length; i++) {
    const a = ACCOUNTS[i];
    const id = await ensureAuthUser(admin, a.email);
    idsByEmail[a.email] = id;

    const profile = {
      email: a.email,
      display_name: a.displayName,
      major: "Computer Science",
      starting_semester: START,
      expected_graduation: END,
      visibility: "public",
      gpa: 3.2 + (i % 5) * 0.05,
      year_in_school: Math.min(4, 2 + (i % 3)),
    };
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    const { error: uErr } = existing
      ? await admin.from("users").update(profile).eq("id", id)
      : await admin.from("users").insert({ id, ...profile });
    if (uErr) throw uErr;
  }

  const presenterId = idsByEmail["demo.alex.mercer@gradly.demo"];
  const peerId = idsByEmail["demo.jordan.vale@gradly.demo"];

  const demoIds = Object.values(idsByEmail);
  await admin.from("user_courses").delete().in("user_id", demoIds);
  for (const id of demoIds) {
    await admin.from("follows").delete().eq("follower_id", id);
    await admin.from("follows").delete().eq("following_id", id);
  }

  const rows = [];

  // Presenter: past semesters partially filled; leave later terms open for the guided demo
  rows.push(
    { user_id: presenterId, course_id: pick(0), semester: "Fall", year: 2024, status: "completed", grade: "A-" },
    { user_id: presenterId, course_id: pick(1), semester: "Fall", year: 2024, status: "completed", grade: "B+" },
    { user_id: presenterId, course_id: pick(2), semester: "Spring", year: 2025, status: "completed", grade: "A" },
    { user_id: presenterId, course_id: pick(3), semester: "Spring", year: 2025, status: "completed", grade: "B" }
  );

  // Peer (Jordan Vane): one distinct course per semester in plan → every term shows COPY in the UI
  let poolIx = 4;
  for (const slot of peerSemesters) {
    const status =
      slot.type === "past"
        ? "completed"
        : slot.type === "active"
          ? "in_progress"
          : "planned";
    const grade = slot.type === "past" ? "B" : null;
    rows.push({
      user_id: peerId,
      course_id: uniquePool[poolIx++],
      semester: slot.term,
      year: slot.year,
      status,
      grade,
    });
  }

  // Spring 2025 = DEMO_PEER_COPY_TERM/YEAR — add two more classes so “copy semester” is visibly full
  rows.push(
    {
      user_id: peerId,
      course_id: uniquePool[poolIx++],
      semester: "Spring",
      year: 2025,
      status: "completed",
      grade: "A-",
    },
    {
      user_id: peerId,
      course_id: uniquePool[poolIx++],
      semester: "Spring",
      year: 2025,
      status: "completed",
      grade: "B+",
    }
  );

  const { error: insErr } = await admin.from("user_courses").insert(rows);
  if (insErr) throw insErr;

  console.log("Demo users ready.");
  console.log("  Password:", PASSWORD);
  console.log("  Presenter:", "demo.alex.mercer@gradly.demo");
  console.log("  Peer (Jordan Vane):", "demo.jordan.vale@gradly.demo");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
