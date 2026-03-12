"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCourseToSemester(
  courseId: string,
  term: string,
  year: number,
  status: "completed" | "in_progress" | "planned"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("user_courses").insert({
    user_id:  user.id,
    course_id: courseId,
    semester: term,
    year,
    status,
  });

  if (error) return { error: error.message };
  revalidatePath("/planning");
  revalidatePath("/");
  return { success: true as const };
}

export async function removeCourseFromSemester(userCourseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_courses")
    .delete()
    .eq("id", userCourseId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/planning");
  revalidatePath("/");
  return { success: true as const };
}
