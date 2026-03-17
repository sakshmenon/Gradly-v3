"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReviewInput = {
  stars:          number;
  semester_taken?: string;
  professor_name?: string;
  difficulty?:    number | null;
  workload?:      number | null;
  review_text?:   string;
};

/** Upsert a review for a course. One review per user per course. */
export async function submitReview(courseId: string, input: ReviewInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (input.stars < 1 || input.stars > 5) return { error: "Stars must be between 1 and 5" };

  const { error } = await supabase
    .from("course_ratings")
    .upsert(
      {
        user_id:        user.id,
        course_id:      courseId,
        stars:          input.stars,
        semester_taken: input.semester_taken?.trim() || null,
        professor_name: input.professor_name?.trim() || null,
        difficulty:     input.difficulty    ?? null,
        workload:       input.workload      ?? null,
        review_text:    input.review_text?.trim() || null,
      },
      { onConflict: "user_id,course_id" }
    );

  if (error) return { error: error.message };
  revalidatePath(`/classes/${encodeURIComponent(courseId)}`);
  return { success: true as const };
}

/** Update the grade stored against the user's user_courses record for this class. */
export async function updateGrade(courseId: string, grade: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_courses")
    .update({ grade: grade?.trim() || null })
    .eq("user_id", user.id)
    .eq("course_id", courseId);

  if (error) return { error: error.message };
  revalidatePath(`/classes/${encodeURIComponent(courseId)}`);
  revalidatePath("/planning");
  return { success: true as const };
}
