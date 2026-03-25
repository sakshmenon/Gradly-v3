import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  generateSemesterRange,
  getCurrentSemesterName,
} from "@/lib/utils/planning";
import ProfileForm from "./ProfileForm";

type RawCourseRow = {
  semester: string;
  year: number;
  status: string;
  classes: { course_id: string; credits: number } | null;
};

type CardData = {
  name:        string;
  statusLabel: "ARCHIVED" | "ACTIVE" | "PLANNING";
  courses:     string[];
};

// ── Semester card (CSS-only hover — safe in server component) ─────────────────

function SemCard({ card }: { card: CardData }) {
  const statusCls =
    card.statusLabel === "ACTIVE"
      ? "border-green-500 text-green-500"
      : "border-gray-800 text-gray-600";

  return (
    <div className="relative group min-w-[280px] flex-1 min-h-[220px] bg-gray-950/30 border border-gray-900 rounded-2xl p-8 transition-all duration-500 hover:border-gray-700 flex flex-col">
      {/* Content layer — blurs on hover */}
      <div className="transition-all duration-500 group-hover:blur-md group-hover:opacity-20 flex flex-col h-full">
        <div className="flex justify-between items-center mb-8">
          <span className="text-xl font-bold tracking-widest uppercase">
            {card.name}
          </span>
          <span className={`text-[9px] tracking-[0.3em] px-2 py-1 border ${statusCls}`}>
            [{card.statusLabel}]
          </span>
        </div>

        <ul className="space-y-4">
          {card.courses.slice(0, 5).map((c) => (
            <li
              key={c}
              className="text-[12px] text-gray-400 tracking-wider uppercase flex items-center gap-3"
            >
              <div className="w-1 h-1 rounded-full bg-gray-800" />
              {c}
            </li>
          ))}
          {card.courses.length === 0 && (
            <li className="text-[12px] text-gray-700 tracking-wider uppercase flex items-center gap-3">
              <div className="w-1 h-1 rounded-full bg-gray-800" />
              Null_Payload
            </li>
          )}
        </ul>
      </div>

      {/* Overlay — VIEW_SCHEDULE button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
        <Link
          href="/planning"
          className="px-8 py-3 bg-white text-black text-[10px] font-extrabold tracking-[0.4em] uppercase hover:bg-green-500 transition-colors shadow-2xl"
        >
          VIEW_SCHEDULE
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, major, starting_semester, expected_graduation, gpa")
    .eq("id", user.id)
    .single();

  // ── Temporal logs: fetch user's courses for semester cards ─────────────────
  const { data: rawCourses } = await supabase
    .from("user_courses")
    .select("semester, year, status, classes(course_id, credits)")
    .eq("user_id", user.id);

  const coursesBySem: Record<string, string[]> = {};
  for (const row of (rawCourses ?? []) as unknown as RawCourseRow[]) {
    if (!row.classes) continue;
    const key = `${row.semester} ${row.year}`;
    if (!coursesBySem[key]) coursesBySem[key] = [];
    coursesBySem[key].push(row.classes.course_id);
  }

  const currentSem   = getCurrentSemesterName();
  const semesterCards: CardData[] = [];

  if (profile?.starting_semester && profile?.expected_graduation) {
    const sems = generateSemesterRange(
      profile.starting_semester,
      profile.expected_graduation,
      currentSem
    );
    for (const s of sems) {
      semesterCards.push({
        name:        s.name.toUpperCase(),
        statusLabel: s.type === "past" ? "ARCHIVED" : s.type === "active" ? "ACTIVE" : "PLANNING",
        courses:     coursesBySem[s.name] ?? [],
      });
    }
  }

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "STUDENT";
  const initial     = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative h-full w-full flex flex-col px-20 pt-20 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="flex items-center gap-10 pb-10 flex-shrink-0">
        <div className="w-32 h-32 rounded-full border border-gray-800 flex items-center justify-center bg-gray-900/20">
          <span className="text-6xl font-bold">{initial}</span>
        </div>
        <div>
          <p className="text-gray-600 text-[10px] tracking-[0.5em] uppercase mb-2">
            Profile
          </p>
          <h1 className="text-5xl font-bold tracking-tight">
            {displayName}
          </h1>
        </div>
      </section>

      <div className="w-full h-px bg-gray-900 flex-shrink-0" />

      {/* ── Bottom two-column layout ─────────────────────────────────────── */}
      <div className="flex-1 flex gap-16 pt-12 pb-10 overflow-hidden">

        {/* Left: Identity Parameters */}
        <section className="w-72 flex flex-col gap-6 flex-shrink-0 overflow-hidden">
          <h3 className="text-gray-600 text-[10px] tracking-[0.5em] uppercase flex-shrink-0">
            Profile info
          </h3>
          <div className="flex-1 overflow-hidden">
            <ProfileForm
              profile={{
                display_name:        profile?.display_name        ?? null,
                email:               user.email                   ?? "",
                major:               profile?.major               ?? null,
                starting_semester:   profile?.starting_semester   ?? null,
                expected_graduation: profile?.expected_graduation ?? null,
                gpa:                 profile?.gpa                 ?? null,
              }}
            />
          </div>
        </section>

        {/* Right: Temporal Logs */}
        <section className="flex-1 flex flex-col gap-8 overflow-hidden min-w-0">
          <h3 className="text-gray-600 text-[15px] tracking-[0.5em] flex-shrink-0">
            Semesters
          </h3>

          {semesterCards.length === 0 ? (
            <div className="flex items-start pt-4">
              <div className="border border-gray-900 px-8 py-6">
                <p className="text-[15px] text-gray-700 tracking-[0.5em] uppercase mb-3">
                  no data available
                </p>
                <p className="text-gray-600 text-xs tracking-wider mb-4">
                  Set your semester range in Identity_Parameters to view semesters.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4 pr-4 scrollbar-hide flex-1">
              {semesterCards.map((card) => (
                <SemCard key={card.name} card={card} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
