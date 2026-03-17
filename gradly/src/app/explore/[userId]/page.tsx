import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getYearInSchool } from "@/lib/utils/planning";
import { getSemesterInfo } from "@/lib/utils/semester";
import ConnectButton from "./ConnectButton";

type RawPreviewRow = {
  course_id: string;
  classes: { title: string; credits: number } | null;
};

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: targetId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Viewing your own profile → go to /profile
  if (user.id === targetId) redirect("/profile");

  // ── Fetch target profile (RLS will block if private/inaccessible) ──
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, major, starting_semester, expected_graduation, visibility")
    .eq("id", targetId)
    .single();

  if (!profile) notFound();

  // ── Connection status ─────────────────────────────────────────
  const { data: myFollow } = await supabase
    .from("follows")
    .select("id, status")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .single();

  const connectionState =
    myFollow?.status === "accepted" ? "connected" :
    myFollow?.status === "pending"  ? "pending"   : "none";

  const isConnected = connectionState === "connected";

  // ── Current semester plan preview (connected users only) ──────
  type PreviewCourse = { course_id: string; title: string; credits: number };
  let previewCourses: PreviewCourse[] = [];

  if (isConnected) {
    const sem = getSemesterInfo();
    const [term, yearStr] = sem.name.split(" ");
    const { data: rows } = await supabase
      .from("user_courses")
      .select("course_id, classes(title, credits)")
      .eq("user_id", targetId)
      .eq("semester", term)
      .eq("year", parseInt(yearStr));

    previewCourses = ((rows ?? []) as unknown as RawPreviewRow[])
      .filter((r) => r.classes !== null)
      .map((r) => ({
        course_id: r.course_id,
        title:     r.classes!.title,
        credits:   r.classes!.credits,
      }));
  }

  // ── Derived display fields ────────────────────────────────────
  const yearLabel = profile.starting_semester
    ? getYearInSchool(profile.starting_semester)
    : null;

  const gradYear = profile.expected_graduation
    ? profile.expected_graduation.split(" ")[1]
    : null;

  const currentSemName = getSemesterInfo().name;

  return (
    <main>
      <header>
        <Link href="/explore">← Back to Explore</Link>
        <h1>{profile.display_name ?? "Unknown User"}</h1>
      </header>

      {/* ── Profile info ──────────────────────────────────────── */}
      <section>
        <h2>Profile</h2>
        <ul>
          {yearLabel    && <li><strong>Year:</strong> {yearLabel}</li>}
          {profile.major && <li><strong>Major:</strong> {profile.major}</li>}
          {gradYear      && <li><strong>Expected Graduation:</strong> {profile.expected_graduation}</li>}
        </ul>
      </section>

      {/* ── Connect / disconnect ──────────────────────────────── */}
      <section>
        <ConnectButton targetUserId={targetId} initialState={connectionState} />
      </section>

      <hr />

      {/* ── Plan preview ─────────────────────────────────────── */}
      <section>
        <h2>Current Semester Plan</h2>

        {!isConnected ? (
          <p><em>Connect to see {profile.display_name ?? "their"}&apos;s schedule.</em></p>
        ) : (
          <>
            <p><strong>{currentSemName}</strong></p>

            {previewCourses.length === 0 ? (
              <p><em>No courses recorded for this semester yet.</em></p>
            ) : (
              <ul>
                {previewCourses.map((c) => (
                  <li key={c.course_id}>
                    {c.course_id} — {c.title} ({c.credits} cr)
                  </li>
                ))}
              </ul>
            )}

            <p>
              <Link href={`/explore/${targetId}/schedule`}>
                View full schedule →
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
