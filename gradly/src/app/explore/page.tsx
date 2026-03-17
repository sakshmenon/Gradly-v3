import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExploreClient from "./ExploreClient";

export default async function ExplorePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ExploreClient currentUserId={user.id} />;
}
