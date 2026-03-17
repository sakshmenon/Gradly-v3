import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  generateSemesterRange,
  getCurrentSemesterName,
  type Semester,
} from "@/lib/utils/planning";
import CopySemesterButton from "./CopySemesterButton";

type RawCourseRow = {
  id: string;
  semester: string;
  year: number;
  status: string;
  classes: { course_id: string; title: string; credits: number } | null;
};

type CourseEntry = {
  id: string;
  course_id: string;
  title: string;
  credits: number;
  status: string;
};

export default async function UserSchedulePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: targetId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === targetId) redirect("/planning");

  // ── Verify connection ─────────────────────────────────────────
  const { data: myFollow } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .single();

  if (myFollow?.status !== "accepted") {
    return (
      <main>
        <Link href={`/explore/${targetId}`}>← Back to Profile</Link>
        <p>You must be connected to view this schedule.</p>
      </main>
    );
  }

  // ── Fetch target profile ──────────────────────────────────────
  const { data: targetProfile } = await supabase
    .from("users")
    .select("display_name, starting_semester, expected_graduation")
    .eq("id", targetId)
    .single();

  if (!targetProfile) notFound();

  const { starting_semester, expected_graduation } = targetProfile;

  if (!starting_semester || !expected_graduation) {
    return (
      <main>
        <Link href={`/explore/${targetId}`}>← Back to Profile</Link>
        <p>
          {targetProfile.display_name ?? "This user"} has not set their semester range yet.
        </p>
      </main>
    );
  }

  // ── Fetch current user's profile for the copy-target list ─────
  const { data: myProfile } = await supabase
    .from("users")
    .select("starting_semester, expected_graduation")
    .eq("id", user.id)
    .single();

  const currentSem = getCurrentSemesterName();

  // Target's semesters (for display)
  const targetSemesters = generateSemesterRange(
    starting_semester,
    expected_graduation,
    currentSem
  );

  // Current user's semesters (for the copy dropdown)
  const mySemesters: Semester[] =
    myProfile?.starting_semester && myProfile?.expected_graduation
      ? generateSemesterRange(
          myProfile.starting_semester,
          myProfile.expected_graduation,
          currentSem
        )
      : [];

  // ── Fetch target's courses ────────────────────────────────────
  const { data: rawCourses } = await supabase
    .from("user_courses")
    .select("id, semester, year, status, classes(course_id, title, credits)")
    .eq("user_id", targetId);

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
    });
  }

  const TYPE_LABEL: Record<Semester["type"], string> = {
    past:     "[PAST]",
    active:   "[CURRENT]",
    upcoming: "[UPCOMING]",
  };

  return (
    <main>
      <header>
        <Link href={`/explore/${targetId}`}>← Back to Profile</Link>
        <h1>{targetProfile.display_name ?? "User"}&apos;s Schedule</h1>
        <p>
          {starting_semester} → {expected_graduation}
        </p>
      </header>

      {mySemesters.length === 0 && (
        <p>
          <em>
            <Link href="/profile">Complete your profile</Link> to enable copying
            semesters to your own plan.
          </em>
        </p>
      )}

      {targetSemesters.map((sem) => {
        const courses   = coursesBySemester[sem.name] ?? [];
        const courseIds = courses.map((c) => c.course_id);

        return (
          <div key={sem.name}>
            <h3>
              {sem.name} {TYPE_LABEL[sem.type]}
            </h3>

            {courses.length === 0 ? (
              <p><em>No courses recorded.</em></p>
            ) : (
              <>
                <ul>
                  {courses.map((c) => (
                    <li key={c.id}>
                      {c.course_id} — {c.title} ({c.credits} cr) [{c.status}]
                    </li>
                  ))}
                </ul>

                <CopySemesterButton
                  sourceCourseIds={courseIds}
                  userSemesters={mySemesters}
                />
              </>
            )}
          </div>
        );
      })}
    </main>
  );
}
