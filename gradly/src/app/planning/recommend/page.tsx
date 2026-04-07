import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { generateSemesterRange, getCurrentSemesterName } from "@/lib/utils/planning";
import type { PlannerCourse } from "@/lib/utils/pathfinder";
import { getNextCoopSequenceForTermYear } from "../actions";
import { isCoopCatalogCourseId } from "@/lib/utils/coopPlacement";
import RecommendClient from "./RecommendClient";

type RawReqRow = {
  course_id:      string | null;
  credits_needed: number | null;
  classes:        { title: string; credits: number; class_kind?: string } | null;
};

export default async function RecommendPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("major, expected_graduation")
    .eq("id", user.id)
    .single();

  const { major, expected_graduation } = profile ?? {};

  // ── Profile incomplete fallback ───────────────────────────────────────────
  if (!major || !expected_graduation) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md px-8">
          <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase mb-4">
            Scheduler_Unavailable
          </p>
          <h2 className="text-3xl font-bold text-white uppercase mb-6">
            Profile_Incomplete
          </h2>
          <p className="text-gray-500 text-sm mb-10 leading-relaxed">
            Your major and expected graduation are required to run the auto-scheduler.
          </p>
          <Link
            href="/profile"
            className="px-8 py-4 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-green-500 transition-colors"
          >
            Complete_Profile →
          </Link>
        </div>
      </div>
    );
  }

  // ── Build plannable semester list (current → graduation, no summer) ───────
  const currentSem   = getCurrentSemesterName();
  const allSemesters = generateSemesterRange(currentSem, expected_graduation, currentSem)
    .filter((s) => s.type === "active" || s.type === "upcoming")
    .filter((s) => s.term !== "Summer");

  if (allSemesters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md px-8">
          <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase mb-4">
            Scheduler_Unavailable
          </p>
          <h2 className="text-3xl font-bold text-white uppercase mb-6">
            No_Semesters_Remaining
          </h2>
          <p className="text-gray-500 text-sm mb-10 leading-relaxed">
            No plannable semesters found within your graduation window.
          </p>
          <Link
            href="/planning"
            className="px-8 py-4 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-green-500 transition-colors"
          >
            Return_To_Planning →
          </Link>
        </div>
      </div>
    );
  }

  // ── Degree requirements ───────────────────────────────────────────────────
  const { data: reqRows } = await supabase
    .from("degree_requirements")
    .select("course_id, credits_needed, classes(title, credits, class_kind)")
    .eq("major", major)
    .not("course_id", "is", null);

  // ── Already-placed courses ────────────────────────────────────────────────
  const { data: placedRows } = await supabase
    .from("user_courses")
    .select("course_id")
    .eq("user_id", user.id);

  const placedIds = new Set((placedRows ?? []).map((r) => r.course_id));

  // ── Queue = required − placed ─────────────────────────────────────────────
  const initialQueue: PlannerCourse[] = ((reqRows ?? []) as unknown as RawReqRow[])
    .filter((r) => {
      if (r.course_id === null || placedIds.has(r.course_id)) return false;
      if (r.classes?.class_kind === "coop") return false;
      if (isCoopCatalogCourseId(r.course_id)) return false;
      return true;
    })
    .map((r) => ({
      course_id: r.course_id!,
      title:     r.classes?.title     ?? r.course_id!,
      credits:   r.classes?.credits   ?? r.credits_needed ?? 3,
    }));

  const { data: coopModeRows } = await supabase
    .from("user_semester_modes")
    .select("semester, year")
    .eq("user_id", user.id)
    .eq("is_coop", true);

  const coopSemesterNames = new Set(
    (coopModeRows ?? []).map((r) => `${r.semester} ${r.year}`)
  );

  const semesters = await Promise.all(
    allSemesters.map(async (s) => {
      const name = s.name;
      const isCoop = coopSemesterNames.has(name);
      const nextCoopSeq = await getNextCoopSequenceForTermYear(s.term, s.year);
      return {
        semester: s.term,
        year:     s.year,
        name,
        type:     s.type as "active" | "upcoming",
        isCoop,
        nextCoopSeq,
      };
    })
  );

  return (
    <RecommendClient
      semesters={semesters}
      initialQueue={initialQueue}
    />
  );
}
