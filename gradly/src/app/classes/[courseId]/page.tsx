import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClassInfoClient, { type ReviewDisplay } from "./ClassInfoClient";

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

  const rawReviews = (reviewRows ?? []) as unknown as RawReviewRow[];

  const reviews: ReviewDisplay[] = rawReviews.map((r) => ({
    id:             r.id,
    user_id:        r.user_id,
    stars:          r.stars,
    semester_taken: r.semester_taken,
    professor_name: r.professor_name,
    difficulty:     r.difficulty,
    workload:       r.workload,
    review_text:    r.review_text,
    created_at:     r.created_at,
    display_name:   r.users?.display_name ?? null,
  }));

  // ── Review stats ─────────────────────────────────────────────
  let avgStars = 0;
  let avgDifficulty: number | null = null;
  let avgWorkload: number | null = null;

  if (reviews.length > 0) {
    avgStars = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
    const withDiff = reviews.filter((r) => r.difficulty != null && r.difficulty > 0);
    const withWork = reviews.filter((r) => r.workload != null && r.workload > 0);
    if (withDiff.length > 0) {
      avgDifficulty = withDiff.reduce((s, r) => s + (r.difficulty ?? 0), 0) / withDiff.length;
    }
    if (withWork.length > 0) {
      avgWorkload = withWork.reduce((s, r) => s + (r.workload ?? 0), 0) / withWork.length;
    }
  }

  const myReviewRaw = rawReviews.find(r => r.user_id === user.id);
  const existingReview = myReviewRaw
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
    <ClassInfoClient
      courseId={courseId}
      cls={{
        course_id:  cls.course_id,
        title:      cls.title,
        credits:    cls.credits,
        subject:    cls.subject,
        description: cls.description,
      }}
      hasTaken={hasTaken}
      currentGrade={userCourse?.grade ?? null}
      gradeStats={{
        avgGpa,
        gradeCounts,
        totalGradeEntries,
        sortedGrades,
      }}
      reviews={reviews}
      reviewStats={{
        avgStars,
        avgDifficulty,
        avgWorkload,
        totalReviews: reviews.length,
      }}
      existingReview={existingReview}
    />
  );
}
