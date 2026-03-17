import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSemesterInfo } from "@/lib/utils/semester";
import { getPastSemesterNames } from "@/lib/utils/planning";
import DashboardClient from "./DashboardClient";

const TOTAL_CREDITS_REQUIRED = 120;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Profile ───────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, gpa, major, starting_semester, expected_graduation")
    .eq("id", user.id)
    .single();

  // ── All placed courses (degree progress + past-semester check) ────────────
  const { data: allCourseRows } = await supabase
    .from("user_courses")
    .select("semester, year, status, classes(credits)")
    .eq("user_id", user.id);

  const completedCredits: number = (allCourseRows ?? [])
    .filter((r) => r.status === "completed")
    .reduce((sum, row) => {
      const credits =
        (row.classes as unknown as { credits: number } | null)?.credits ?? 0;
      return sum + credits;
    }, 0);

  const degreeProgressPct = Math.min(
    100,
    TOTAL_CREDITS_REQUIRED > 0
      ? Math.round((completedCredits / TOTAL_CREDITS_REQUIRED) * 100)
      : 0
  );

  // ── Semester info ─────────────────────────────────────────────────────────
  const semester = getSemesterInfo();

  // ── Display values ────────────────────────────────────────────────────────
  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "user";
  const gpaDisplay  = profile?.gpa != null ? profile.gpa.toFixed(1) : "N/A";

  // ── Alerts ────────────────────────────────────────────────────────────────
  const profileComplete = !!(
    profile?.display_name &&
    profile?.major &&
    profile?.starting_semester &&
    profile?.expected_graduation
  );

  let hasEmptyPastSems = false;
  if (profile?.starting_semester) {
    const pastSems   = getPastSemesterNames(profile.starting_semester, semester.name);
    const filledSems = new Set(
      (allCourseRows ?? []).map((r) => `${r.semester} ${r.year}`)
    );
    hasEmptyPastSems = pastSems.some((s) => !filledSems.has(s));
  }

  const alerts = (profileComplete ? 0 : 1) + (hasEmptyPastSems ? 1 : 0);

  return (
    <DashboardClient
      displayName={displayName}
      semesterName={semester.name}
      week={semester.week}
      degreeProgressPct={degreeProgressPct}
      semesterProgressPct={semester.progressPct}
      gpaDisplay={gpaDisplay}
      alerts={alerts}
    />
  );
}
