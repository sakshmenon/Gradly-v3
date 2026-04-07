"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PlannerCourse } from "@/lib/utils/pathfinder";
import { validateCoursePlacementForSemester } from "../actions";

/**
 * Persist the approved courses for one semester.
 * Validates co-op vs study rules (same as manual planner) before upsert.
 */
export async function approveSemester(
  courses: PlannerCourse[],
  term:    string,
  year:    number,
  status:  "in_progress" | "planned"
) {
  if (courses.length === 0) return { success: true as const };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: modeRow } = await supabase
    .from("user_semester_modes")
    .select("is_coop")
    .eq("user_id", user.id)
    .eq("semester", term)
    .eq("year", year)
    .maybeSingle();

  const isCoopSemester = modeRow?.is_coop === true;
  if (isCoopSemester && courses.length !== 1) {
    return {
      error:
        "A co-op semester must schedule exactly one course: the next catalog co-op placement.",
    };
  }

  for (const c of courses) {
    const v = await validateCoursePlacementForSemester(c.course_id, term, year);
    if (v.error) return { error: v.error };
  }

  const rows = courses.map((c) => ({
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
  revalidatePath("/planning/recommend");
  revalidatePath("/");
  return { success: true as const };
}
