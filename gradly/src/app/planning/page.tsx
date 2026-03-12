import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { generateSemesterRange, getCurrentSemesterName } from "@/lib/utils/planning";
import PlanningClient, { type CourseEntry } from "./PlanningClient";

type RawCourseRow = {
  id: string;
  semester: string;
  year: number;
  status: string;
  classes: { course_id: string; title: string; credits: number } | null;
};

export default async function PlanningPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Fetch profile fields needed for planning ──────────────────
  const { data: profile } = await supabase
    .from("users")
    .select("starting_semester, expected_graduation")
    .eq("id", user.id)
    .single();

  const { starting_semester, expected_graduation } = profile ?? {};

  if (!starting_semester || !expected_graduation) {
    return (
      <main>
        <header>
          <h1>Planning</h1>
          <Link href="/">← Back to Home</Link>
        </header>
        <p>
          Your starting semester and expected graduation are not set.{" "}
          <Link href="/profile">Complete your profile</Link> to use the planning page.
        </p>
      </main>
    );
  }

  // ── Build semester list ───────────────────────────────────────
  const currentSem = getCurrentSemesterName();
  const semesters  = generateSemesterRange(starting_semester, expected_graduation, currentSem);

  // ── Fetch the user's placed courses with class details ────────
  const { data: rawCourses } = await supabase
    .from("user_courses")
    .select("id, semester, year, status, classes(course_id, title, credits)")
    .eq("user_id", user.id);

  // Group courses by "Term YYYY" key
  const coursesBySemester: Record<string, CourseEntry[]> = {};
  for (const row of (rawCourses ?? []) as unknown as RawCourseRow[]) {
    if (!row.classes) continue;
    const key = `${row.semester} ${row.year}`;
    if (!coursesBySemester[key]) coursesBySemester[key] = [];
    coursesBySemester[key].push({
      id:       row.id,
      course_id: row.classes.course_id,
      title:    row.classes.title,
      credits:  row.classes.credits,
      status:   row.status,
    });
  }

  return (
    <main>
      <header>
        <h1>Planning</h1>
        <p>
          {starting_semester} → {expected_graduation}
        </p>
        <Link href="/">← Back to Home</Link>
      </header>

      <PlanningClient
        semesters={semesters}
        coursesBySemester={coursesBySemester}
      />
    </main>
  );
}
