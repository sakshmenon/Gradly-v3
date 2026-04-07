"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { disconnect } from "@/app/explore/actions";
import type { DemoMutation } from "@/lib/demo/store";
import { DEMO_PEER } from "@/lib/demo/config";

export async function getDemoPeerUserId(): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", DEMO_PEER.email)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data?.id) return { error: "Demo peer profile not found. Run the demo seed script." };
  return { id: data.id as string };
}

/**
 * Reverse demo mutations in reverse order (copy → scheduler → manual add → follow).
 */
export async function undoDemoMutations(mutations: DemoMutation[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const reversed = [...mutations].reverse();

  for (const m of reversed) {
    if (m.kind === "courses") {
      const { error } = await supabase
        .from("user_courses")
        .delete()
        .eq("user_id", user.id)
        .eq("semester", m.term)
        .eq("year", m.year)
        .in("course_id", m.courseIds);
      if (error) return { error: error.message };
    } else if (m.kind === "follow") {
      const r = await disconnect(m.targetUserId);
      if ("error" in r && r.error) return { error: r.error };
    }
  }

  revalidatePath("/");
  revalidatePath("/planning");
  revalidatePath("/explore");
  return { success: true as const };
}
