"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const display_name       = (formData.get("display_name") as string).trim() || null;
  const major              = (formData.get("major") as string).trim() || null;
  const starting_semester  = (formData.get("starting_semester") as string) || null;
  const expected_graduation = (formData.get("expected_graduation") as string) || null;
  const gpa_str            = formData.get("gpa") as string;
  const gpa                = gpa_str !== "" ? parseFloat(gpa_str) : null;

  const { error } = await supabase
    .from("users")
    .update({ display_name, major, starting_semester, expected_graduation, gpa })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/");
  return { success: true as const };
}

export async function sendPasswordResetEmail() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated" };

  const { error } = await supabase.auth.resetPasswordForEmail(user.email);
  if (error) return { error: error.message };
  return { success: true as const };
}
