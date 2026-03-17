"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Send a connection request to another user.
 * MVP: auto-accepts immediately so the connected experience is testable.
 * If they already sent us a pending request, we accept it instead.
 */
export async function connect(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (user.id === targetUserId) return { error: "Cannot connect with yourself" };

  // If they already sent us a pending request, accept it on their row
  const { data: incoming } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", targetUserId)
    .eq("following_id", user.id)
    .single();

  if (incoming) {
    await supabase
      .from("follows")
      .update({ status: "accepted" })
      .eq("id", incoming.id);
  }

  // Insert our outgoing follow row (auto-accepted for MVP)
  const { error } = await supabase.from("follows").insert({
    follower_id:  user.id,
    following_id: targetUserId,
    status:       "accepted",
  });

  if (error?.code === "23505") return { error: "Already connected" };
  if (error) return { error: error.message };

  revalidatePath(`/explore/${targetUserId}`);
  return { success: true as const };
}

/** Remove an outgoing follow (disconnect). */
export async function disconnect(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId);

  if (error) return { error: error.message };

  revalidatePath(`/explore/${targetUserId}`);
  return { success: true as const };
}
