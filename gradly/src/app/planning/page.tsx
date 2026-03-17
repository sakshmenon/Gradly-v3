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
  grade: string | null;
  classes: { course_id: string; title: string; credits: number } | null;
};

export default async function PlanningPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("starting_semester, expected_graduation")
    .eq("id", user.id)
    .single();

  const { starting_semester, expected_graduation } = profile ?? {};

  // ── Profile incomplete fallback ───────────────────────────────────────────
  if (!starting_semester || !expected_graduation) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md px-8">
          <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase mb-4">
            Planning_Unavailable
          </p>
          <h2 className="text-3xl font-bold text-white uppercase mb-6">
            Profile_Incomplete
          </h2>
          <p className="text-gray-500 text-sm mb-10 leading-relaxed">
            Set your starting semester and expected graduation before accessing the planner.
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

  // ── Build semester list ───────────────────────────────────────────────────
  const currentSem = getCurrentSemesterName();
  const semesters  = generateSemesterRange(starting_semester, expected_graduation, currentSem);

  // ── Fetch placed courses ──────────────────────────────────────────────────
  const { data: rawCourses } = await supabase
    .from("user_courses")
    .select("id, semester, year, status, grade, classes(course_id, title, credits)")
    .eq("user_id", user.id);

  const coursesBySemester: Record<string, CourseEntry[]> = {};
  for (const row of (rawCourses ?? []) as unknown as RawCourseRow[]) {
    if (!row.classes) continue;
    const key = `${row.semester} ${row.year}`;
    if (!coursesBySemester[key]) coursesBySemester[key] = [];
    coursesBySemester[key].push({
      id:        row.id,
      course_id: row.classes.course_id,
      title:     row.classes.title,
      credits:   row.classes.credits,
      status:    row.status,
      grade:     row.grade,
    });
  }

  return (
    <PlanningClient
      semesters={semesters}
      coursesBySemester={coursesBySemester}
    />
  );
}
