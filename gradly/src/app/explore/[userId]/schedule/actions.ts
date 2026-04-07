"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateCoursePlacementForSemester } from "@/app/planning/actions";

/**
 * Copy a list of course IDs to one of the current user's semesters.
 * Same co-op vs study rules as the planner (co-op courses only on co-op terms).
 * Courses the user already has placed (in any semester) are silently skipped
 * thanks to the UNIQUE (user_id, course_id) constraint + ignoreDuplicates.
 */
export async function copySemesterCourses(
  courseIds: string[],
  targetTerm: string,
  targetYear: number,
  targetStatus: "completed" | "in_progress" | "planned"
) {
  if (courseIds.length === 0) return { error: "No courses to copy" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  for (const course_id of courseIds) {
    const v = await validateCoursePlacementForSemester(course_id, targetTerm, targetYear);
    if (v.error) return { error: `${course_id}: ${v.error}` };
  }

  const rows = courseIds.map((course_id) => ({
    user_id:  user.id,
    course_id,
    semester: targetTerm,
    year:     targetYear,
    status:   targetStatus,
  }));

  // upsert with ignoreDuplicates = ON CONFLICT DO NOTHING
  const { error } = await supabase
    .from("user_courses")
    .upsert(rows, { ignoreDuplicates: true });

  if (error) return { error: error.message };

  revalidatePath("/planning");
  revalidatePath("/");
  return { success: true as const };
}
