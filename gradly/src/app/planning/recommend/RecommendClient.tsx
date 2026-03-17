"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  runPathfinder,
  MAX_CREDITS,
  MODE_META,
  type PlannerCourse,
  type PathfinderMode,
} from "@/lib/utils/pathfinder";
import { approveSemester } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type SemesterSlot = {
  semester: string;
  year:     number;
  name:     string;
  type:     "active" | "upcoming";
};

type SearchClass = {
  course_id: string;
  title:     string;
  credits:   number;
};

type Props = {
  semesters:    SemesterSlot[];
  initialQueue: PlannerCourse[];
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecommendClient({ semesters, initialQueue }: Props) {
  const router = useRouter();

  const [semIdx,        setSemIdx]        = useState(0);
  const [queue,         setQueue]         = useState<PlannerCourse[]>(initialQueue);
  const [semCourses,    setSemCourses]    = useState<PlannerCourse[]>([]);
  const [mode,          setMode]          = useState<PathfinderMode>(1);
  const [step,          setStep]          = useState<"configure" | "review">("configure");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<SearchClass[] | null>(null);
  const [message,       setMessage]       = useState<string | null>(null);
  const [isPending,     startTransition]  = useTransition();

  const sem        = semesters[semIdx];
  const isLastSem  = semIdx >= semesters.length - 1;
  const semCredits = semCourses.reduce((s, c) => s + c.credits, 0);
  const semIds     = new Set(semCourses.map((c) => c.course_id));

  // Debounced class search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      const sb = createClient();
      const { data } = await sb
        .from("classes")
        .select("course_id, title, credits")
        .or(`course_id.ilike.%${trimmed}%,title.ilike.%${trimmed}%`)
        .order("course_id")
        .limit(12);
      setSearchResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handlePathfind() {
    const { scheduled, remaining } = runPathfinder(queue, mode);
    setSemCourses(scheduled);
    setQueue(remaining);
    setStep("review");
    setMessage(null);
  }

  function handleRerun() {
    const restoredQueue = [...queue, ...semCourses];
    setSemCourses([]);
    const { scheduled, remaining } = runPathfinder(restoredQueue, mode);
    setSemCourses(scheduled);
    setQueue(remaining);
    setMessage(null);
  }

  function handleRemoveCourse(courseId: string) {
    const removed = semCourses.find((c) => c.course_id === courseId);
    if (!removed) return;
    setSemCourses((prev) => prev.filter((c) => c.course_id !== courseId));
    setQueue((prev) => [...prev, removed]);
    setMessage(null);
  }

  function handleAddFromSearch(cls: SearchClass) {
    if (semIds.has(cls.course_id)) {
      setMessage(`${cls.course_id} is already in this semester.`);
      return;
    }
    if (semCredits + cls.credits > MAX_CREDITS) {
      setMessage(
        `Cannot add ${cls.course_id} — would exceed the ${MAX_CREDITS}-credit limit ` +
        `(${semCredits} + ${cls.credits} = ${semCredits + cls.credits} cr).`
      );
      return;
    }
    setSemCourses((prev) => [...prev, { course_id: cls.course_id, title: cls.title, credits: cls.credits }]);
    setQueue((prev) => prev.filter((c) => c.course_id !== cls.course_id));
    setMessage(null);
  }

  function handleSkipSemester() {
    if (isLastSem) { router.push("/planning"); return; }
    setSemCourses([]);
    setStep("configure");
    setMessage(null);
    setSemIdx((i) => i + 1);
  }

  function handleStartOver() {
    setQueue((prev) => [...prev, ...semCourses]);
    setSemCourses([]);
    setStep("configure");
    setMessage(null);
  }

  function handleApprove() {
    if (!sem) return;
    const status      = sem.type === "active" ? "in_progress" : "planned";
    const approvedIds = new Set(semCourses.map((c) => c.course_id));
    const newQueue    = queue.filter((c) => !approvedIds.has(c.course_id));
    startTransition(async () => {
      const result = await approveSemester(semCourses, sem.semester, sem.year, status);
      if (result.error) { setMessage(`Error: ${result.error}`); return; }
      setQueue(newQueue);
      setSemCourses([]);
      setStep("configure");
      setMessage(null);
      if (isLastSem || newQueue.length === 0) {
        router.push("/planning");
      } else {
        setSemIdx((i) => i + 1);
      }
    });
  }

  // ── No semesters / done ──────────────────────────────────────────────────────

  if (!sem) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md px-8">
          <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase mb-4">Session_Complete</p>
          <h2 className="text-3xl font-bold text-white uppercase mb-6">
            {queue.length > 0 ? "Window_Exhausted" : "All_Courses_Scheduled"}
          </h2>
          {queue.length > 0 && (
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              {queue.length} course(s) remain but no more semesters are available in your graduation window.
            </p>
          )}
          <Link
            href="/planning"
            className="px-8 py-4 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-green-500 transition-colors"
          >
            Return_To_Planning →
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-full w-full flex flex-col px-20 pt-16 overflow-y-auto scrollbar-hide">

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-14">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase">
            SEMESTER_{semIdx + 1}_OF_{semesters.length}
            {" · "}
            {queue.length} COURSES_IN_QUEUE
          </p>
          <h2 className="text-4xl font-bold text-white uppercase tracking-tight">
            {sem.name}
          </h2>
          <span
            className={`text-[9px] tracking-widest uppercase border px-2 py-0.5 w-fit mt-1 ${
              sem.type === "active"
                ? "border-green-900 text-green-500"
                : "border-gray-800 text-gray-600"
            }`}
          >
            {sem.type === "active" ? "◉ CURRENT" : "UPCOMING"}
          </span>
        </div>
        <Link
          href="/planning"
          className="text-[10px] text-gray-600 hover:text-white uppercase tracking-widest transition-colors mt-1"
        >
          [ EXIT_SESSION ]
        </Link>
      </div>

      {/* ── Step panels ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ─── CONFIGURE ──────────────────────────────────────────────── */}
        {step === "configure" && (
          <motion.div
            key="configure"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col"
          >
            <p className="text-[10px] text-gray-600 tracking-[0.2em] mb-6 uppercase">
              SELECT_ALGORITHM_MODE_FOR_GENERATION:
            </p>

            <div className="w-full max-w-lg flex flex-col gap-3 mb-8">
              {([1, 2, 3] as PathfinderMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={[
                    "w-full py-6 border text-left px-6 transition-all",
                    mode === m
                      ? "bg-green-950/20 border-green-800 text-green-500"
                      : "bg-gray-900/40 border-gray-800 text-gray-400 hover:border-green-500/50 hover:text-green-500/70",
                  ].join(" ")}
                >
                  <span className="block text-[11px] tracking-[0.5em] uppercase mb-1">
                    MODE_{m}_{MODE_META[m].name.toUpperCase().replace(/ /g, "_")}
                  </span>
                  <span className="block text-[9px] text-gray-600 tracking-[0.1em]">
                    {MODE_META[m].desc}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-4 mb-10">
              {queue.length > 0 ? (
                <button
                  onClick={handlePathfind}
                  className="px-8 py-4 bg-white text-black font-bold text-[10px] tracking-[0.5em] uppercase hover:bg-green-500 transition-colors"
                >
                  PATHFIND →
                </button>
              ) : (
                <p className="text-[10px] text-gray-600 tracking-widest uppercase py-4">
                  Queue_Empty — All_Courses_Scheduled
                </p>
              )}
              <button
                onClick={handleSkipSemester}
                className="px-8 py-4 border border-gray-800 text-gray-600 text-[10px] tracking-[0.5em] uppercase hover:border-gray-600 hover:text-gray-400 transition-all"
              >
                SKIP_SEMESTER →
              </button>
            </div>

            {/* Queue preview */}
            {queue.length > 0 && (
              <details className="w-full max-w-lg group">
                <summary className="text-[10px] text-gray-700 tracking-widest uppercase cursor-pointer hover:text-gray-500 transition-colors list-none flex items-center gap-2 pb-2">
                  <span className="group-open:hidden">▶</span>
                  <span className="hidden group-open:inline">▼</span>
                  {queue.length} COURSES_IN_QUEUE
                </summary>
                <div className="border border-gray-900 divide-y divide-gray-900 mt-2">
                  {queue.map((c) => (
                    <div key={c.course_id} className="flex justify-between px-4 py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-gray-400 tracking-wider">{c.course_id}</span>
                        <span className="text-[9px] text-gray-600">{c.title}</span>
                      </div>
                      <span className="text-[9px] text-gray-700 self-center">{c.credits}cr</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </motion.div>
        )}

        {/* ─── REVIEW ─────────────────────────────────────────────────── */}
        {step === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col"
          >
            {/* Credit counter */}
            <div className="flex items-center gap-4 mb-8">
              <span className="text-5xl font-bold text-white">{semCredits}</span>
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] text-gray-600 tracking-widest uppercase">
                  / {MAX_CREDITS} Credits
                </span>
                {/* Progress bar */}
                <div className="h-px bg-gray-900 relative w-full max-w-xs">
                  <div
                    className="absolute inset-y-0 left-0 bg-green-500 transition-all"
                    style={{ width: `${Math.min(100, (semCredits / MAX_CREDITS) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Course list */}
            <div className="w-full max-w-lg mb-6">
              {semCourses.length === 0 ? (
                <div className="border border-gray-800 p-5 text-[10px] text-gray-700 uppercase tracking-widest text-center">
                  No_Courses_Scheduled
                </div>
              ) : (
                <div className="border border-gray-800 divide-y divide-gray-900">
                  {semCourses.map((c) => (
                    <div
                      key={c.course_id}
                      className="flex items-center justify-between px-5 py-3 group hover:bg-gray-900/30 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-white tracking-[0.2em]">{c.course_id}</span>
                        <span className="text-[10px] text-gray-500">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] text-gray-700">{c.credits}cr</span>
                        <button
                          onClick={() => handleRemoveCourse(c.course_id)}
                          disabled={isPending}
                          className="text-[9px] text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
                        >
                          [×]
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleRerun}
                disabled={isPending}
                className="px-6 py-3 border border-gray-800 text-gray-600 text-[10px] tracking-[0.3em] uppercase hover:border-gray-600 hover:text-gray-400 transition-all disabled:opacity-50"
              >
                ↺ RE-RUN
              </button>
              <button
                onClick={handleStartOver}
                disabled={isPending}
                className="px-6 py-3 border border-gray-800 text-gray-600 text-[10px] tracking-[0.3em] uppercase hover:border-gray-600 hover:text-gray-400 transition-all disabled:opacity-50"
              >
                ↩ CHANGE_MODE
              </button>
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="px-8 py-3 bg-white text-black font-bold text-[10px] tracking-[0.3em] uppercase hover:bg-green-500 transition-colors disabled:opacity-50"
              >
                {isPending
                  ? "SAVING..."
                  : isLastSem
                  ? "✓ APPROVE_FINISH"
                  : "✓ APPROVE_CONTINUE →"}
              </button>
            </div>

            {message && (
              <p
                className={`text-[10px] tracking-widest uppercase mb-6 ${
                  message.startsWith("Error") ? "text-red-400" : "text-green-400"
                }`}
              >
                {message}
              </p>
            )}

            {/* Manual search */}
            <div className="w-full max-w-lg mt-4">
              <p className="text-[10px] text-gray-700 tracking-widest uppercase mb-4">
                Manual_Add — {MAX_CREDITS - semCredits}cr Remaining
              </p>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setMessage(null); }}
                className="w-full bg-gray-950/60 border border-gray-800 p-4 text-white text-[11px] tracking-[0.3em] focus:border-gray-600 outline-none transition-colors"
                placeholder="SEARCH_BY_ID_OR_TITLE..."
                autoComplete="off"
              />

              {searchResults !== null && (
                <div className="border border-gray-800 border-t-0 divide-y divide-gray-900">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-[10px] text-gray-700 uppercase tracking-widest text-center">
                      No_Results
                    </div>
                  ) : (
                    searchResults.map((cls) => {
                      const alreadyAdded = semIds.has(cls.course_id);
                      const wouldExceed  = semCredits + cls.credits > MAX_CREDITS;
                      return (
                        <div
                          key={cls.course_id}
                          className="flex items-center justify-between px-5 py-3 hover:bg-gray-900/20 transition-colors"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-gray-300 tracking-wider">{cls.course_id}</span>
                            <span className="text-[9px] text-gray-600">{cls.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] text-gray-700">{cls.credits}cr</span>
                            {alreadyAdded ? (
                              <span className="text-[9px] text-green-600 tracking-widest">ADDED</span>
                            ) : wouldExceed ? (
                              <span className="text-[9px] text-gray-700 tracking-widest">EXCEEDS</span>
                            ) : (
                              <button
                                onClick={() => handleAddFromSearch(cls)}
                                disabled={isPending}
                                className="text-[9px] text-green-500 tracking-widest uppercase hover:drop-shadow-[0_0_6px_rgba(34,197,94,0.5)] transition-all disabled:opacity-50"
                              >
                                + ADD
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Queue (collapsible) */}
            {queue.length > 0 && (
              <details className="mt-8 w-full max-w-lg group">
                <summary className="text-[10px] text-gray-700 tracking-widest uppercase cursor-pointer hover:text-gray-500 transition-colors list-none flex items-center gap-2 pb-2">
                  <span className="group-open:hidden">▶</span>
                  <span className="hidden group-open:inline">▼</span>
                  {queue.length} COURSES_IN_QUEUE
                </summary>
                <div className="border border-gray-900 divide-y divide-gray-900 mt-2">
                  {queue.map((c) => {
                    const wouldExceed = semCredits + c.credits > MAX_CREDITS;
                    return (
                      <div
                        key={c.course_id}
                        className="flex items-center justify-between px-4 py-2 hover:bg-gray-900/20 transition-colors"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-gray-400 tracking-wider">{c.course_id}</span>
                          <span className="text-[9px] text-gray-600">{c.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-gray-700">{c.credits}cr</span>
                          {wouldExceed ? (
                            <span className="text-[9px] text-gray-700 tracking-widest">EXCEEDS</span>
                          ) : (
                            <button
                              onClick={() => handleAddFromSearch(c)}
                              disabled={isPending}
                              className="text-[9px] text-green-500 tracking-widest uppercase hover:drop-shadow-[0_0_6px_rgba(34,197,94,0.5)] transition-all disabled:opacity-50"
                            >
                              + ADD
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
