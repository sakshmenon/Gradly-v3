import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSemesterInfo } from "@/lib/utils/semester";
import { getPastSemesterNames } from "@/lib/utils/planning";

const TOTAL_CREDITS_REQUIRED = 120; // default until degree_requirements is fully seeded

export default async function HomePage() {
  const supabase = await createClient();

  // Verify session server-side
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Fetch user profile ────────────────────────────────────────
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, gpa, major, starting_semester, expected_graduation")
    .eq("id", user.id)
    .single();

  // ── Fetch all placed courses (used for degree progress + past-semester check)
  const { data: allCourseRows } = await supabase
    .from("user_courses")
    .select("semester, year, status, classes(credits)")
    .eq("user_id", user.id);

  // Subset: completed rows for degree progress calculation
  const completedRows = (allCourseRows ?? []).filter(r => r.status === "completed");

  const completedCredits: number = (completedRows ?? []).reduce((sum, row) => {
    const credits = (row.classes as unknown as { credits: number } | null)?.credits ?? 0;
    return sum + credits;
  }, 0);

  const degreeProgressPct = Math.min(
    100,
    TOTAL_CREDITS_REQUIRED > 0
      ? Math.round((completedCredits / TOTAL_CREDITS_REQUIRED) * 100)
      : 0
  );

  // ── Semester progress (pure calculation) ─────────────────────
  const semester = getSemesterInfo();

  // ── Display values ────────────────────────────────────────────
  const displayName = profile?.display_name ?? user.email ?? "Student";
  const gpa         = profile?.gpa != null ? profile.gpa.toFixed(2) : "N/A";

  // ── Alert 1: incomplete profile ───────────────────────────────
  const profileComplete = !!(
    profile?.display_name &&
    profile?.major &&
    profile?.starting_semester &&
    profile?.expected_graduation
  );

  // ── Alert 2: past semesters with no recorded courses ──────────
  let hasEmptyPastSems = false;
  if (profile?.starting_semester) {
    const pastSems   = getPastSemesterNames(profile.starting_semester, semester.name);
    const filledSems = new Set(
      (allCourseRows ?? []).map(r => `${r.semester} ${r.year}`)
    );
    hasEmptyPastSems = pastSems.some(s => !filledSems.has(s));
  }

  const alerts = (profileComplete ? 0 : 1) + (hasEmptyPastSems ? 1 : 0);

  return (
    <main>
      <header>
        <h1>Gradly</h1>
        <p>
          {semester.name}, Week {semester.week} &mdash; Welcome, {displayName}
        </p>
        <form action="/auth/signout" method="post">
          <button type="submit">Log Out</button>
        </form>
      </header>

      <section>
        <h2>Overview</h2>
        <ul>
          <li>
            <strong>Degree Progress</strong>
            <br />
            {degreeProgressPct}%{" "}
            <small>({completedCredits} / {TOTAL_CREDITS_REQUIRED} credits completed)</small>
          </li>
          <li>
            <strong>Semester Progress</strong>
            <br />
            {semester.progressPct}%{" "}
            <small>
              (Day {semester.daysPassed} of {semester.totalDays} &mdash; {semester.name})
            </small>
          </li>
          <li>
            <strong>GPA</strong>
            <br />
            {gpa}
          </li>
          <li>
            <strong>Alerts</strong>
            <br />
            {alerts}
            {!profileComplete && (
              <div>&mdash; <a href="/profile">Complete your profile</a></div>
            )}
            {hasEmptyPastSems && (
              <div>&mdash; <a href="/planning">Past semesters need to be filled</a></div>
            )}
          </li>
        </ul>
      </section>

      <nav>
        <h2>Navigation</h2>
        <ul>
          <li><Link href="/planning">Planning</Link></li>
          <li><Link href="/explore">Explore</Link></li>
          <li><Link href="/profile">Profile</Link></li>
        </ul>
      </nav>
    </main>
  );
}
