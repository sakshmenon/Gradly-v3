import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExploreClient from "./ExploreClient";

export default async function ExplorePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main>
      <header>
        <h1>Explore</h1>
        <Link href="/">← Back to Home</Link>
      </header>

      <ExploreClient currentUserId={user.id} />
    </main>
  );
}
