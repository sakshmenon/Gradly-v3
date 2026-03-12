import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, major, starting_semester, expected_graduation, gpa")
    .eq("id", user.id)
    .single();

  return (
    <main>
      <header>
        <h1>Profile</h1>
        <Link href="/">← Back to Home</Link>
      </header>

      <section>
        <ProfileForm
          profile={{
            display_name:        profile?.display_name        ?? null,
            email:               user.email                   ?? "",
            major:               profile?.major               ?? null,
            starting_semester:   profile?.starting_semester   ?? null,
            expected_graduation: profile?.expected_graduation ?? null,
            gpa:                 profile?.gpa                 ?? null,
          }}
        />
      </section>
    </main>
  );
}
