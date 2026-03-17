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

type PreviewCourse = { course_id: string; title: string; credits: number };

// ── Semester preview card (CSS-only hover — works in server components) ───────

function SemesterCard({
  semesterName,
  isConnected,
  courses,
  viewHref,
}: {
  semesterName: string;
  isConnected:  boolean;
  courses:      PreviewCourse[];
  viewHref:     string;
}) {
  return (
    <div className="relative group min-w-[300px] flex-1 bg-gray-950/40 border border-gray-900 rounded-2xl p-8 transition-all duration-500 h-64 flex flex-col backdrop-blur-md overflow-hidden">

      {/* Content layer — blurred when not connected, blurs on hover when connected */}
      <div
        className={[
          "transition-all duration-500 flex flex-col h-full",
          !isConnected
            ? "blur-lg opacity-20"
            : "group-hover:blur-md group-hover:opacity-30",
        ].join(" ")}
      >
        <div className="flex justify-between items-start mb-6">
          <span className="text-xl font-bold tracking-widest uppercase">{semesterName}</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-800"}`} />
        </div>
        <ul className="space-y-4">
          {courses.slice(0, 4).map((c) => (
            <li
              key={c.course_id}
              className="text-[11px] text-gray-400 tracking-[0.2em] uppercase flex items-center gap-3"
            >
              <div className="w-1 h-px bg-gray-700" />
              {c.course_id}
            </li>
          ))}
          {courses.length === 0 && (
            <li className="text-[11px] text-gray-700 tracking-[0.2em] uppercase flex items-center gap-3">
              <div className="w-1 h-px bg-gray-700" />
              No_Courses_Recorded
            </li>
          )}
        </ul>
      </div>

      {/* Overlay */}
      {!isConnected ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-gray-600 tracking-[0.5em] uppercase font-bold border border-gray-900 px-4 py-2">
            Restricted_Access
          </span>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Link
            href={viewHref}
            className="px-8 py-3 bg-white text-black text-[10px] font-bold tracking-[0.4em] uppercase hover:bg-green-500 transition-colors"
          >
            View_Schedule
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: targetId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === targetId) redirect("/profile");

  // ── Target profile (RLS-gated) ────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, major, starting_semester, expected_graduation, visibility")
    .eq("id", targetId)
    .single();

  if (!profile) notFound();

  // ── Connection status ─────────────────────────────────────────────────────
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

  // ── Current semester preview (connected only) ─────────────────────────────
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

  // ── Derived fields ────────────────────────────────────────────────────────
  const displayName = profile.display_name ?? "Unknown_User";
  const initial     = displayName.charAt(0).toUpperCase();
  const yearLabel   = profile.starting_semester ? getYearInSchool(profile.starting_semester) : null;
  const currentSemName = getSemesterInfo().name;

  return (
    <div className="relative h-full w-full flex flex-col px-24 pt-16 overflow-hidden">

      {/* ── Profile header ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between pb-12 flex-shrink-0">
        <div className="flex items-center gap-12">
          {/* Avatar */}
          <div className="w-28 h-28 rounded-full border border-gray-900 flex items-center justify-center bg-gray-900/10 backdrop-blur-sm flex-shrink-0">
            <span className="text-5xl font-bold">{initial}</span>
          </div>

          {/* Name + info */}
          <div>
            <h1 className="text-5xl font-bold tracking-tighter uppercase italic mb-4">
              {displayName}
            </h1>
            <div className="flex gap-8 text-[10px] tracking-[0.3em] text-gray-500 uppercase">
              {yearLabel && (
                <span className="flex flex-col gap-1">
                  <b className="text-gray-700 text-[9px]">Year</b>
                  {yearLabel}
                </span>
              )}
              {profile.major && (
                <span className="flex flex-col gap-1">
                  <b className="text-gray-700 text-[9px]">Major</b>
                  {profile.major.replace(/ /g, "_")}
                </span>
              )}
              {profile.expected_graduation && (
                <span className="flex flex-col gap-1">
                  <b className="text-gray-700 text-[9px]">Grad_Term</b>
                  {profile.expected_graduation.replace(/ /g, "_")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Connect button */}
        <ConnectButton targetUserId={targetId} initialState={connectionState} />
      </header>

      {/* Divider */}
      <div className="w-full h-px bg-gray-900 flex-shrink-0" />

      {/* ── Schedule preview section ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col pt-10 overflow-hidden">
        <h3 className="text-gray-700 text-[10px] tracking-[0.6em] uppercase mb-8 pl-2">
          Temporal_Data_Feed
        </h3>

        <div className="flex gap-8 overflow-x-auto pb-10 scrollbar-hide">
          <SemesterCard
            semesterName={currentSemName.toUpperCase()}
            isConnected={isConnected}
            courses={previewCourses}
            viewHref={`/explore/${targetId}/schedule`}
          />
        </div>

        {/* Back link */}
        <Link
          href="/explore"
          className="mt-auto mb-10 text-[9px] text-gray-800 tracking-[0.5em] hover:text-white uppercase transition-colors self-start underline underline-offset-8"
        >
          Return_to_Network
        </Link>
      </div>
    </div>
  );
}
