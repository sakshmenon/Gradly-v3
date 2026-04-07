import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  generateSemesterRange,
  getCurrentSemesterName,
  type Semester,
} from "@/lib/utils/planning";
import CopySemesterButton from "./CopySemesterButton";
import DemoCopyFallback from "./DemoCopyFallback";
import { DEMO_PEER_COPY_TERM, DEMO_PEER_COPY_YEAR } from "@/lib/demo/config";

type RawCourseRow = {
  id: string;
  semester: string;
  year: number;
  status: string;
  classes: { course_id: string; title: string; credits: number } | null;
};

type CourseEntry = {
  id: string;
  course_id: string;
  title: string;
  credits: number;
  status: string;
};

const YEAR_LABELS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

function groupByAcademicYear(semesters: Semester[]) {
  const groups = new Map<number, Semester[]>();
  for (const s of semesters) {
    const acYear = s.term === "Fall" ? s.year : s.year - 1;
    if (!groups.has(acYear)) groups.set(acYear, []);
    groups.get(acYear)!.push(s);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a - b);
}

export default async function UserSchedulePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: targetId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === targetId) redirect("/planning");

  // ── Verify accepted connection ────────────────────────────────────────────
  const { data: myFollow } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .single();

  if (myFollow?.status !== "accepted") {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md px-8">
          <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase mb-4">Access_Restricted</p>
          <h2 className="text-3xl font-bold text-white uppercase mb-8">Connection_Required</h2>
          <Link
            href={`/explore/${targetId}`}
            className="px-8 py-4 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-green-500 transition-colors"
          >
            Return_To_Profile →
          </Link>
        </div>
      </div>
    );
  }

  // ── Target profile ────────────────────────────────────────────────────────
  const { data: targetProfile } = await supabase
    .from("users")
    .select("display_name, starting_semester, expected_graduation")
    .eq("id", targetId)
    .single();

  if (!targetProfile) notFound();

  const { starting_semester, expected_graduation } = targetProfile;

  if (!starting_semester || !expected_graduation) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md px-8">
          <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase mb-4">Data_Unavailable</p>
          <h2 className="text-3xl font-bold text-white uppercase mb-8">
            {targetProfile.display_name ?? "This_User"}&apos;s semester range is not configured.
          </h2>
          <Link
            href={`/explore/${targetId}`}
            className="px-8 py-4 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-green-500 transition-colors"
          >
            Return_To_Profile →
          </Link>
        </div>
      </div>
    );
  }

  // ── Current user's semesters (for copy dropdown) ──────────────────────────
  const { data: myProfile } = await supabase
    .from("users")
    .select("starting_semester, expected_graduation")
    .eq("id", user.id)
    .single();

  const currentSem = getCurrentSemesterName();

  const targetSemesters = generateSemesterRange(
    starting_semester,
    expected_graduation,
    currentSem
  );

  const mySemesters: Semester[] =
    myProfile?.starting_semester && myProfile?.expected_graduation
      ? generateSemesterRange(
          myProfile.starting_semester,
          myProfile.expected_graduation,
          currentSem
        )
      : [];

  // ── Target's courses ──────────────────────────────────────────────────────
  const { data: rawCourses } = await supabase
    .from("user_courses")
    .select("id, semester, year, status, classes(course_id, title, credits)")
    .eq("user_id", targetId);

  const coursesBySemester: Record<string, CourseEntry[]> = {};
  for (const row of (rawCourses ?? []) as unknown as RawCourseRow[]) {
    if (!row.classes) continue;
    const key = `${row.semester} ${row.year}`;
    if (!coursesBySemester[key]) coursesBySemester[key] = [];
    coursesBySemester[key].push({
      id:        row.id,
      course_id: row.classes.course_id,
      title:     row.classes.title,
      credits:   row.classes.credits,
      status:    row.status,
    });
  }

  const groupedSemesters = groupByAcademicYear(targetSemesters);
  const startAcYear = groupedSemesters[0]?.[0] ?? 0;

  return (
    <div className="relative h-full w-full flex flex-col px-16 pt-16 overflow-y-auto scrollbar-hide">
      <DemoCopyFallback />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-20 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-[0.2em] uppercase mb-2">
            {targetProfile.display_name ?? "User"}
          </h2>
          <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase">
            Academic_Trajectory_Full_Access
          </p>
        </div>
        <Link
          href={`/explore/${targetId}`}
          className="text-[10px] text-gray-500 hover:text-white uppercase border border-gray-800 px-6 py-3 tracking-widest transition-all hover:border-white"
        >
          Exit_Log
        </Link>
      </div>

      {/* ── Semester grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-16 pb-20">
        {groupedSemesters.map(([acYear, yearSems]) => {
          const offset   = acYear - startAcYear;
          const yearLabel = YEAR_LABELS[offset] ?? `Year ${offset + 1}`;

          return (
            <div key={acYear} className="flex flex-col gap-6">
              <h4 className="text-[10px] text-green-500 tracking-[0.8em] uppercase border-l border-green-500 pl-4">
                {yearLabel}
              </h4>

              <div className="flex gap-6">
                {yearSems.map((sem) => {
                  const courses   = coursesBySemester[sem.name] ?? [];
                  const courseIds = courses.map((c) => c.course_id);
                  const totalCr   = courses.reduce((s, c) => s + c.credits, 0);
                  const isActive  = sem.type === "active";

                  return (
                    <div
                      key={sem.name}
                      className={[
                        "flex-1 min-h-[120px] rounded-xl p-6 flex flex-col gap-3 backdrop-blur-sm relative",
                        "bg-gray-900/40 border",
                        isActive ? "border-green-900/60" : "border-gray-900",
                      ].join(" ")}
                    >
                      {/* Term label + credits */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] tracking-widest uppercase font-bold ${
                            isActive ? "text-green-500" : "text-gray-700"
                          }`}
                        >
                          {sem.term}
                        </span>
                        {totalCr > 0 && (
                          <span className="text-[8px] text-gray-700 tracking-widest">{totalCr}cr</span>
                        )}
                      </div>

                      {/* Course list */}
                      {courses.length === 0 ? (
                        <div className="text-[10px] text-gray-800 italic mt-auto">Null_Payload</div>
                      ) : (
                        <div className="flex flex-col gap-1 flex-1">
                          {courses.map((c) => (
                            <div
                              key={c.id}
                              className="text-[11px] text-gray-500 tracking-wider font-medium uppercase flex items-center gap-2"
                            >
                              <div className="w-1 h-px bg-gray-800 shrink-0" />
                              {c.course_id}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Divider + copy button */}
                      {courses.length > 0 && mySemesters.length > 0 && (
                        <>
                          <div className="w-full h-px bg-gray-800 mt-1" />
                          <CopySemesterButton
                            sourceCourseIds={courseIds}
                            userSemesters={mySemesters}
                            demoCopySource={
                              sem.term === DEMO_PEER_COPY_TERM &&
                              sem.year === DEMO_PEER_COPY_YEAR &&
                              courses.length > 0
                            }
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
