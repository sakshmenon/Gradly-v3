"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function trimOrNull(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v == null || typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function trimOrEmpty(formData: FormData, key: string): string {
  const v = formData.get(key);
  if (v == null || typeof v !== "string") return "";
  return v.trim();
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const display_name        = trimOrNull(formData, "display_name");
  const major               = trimOrNull(formData, "major");
  const starting_semester   = trimOrNull(formData, "starting_semester");
  const expected_graduation = trimOrNull(formData, "expected_graduation");
  const gpa_str             = trimOrEmpty(formData, "gpa");
  const gpa                 = gpa_str !== "" ? parseFloat(gpa_str) : null;

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
