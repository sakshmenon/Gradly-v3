import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSemesterInfo } from "@/lib/utils/semester";

const TOTAL_CREDITS_REQUIRED = 120; // default until degree_requirements is fully seeded

export default async function HomePage() {
  const supabase = await createClient();

  // Verify session server-side
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Fetch user profile ────────────────────────────────────────
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, gpa, major")
    .eq("id", user.id)
    .single();

  // ── Fetch completed credits ───────────────────────────────────
  // user_courses.course_id → classes.course_id (FK)
  const { data: completedRows } = await supabase
    .from("user_courses")
    .select("classes(credits)")
    .eq("user_id", user.id)
    .eq("status", "completed");

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
  const alerts      = 0; // alerts system not yet implemented

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
