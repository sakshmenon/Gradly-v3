import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReviewForm, { type ExistingReview } from "./ReviewForm";

// ── GPA mapping for average grade computation ─────────────────────────────────
const GRADE_TO_GPA: Record<string, number> = {
  "A": 4.0,  "A-": 3.7,
  "B+": 3.3, "B": 3.0,  "B-": 2.7,
  "C+": 2.3, "C": 2.0,  "C-": 1.7,
  "D+": 1.3, "D": 1.0,  "D-": 0.7,
  "F":  0.0,
};

// ── Raw join row types ────────────────────────────────────────────────────────

type RawReviewRow = {
  id:             string;
  user_id:        string;
  stars:          number;
  semester_taken: string | null;
  professor_name: string | null;
  difficulty:     number | null;
  workload:       number | null;
  review_text:    string | null;
  created_at:     string;
  users: { display_name: string | null } | null;
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ClassInfoPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId: rawCourseId } = await params;
  const courseId = decodeURIComponent(rawCourseId);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Class details ─────────────────────────────────────────────
  const { data: cls } = await supabase
    .from("classes")
    .select("course_id, title, credits, description, subject")
    .eq("course_id", courseId)
    .single();

  if (!cls) notFound();

  // ── Current user's course record (if any) ────────────────────
  const { data: userCourse } = await supabase
    .from("user_courses")
    .select("id, status, grade")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();

  const hasTaken = userCourse?.status === "completed";

  // ── Grade statistics (visible via RLS) ───────────────────────
  const { data: gradeRows } = await supabase
    .from("user_courses")
    .select("grade")
    .eq("course_id", courseId)
    .not("grade", "is", null)
    .neq("grade", "");

  const gradeCounts: Record<string, number> = {};
  let gpaSum = 0, gpaCount = 0;

  for (const row of gradeRows ?? []) {
    const g = (row.grade as string).trim().toUpperCase();
    if (!g) continue;
    gradeCounts[g] = (gradeCounts[g] ?? 0) + 1;
    if (g in GRADE_TO_GPA) {
      gpaSum += GRADE_TO_GPA[g];
      gpaCount++;
    }
  }

  const totalGradeEntries = Object.values(gradeCounts).reduce((s, n) => s + n, 0);
  const avgGpa = gpaCount > 0 ? (gpaSum / gpaCount).toFixed(2) : null;

  // Sort grades in standard order for display
  const GRADE_ORDER = [
    "A", "A-", "B+", "B", "B-",
    "C+", "C", "C-", "D+", "D", "D-",
    "F", "W", "I", "P",
  ];
  const sortedGrades = GRADE_ORDER.filter(g => g in gradeCounts);

  // ── Reviews ───────────────────────────────────────────────────
  const { data: reviewRows } = await supabase
    .from("course_ratings")
    .select(
      "id, user_id, stars, semester_taken, professor_name, difficulty, workload, review_text, created_at, users(display_name)"
    )
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  const reviews = (reviewRows ?? []) as unknown as RawReviewRow[];

  // Pull out this user's own review (if any) for pre-filling the form
  const myReviewRaw = reviews.find(r => r.user_id === user.id);
  const existingReview: ExistingReview | null = myReviewRaw
    ? {
        stars:          myReviewRaw.stars,
        semester_taken: myReviewRaw.semester_taken,
        professor_name: myReviewRaw.professor_name,
        difficulty:     myReviewRaw.difficulty,
        workload:       myReviewRaw.workload,
        review_text:    myReviewRaw.review_text,
      }
    : null;

  return (
    <main>
      <header>
        <Link href="/planning">← Back to Planning</Link>
        <h1>{cls.course_id} — {cls.title}</h1>
        <p>
          {cls.subject} &middot; {cls.credits} credits
        </p>
        {cls.description && <p>{cls.description}</p>}
      </header>

      {/* ── 1. Grade Statistics ─────────────────────────────────── */}
      <section>
        <h2>Grade Statistics</h2>

        {totalGradeEntries === 0 ? (
          <p><em>No grade data recorded yet.</em></p>
        ) : (
          <>
            {avgGpa && (
              <p>
                <strong>Average GPA Equivalent:</strong> {avgGpa} / 4.0
                {" "}
                <small>
                  (based on {gpaCount} letter grade{gpaCount !== 1 ? "s" : ""})
                </small>
              </p>
            )}

            <h3>Grade Distribution</h3>
            <ul>
              {sortedGrades.map(g => {
                const count = gradeCounts[g];
                const pct   = Math.round((count / totalGradeEntries) * 100);
                return (
                  <li key={g}>
                    <strong>{g}</strong>: {count} ({pct}%)
                  </li>
                );
              })}
              {/* Grades not in standard order (e.g. institution-specific) */}
              {Object.entries(gradeCounts)
                .filter(([g]) => !GRADE_ORDER.includes(g))
                .map(([g, count]) => (
                  <li key={g}>
                    <strong>{g}</strong>: {count} ({Math.round((count / totalGradeEntries) * 100)}%)
                  </li>
                ))}
            </ul>

            <p>
              <small>
                Data sourced from {totalGradeEntries} Gradly user
                {totalGradeEntries !== 1 ? "s" : ""} with public profiles.
              </small>
            </p>
          </>
        )}
      </section>

      <hr />

      {/* ── 2. Student Reviews ──────────────────────────────────── */}
      <section>
        <h2>Student Reviews</h2>

        {reviews.length === 0 ? (
          <p><em>No reviews yet. Be the first!</em></p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {reviews.map(r => (
              <li key={r.id} style={{ marginBottom: "1rem" }}>
                <strong>
                  {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
                </strong>
                {" "}
                by {r.users?.display_name ?? "Anonymous"}
                {r.professor_name && <> &middot; {r.professor_name}</>}
                {r.semester_taken  && <> &middot; {r.semester_taken}</>}
                {(r.difficulty || r.workload) && (
                  <>
                    {r.difficulty && <> &middot; Difficulty: {r.difficulty}/5</>}
                    {r.workload   && <> &middot; Workload: {r.workload}/5</>}
                  </>
                )}
                {r.review_text && <p>{r.review_text}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr />

      {/* ── 3. Review form ──────────────────────────────────────── */}
      <section>
        <ReviewForm
          courseId={courseId}
          hasTaken={hasTaken}
          currentGrade={userCourse?.grade ?? null}
          existingReview={existingReview}
        />
      </section>
    </main>
  );
}
