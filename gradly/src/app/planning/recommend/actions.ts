"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PlannerCourse } from "@/lib/utils/pathfinder";

/**
 * Persist the approved courses for one semester.
 * Uses upsert + ignoreDuplicates so courses the user already has
 * (in any semester) are silently skipped.
 */
export async function approveSemester(
  courses: PlannerCourse[],
  term:    string,
  year:    number,
  status:  "in_progress" | "planned"
) {
  if (courses.length === 0) return { success: true as const }; // nothing to save

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rows = courses.map(c => ({
    user_id:   user.id,
    course_id: c.course_id,
    semester:  term,
    year,
    status,
  }));

  const { error } = await supabase
    .from("user_courses")
    .upsert(rows, { ignoreDuplicates: true });

  if (error) return { error: error.message };

  revalidatePath("/planning");
  revalidatePath("/");
  return { success: true as const };
}
