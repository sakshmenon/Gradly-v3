import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { generateSemesterRange, getCurrentSemesterName } from "@/lib/utils/planning";
import type { PlannerCourse } from "@/lib/utils/pathfinder";
import RecommendClient from "./RecommendClient";

// ── Types for raw Supabase join rows ──────────────────────────────────────────

type RawReqRow = {
  course_id: string | null;
  credits_needed: number | null;
  classes: { title: string; credits: number } | null;
};

export default async function RecommendPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Fetch user profile ────────────────────────────────────────
  const { data: profile } = await supabase
    .from("users")
    .select("major, expected_graduation")
    .eq("id", user.id)
    .single();

  const { major, expected_graduation } = profile ?? {};

  if (!major || !expected_graduation) {
    return (
      <main>
        <Link href="/planning">← Back to Planning</Link>
        <p>
          Your major and expected graduation are required.{" "}
          <Link href="/profile">Complete your profile</Link> first.
        </p>
      </main>
    );
  }

  // ── Build plannable semester list (current → graduation, no summer) ───────
  const currentSem = getCurrentSemesterName();
  const allSemesters = generateSemesterRange(currentSem, expected_graduation, currentSem)
    .filter(s => s.type === "active" || s.type === "upcoming")
    .filter(s => s.term !== "Summer");

  if (allSemesters.length === 0) {
    return (
      <main>
        <Link href="/planning">← Back to Planning</Link>
        <p>No remaining semesters within your graduation window.</p>
      </main>
    );
  }

  // ── Fetch degree requirements for major (with class details) ─────────────
  const { data: reqRows } = await supabase
    .from("degree_requirements")
    .select("course_id, credits_needed, classes(title, credits)")
    .eq("major", major)
    .not("course_id", "is", null);

  // ── Fetch user's already-placed courses ──────────────────────────────────
  const { data: placedRows } = await supabase
    .from("user_courses")
    .select("course_id")
    .eq("user_id", user.id);

  const placedIds = new Set((placedRows ?? []).map(r => r.course_id));

  // ── Compute courses to be taken = required − placed ──────────────────────
  const initialQueue: PlannerCourse[] = ((reqRows ?? []) as unknown as RawReqRow[])
    .filter(r => r.course_id !== null && !placedIds.has(r.course_id))
    .map(r => ({
      course_id: r.course_id!,
      title:     r.classes?.title     ?? r.course_id!,
      credits:   r.classes?.credits   ?? r.credits_needed ?? 3,
    }));

  return (
    <main>
      <header>
        <Link href="/planning">← Back to Planning</Link>
        <h1>Recommended Plan</h1>
        <p>
          {initialQueue.length} course(s) left to schedule across{" "}
          {allSemesters.length} semester(s) &mdash; {major}
        </p>
      </header>

      <RecommendClient
        semesters={allSemesters.map(s => ({
          semester: s.term,
          year:     s.year,
          name:     s.name,
          type:     s.type as "active" | "upcoming",
        }))}
        initialQueue={initialQueue}
      />
    </main>
  );
}
