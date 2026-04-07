"use client";

import { useState, useEffect, useTransition, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getSemesterOffsetFromStart, type SemesterTerm } from "@/lib/utils/planning";
import { computeNextCoopSequence } from "@/lib/utils/coop";
import { isCoopCatalogCourseId } from "@/lib/utils/coopPlacement";
import { addCourseToSemester, removeCourseFromSemester, setSemesterCoopMode } from "./actions";
import {
  DEMO_CLASS_SEARCH,
  DEMO_MANUAL_ADD_TERM,
  DEMO_MANUAL_ADD_YEAR,
} from "@/lib/demo/config";
import { isDemoActive, recordDemoMutation } from "@/lib/demo/store";

const demoSleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Types ─────────────────────────────────────────────────────────────────────

export type SemesterSection = {
  name: string;
  term: string;
  year: number;
  type: "past" | "active" | "upcoming";
};

export type CourseEntry = {
  id: string;
  course_id: string;
  title: string;
  credits: number;
  status: string;
  grade?: string | null;
  class_kind?: string;
  coop_sequence?: number | null;
};

type ClassResult = {
  course_id: string;
  title: string;
  credits: number;
  subject: string;
  class_kind?: string;
  coop_sequence?: number | null;
};

const SEMESTER_CARD_PREVIEW_LIMIT = 3;

type Props = {
  currentUserId: string;
  semesters: SemesterSection[];
  coursesBySemester: Record<string, CourseEntry[]>;
  coopModeBySemester: Record<string, boolean>;
  startingSemester: string;
};

const GRADE_OPTIONS = [
  "A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F","W","I","P",
];

const YEAR_LABELS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

// ── Sub-component: semester card ──────────────────────────────────────────────

function SemCard({
  sem,
  courses,
  onExpand,
  onRemove,
  isPending,
  isCoopMode,
}: {
  sem: SemesterSection;
  courses: CourseEntry[];
  onExpand: () => void;
  onRemove: (id: string) => void;
  isPending: boolean;
  isCoopMode: boolean;
}) {
  const isEmpty    = courses.length === 0;
  const isActive   = sem.type === "active";
  const isPastEmpty = sem.type === "past" && isEmpty;
  const totalCr    = courses.reduce((s, c) => s + c.credits, 0);
  const previewCourses = courses.slice(0, SEMESTER_CARD_PREVIEW_LIMIT);
  const hasMore      = courses.length > SEMESTER_CARD_PREVIEW_LIMIT;
  const moreCount    = courses.length - SEMESTER_CARD_PREVIEW_LIMIT;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onExpand()}
      className={[
        "flex-1 min-h-[140px] rounded-xl p-5 backdrop-blur-sm flex flex-col gap-3 transition-colors text-left cursor-pointer",
        "bg-gray-950/40 border",
        "hover:border-gray-700",
        isActive    ? "border-green-900/70"   :
        isPastEmpty ? "border-red-900/40"     :
                      "border-gray-900",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <span
          className={`text-[10px] tracking-[0.4em] uppercase font-bold ${
            isActive ? "text-green-500" : "text-gray-500"
          }`}
        >
          {sem.term}
        </span>
        <div className="flex items-center gap-2">
          {isCoopMode && (
            <span className="text-[8px] text-amber-500/90 tracking-widest uppercase border border-amber-900/50 px-1.5 py-0.5 rounded">
              co-op
            </span>
          )}
          {isActive   && <span className="text-[8px] text-green-500 tracking-widest uppercase animate-pulse">◉ LIVE</span>}
          {isPastEmpty && <span className="text-[8px] text-red-500/60  tracking-widest uppercase">⚠ EMPTY</span>}
          {totalCr > 0 && <span className="text-[9px] text-gray-700 tracking-widest">{totalCr}cr</span>}
          {hasMore && <span className="text-[8px] text-gray-600 tracking-widest">[VIEW_ALL]</span>}
        </div>
      </div>

      {/* Course list (max 3) */}
      {isEmpty ? (
        <div className="text-[10px] text-gray-800 italic uppercase mt-auto">Null_Payload</div>
      ) : (
        <div className="flex flex-col gap-1.5 flex-1">
          {previewCourses.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 group/row">
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                {c.grade && (
                  <span className="text-[9px] text-green-500 font-bold shrink-0">[{c.grade}]</span>
                )}
                <span className="text-[10px] text-gray-300 shrink-0">{c.course_id}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] text-gray-700">{c.credits}cr</span>
                <Link
                  href={`/classes/${encodeURIComponent(c.course_id)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[9px] text-gray-700 hover:text-green-500 transition-colors"
                >
                  [i]
                </Link>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(c.id); }}
                  disabled={isPending}
                  className="text-[9px] text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover/row:opacity-100"
                >
                  [×]
                </button>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="text-[9px] text-gray-600 tracking-wider mt-0.5">
              +{moreCount} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const SEARCH_RESULT_LIMIT = 100;

export default function PlanningClient({
  currentUserId,
  semesters,
  coursesBySemester,
  coopModeBySemester,
  startingSemester,
}: Props) {
  const router = useRouter();
  const [isSearchModalOpen,    setIsSearchModalOpen]    = useState(false);
  const [expandedSemester,    setExpandedSemester]     = useState<string | null>(null);
  const [professorByCourse,   setProfessorByCourse]     = useState<Record<string, string>>({});
  const [query,               setQuery]                = useState("");
  const [results,             setResults]              = useState<ClassResult[] | null>(null);
  const [selectedCourseId,    setSelectedCourseId]     = useState<string | null>(null);
  const [targetSemName,       setTargetSemName]        = useState<string>(semesters[0]?.name ?? "");
  const [grade,               setGrade]                = useState<string>("");
  const [feedback,            setFeedback]             = useState<string | null>(null);
  const [coopToggleFeedback,  setCoopToggleFeedback]   = useState<string | null>(null);
  const [isPending,           startTransition]         = useTransition();

  useEffect(() => { setGrade(""); }, [selectedCourseId]);

  function closeSearchModal() {
    setIsSearchModalOpen(false);
    setQuery("");
    setResults(null);
    setSelectedCourseId(null);
    setFeedback(null);
  }

  function closeSemesterModal() {
    setExpandedSemester(null);
    setProfessorByCourse({});
    setCoopToggleFeedback(null);
  }

  // Close semester modal on Escape
  useEffect(() => {
    if (!expandedSemester) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeSemesterModal();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expandedSemester]);

  // Fetch professor names from course_ratings when semester detail modal opens
  useEffect(() => {
    if (!expandedSemester || !currentUserId) return;
    const courses = coursesBySemester[expandedSemester] ?? [];
    if (courses.length === 0) return;

    const courseIds = courses.map((c) => c.course_id);
    const sb = createClient();
    sb
      .from("course_ratings")
      .select("course_id, professor_name")
      .eq("user_id", currentUserId)
      .in("course_id", courseIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const row of data ?? []) {
          const r = row as { course_id: string; professor_name: string | null };
          if (r.professor_name?.trim()) map[r.course_id] = r.professor_name.trim();
        }
        setProfessorByCourse(map);
      });
  }, [expandedSemester, currentUserId, coursesBySemester]);

  // All placed courses → map course_id → semester name
  const addedCourses = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const [semName, courses] of Object.entries(coursesBySemester)) {
      for (const c of courses) map[c.course_id] = semName;
    }
    return map;
  }, [coursesBySemester]);

  // Debounced search (only when modal is open)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !isSearchModalOpen) { setResults(null); return; }
    const timer = setTimeout(async () => {
      const sb = createClient();
      const { data } = await sb
        .from("classes")
        .select("course_id, title, credits, subject, class_kind, coop_sequence")
        .or(`course_id.ilike.%${trimmed}%,title.ilike.%${trimmed}%`)
        .order("course_id")
        .limit(SEARCH_RESULT_LIMIT);
      setResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isSearchModalOpen]);

  // Group semesters by academic year (Fall 20XX is the root year of each pair)
  const groupedSemesters = useMemo(() => {
    const groups = new Map<number, SemesterSection[]>();
    for (const s of semesters) {
      const acYear = s.term === "Fall" ? s.year : s.year - 1;
      if (!groups.has(acYear)) groups.set(acYear, []);
      groups.get(acYear)!.push(s);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [semesters]);

  const startAcYear = groupedSemesters[0]?.[0] ?? 0;
  function getYearLabel(acYear: number): string {
    const offset = acYear - startAcYear;
    return YEAR_LABELS[offset] ?? `Year ${offset + 1}`;
  }

  const orderedSemesterNames = useMemo(() => semesters.map((s) => s.name), [semesters]);

  const displaySearchResults = useMemo(() => {
    if (results === null) return null;
    const isCoopSem = coopModeBySemester[targetSemName] ?? false;
    const nextSeq = computeNextCoopSequence({
      orderedSemesterNames,
      coursesBySemester,
      targetSemesterName: targetSemName,
    });
    if (isCoopSem) {
      return results.filter(
        (r) => r.class_kind === "coop" && r.coop_sequence === nextSeq
      );
    }
    return results.filter((r) => {
      if ((r.class_kind ?? "study") === "coop") return false;
      if (isCoopCatalogCourseId(r.course_id)) return false;
      return true;
    });
  }, [results, targetSemName, orderedSemesterNames, coursesBySemester, coopModeBySemester]);

  const displaySearchRef = useRef<ClassResult[] | null>(null);
  useEffect(() => {
    displaySearchRef.current = displaySearchResults;
  }, [displaySearchResults]);

  // Presentation demo: open search, surface CS results, add first eligible course to an open term
  useEffect(() => {
    async function runPlanningDemo() {
      if (!isDemoActive()) return;
      const target = semesters.find(
        (s) => s.term === DEMO_MANUAL_ADD_TERM && s.year === DEMO_MANUAL_ADD_YEAR
      );
      if (!target) {
        window.dispatchEvent(new Event("gradly-demo-planning-done"));
        return;
      }

      setIsSearchModalOpen(true);
      setTargetSemName(target.name);
      await demoSleep(450);
      setQuery(DEMO_CLASS_SEARCH);
      await demoSleep(1000);

      const list = displaySearchRef.current ?? [];
      const pick = list.find((cls) => {
        if (addedCourses[cls.course_id]) return false;
        if ((cls.class_kind ?? "study") === "coop") return false;
        if (isCoopCatalogCourseId(cls.course_id)) return false;
        return true;
      });

      if (!pick) {
        closeSearchModal();
        window.dispatchEvent(new Event("gradly-demo-planning-done"));
        return;
      }

      setSelectedCourseId(pick.course_id);
      await demoSleep(500);

      const status =
        target.type === "past"
          ? "completed"
          : target.type === "active"
            ? "in_progress"
            : "planned";

      startTransition(async () => {
        const result = await addCourseToSemester(
          pick.course_id,
          target.term,
          target.year,
          status,
          target.type === "past" ? grade || undefined : undefined
        );
        if (!result.error) {
          recordDemoMutation({
            kind: "courses",
            term: target.term,
            year: target.year,
            courseIds: [pick.course_id],
          });
        }
        closeSearchModal();
        router.refresh();
        await demoSleep(400);
        window.dispatchEvent(new Event("gradly-demo-planning-done"));
      });
    }

    function onDemoPlanning() {
      void runPlanningDemo();
    }
    window.addEventListener("gradly-demo-planning-add", onDemoPlanning);
    return () => window.removeEventListener("gradly-demo-planning-add", onDemoPlanning);
  }, [semesters, addedCourses, router, startTransition, grade]);

  function toggleSelected(courseId: string) {
    setSelectedCourseId((prev) => (prev === courseId ? null : courseId));
    setFeedback(null);
  }

  function handleAdd(courseId: string) {
    const sem = semesters.find((s) => s.name === targetSemName);
    if (!sem) return;
    const status =
      sem.type === "past"   ? "completed"   :
      sem.type === "active" ? "in_progress" : "planned";
    setFeedback(null);
    startTransition(async () => {
      const result = await addCourseToSemester(
        courseId, sem.term, sem.year, status,
        sem.type === "past" ? grade : undefined,
      );
      setFeedback(result.error ? `Error: ${result.error}` : `Added to ${sem.name}.`);
      if (!result.error) {
        setSelectedCourseId(null);
        router.refresh();
      }
    });
  }

  function handleRemove(userCourseId: string) {
    startTransition(async () => {
      const result = await removeCourseFromSemester(userCourseId);
      if (result.error) setFeedback(`Error: ${result.error}`);
      else router.refresh();
    });
  }

  function handleCoopToggle(sem: SemesterSection, next: boolean) {
    setCoopToggleFeedback(null);
    startTransition(async () => {
      const result = await setSemesterCoopMode(sem.term, sem.year, next, startingSemester);
      if ("error" in result && result.error) setCoopToggleFeedback(result.error);
      else {
        setCoopToggleFeedback(null);
        router.refresh();
      }
    });
  }

  const targetSem    = semesters.find((s) => s.name === targetSemName);
  const isPastTarget = targetSem?.type === "past";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-full w-full flex flex-col px-20 pt-16 overflow-y-auto scrollbar-hide">

      {/* ── TOP HEADER ────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-12">
        {/* Left spacer */}
        <div className="flex-1" />

        {/* Search trigger */}
        <div className="w-full max-w-lg">
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full bg-gray-950/60 border border-gray-800 p-5 text-center text-gray-500 text-[11px] tracking-[0.5em] hover:text-white transition-all "
          >
            Search Classes
          </button>
        </div>

        {/* Auto-scheduler link */}
        <div className="flex-1 flex justify-end">
          <Link href="/planning/recommend" className="group relative flex flex-col items-end">
            <span className="text-[10px] text-green-500 tracking-[0.3em] font-bold mb-1 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] transition-all">
              AUTO_SCHEDULER_V1.0
            </span>
            <div className="w-32 h-px bg-green-500/30 group-hover:bg-green-500 transition-colors" />
          </Link>
        </div>
      </div>

      {/* ── Search modal overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isSearchModalOpen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/80"
              onClick={closeSearchModal}
            />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-[500px] max-h-[85vh] flex flex-col bg-gray-950 rounded-4xl p-10 shadow-2xl"
            >
              {/* Search input */}
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedCourseId(null); setFeedback(null); }}
                onKeyDown={(e) => e.key === "Escape" && closeSearchModal()}
                className="w-full bg-transparent border-b border-gray-800 text-2xl py-4 outline-none focus:border-green-500 font text-white mb-7 tracking-[0.2em]"
                placeholder="search classes"
                autoComplete="off"
              />

              {/* Results */}
              {displaySearchResults !== null && (
                <div className="space-y-1 overflow-y-auto scrollbar-hide max-h-[50vh] pr-2">
                  {displaySearchResults.length === 0 ? (
                    <div className="p-4 text-[10px] text-gray-500 tracking-widest text-center leading-relaxed">
                      {results?.length === 0
                        ? "No results found"
                        : (coopModeBySemester[targetSemName]
                            ? "No catalog course matches this co-op semester (only the next co-op sequence is shown)."
                            : "No matching courses (catalog co-op offerings must use a semester marked co-op).")}
                    </div>
                  ) : (
                    <div>
                      {displaySearchResults.map((cls) => {
                        const alreadyIn  = addedCourses[cls.course_id];
                        const isSelected = selectedCourseId === cls.course_id;
                        return (
                          <div key={cls.course_id}>
                            {/* Course row */}
                            <button
                              type="button"
                              onClick={() => toggleSelected(cls.course_id)}
                              disabled={isPending}
                              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-900/40 transition-colors group/item text-left"
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-[11px] text-white tracking-[0.2em]">{cls.course_id}</span>
                                <span className="text-[10px] text-gray-500 truncate">{cls.title}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {alreadyIn && (
                                  <span className="text-green-500 font" title={alreadyIn}>✓</span>
                                )}
                                <span className="text-[15px] text-gray-700">{cls.credits}cr</span>
                                <span className={`text-[9px] transition-colors ${isSelected ? "text-green-500" : "text-gray-700 group-hover/item:text-gray-400"}`}>
                                  {isSelected ? "▲" : "▼"}
                                </span>
                              </div>
                            </button>

                            {/* Options panel */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  key="options"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-gray-950/60 border-t border-gray-800 px-5 py-4 flex flex-col gap-4">
                                    <Link
                                      href={`/classes/${encodeURIComponent(cls.course_id)}`}
                                      className="text-[10px] text-green-500 tracking-[0.3em] hover:drop-shadow-[0_0_6px_rgba(34,197,94,0.5)] transition-all w-fit"
                                    >
                                      Class Info →
                                    </Link>

                                    {alreadyIn ? (
                                      <p className="text-[10px] text-gray-600 tracking-wider">
                                        Taken: {alreadyIn}
                                      </p>
                                    ) : (
                                      <div className="flex flex-wrap items-end gap-4">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[9px] text-gray-700 uppercase tracking-widest">Add_To</span>
                                          <select
                                            value={targetSemName}
                                            onChange={(e) => setTargetSemName(e.target.value)}
                                            className="bg-gray-900 border border-gray-800 text-gray-300 text-[10px] px-3 py-2 outline-none focus:border-gray-600 tracking-wider"
                                          >
                                            {semesters.map((s) => (
                                              <option key={s.name} value={s.name}>
                                                {s.name}{" "}
                                                [{s.type === "past" ? "PAST" : s.type === "active" ? "CURRENT" : "UPCOMING"}]
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        {isPastTarget && (
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[9px] text-gray-700 uppercase tracking-widest">Grade (opt)</span>
                                            <select
                                              value={grade}
                                              onChange={(e) => setGrade(e.target.value)}
                                              className="bg-gray-900 border border-gray-800 text-gray-300 text-[10px] px-3 py-2 outline-none focus:border-gray-600 tracking-wider"
                                            >
                                              <option value="">—</option>
                                              {GRADE_OPTIONS.map((g) => (
                                                <option key={g} value={g}>{g}</option>
                                              ))}
                                            </select>
                                          </div>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleAdd(cls.course_id)}
                                          disabled={isPending}
                                          className="px-6 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-green-500 transition-colors disabled:opacity-50"
                                        >
                                          {isPending ? "Adding..." : "Add"}
                                        </button>
                                      </div>
                                    )}

                                    {feedback && selectedCourseId === cls.course_id && (
                                      <p className={`text-[10px] tracking-widest uppercase ${feedback.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                                        {feedback}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {results !== null && (coopModeBySemester[targetSemName] ?? false) && displaySearchResults && displaySearchResults.length > 0 && (
                <p className="text-[9px] text-amber-600/90 tracking-widest mt-2 mb-1">
                  Co-op semester: only the next catalog co-op (by sequence) is listed.
                </p>
              )}

              {/* Exit */}
              <button
                onClick={closeSearchModal}
                className="mt-6 w-full text-[9px] text-gray-700 hover:text-gray-400 tracking-widest transition-colors text-center"
              >
                exit
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Semester detail overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {expandedSemester && (() => {
          const sem = semesters.find((s) => s.name === expandedSemester);
          const courses = coursesBySemester[expandedSemester] ?? [];
          const totalCr = courses.reduce((s, c) => s + c.credits, 0);
          return (
            <div className="fixed inset-0 z-30 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/80"
                onClick={closeSemesterModal}
              />
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-[500px] max-h-[85vh] flex flex-col bg-gray-950 border border-gray-800 rounded-xl p-10 shadow-2xl"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font text-white lowercase mb-1 tracking-[0.2em]">
                      {expandedSemester}
                    </h2>
                    <p className="text-[10px] text-gray-500 tracking-widest">
                      {totalCr} credits · {courses.length} course{courses.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className={`text-[9px] tracking-widest lowercase border px-2 py-0.5 ${
                    sem?.type === "active" ? "border-green-900 text-green-500" : "border-gray-800 text-gray-600"
                  }`}>
                    {sem?.type === "active" ? "◉ CURRENT" : sem?.type === "past" ? "PAST" : "UPCOMING"}
                  </span>
                </div>

                {sem && (() => {
                  const coopEligible = getSemesterOffsetFromStart(
                    startingSemester,
                    sem.term as SemesterTerm,
                    sem.year
                  ) >= 2;
                  const isCoop = coopModeBySemester[sem.name] ?? false;
                  return (
                    <div className="mb-6 flex flex-col gap-3 border border-gray-800/80 rounded-lg p-4 bg-gray-900/30">
                      <p className="text-[9px] text-gray-500 tracking-wider leading-relaxed">
                        <span className="text-gray-400">Semester type:</span>{" "}
                        {isCoop ? (
                          <span className="text-amber-500/90">Co-op work term</span>
                        ) : (
                          <span className="text-gray-400">Study — default</span>
                        )}
                      </p>
                      <div className="flex items-center justify-between gap-4 min-h-[2rem]">
                        <span className="text-[10px] text-gray-400 tracking-widest uppercase leading-none">
                          Co-op work term
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isCoop}
                          aria-label={isCoop ? "Co-op semester on" : "Co-op semester off"}
                          disabled={isPending || (!coopEligible && !isCoop)}
                          onClick={() => handleCoopToggle(sem, !isCoop)}
                          className={[
                            "inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors",
                            isCoop ? "bg-amber-600/80 justify-end" : "bg-gray-800 justify-start",
                            isPending || (!coopEligible && !isCoop) ? "opacity-40 cursor-not-allowed" : "hover:opacity-90",
                          ].join(" ")}
                        >
                          <span className="pointer-events-none block h-6 w-6 rounded-full bg-white shadow-sm ring-1 ring-black/10" />
                        </button>
                      </div>
                      {!coopEligible && !isCoop && (
                        <p className="text-[9px] text-gray-600 tracking-wider">
                          The first two semesters in your plan cannot be co-op semesters.
                        </p>
                      )}
                      {coopToggleFeedback && (
                        <p className="text-[9px] tracking-wider text-red-400">
                          {coopToggleFeedback}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Course list */}
                <div className="overflow-y-auto scrollbar-hide max-h-[50vh] pr-2 space-y-2">
                  {courses.length === 0 ? (
                    <p className="text-[10px] text-gray-700 tracking-widest py-4 text-center">no courses</p>
                  ) : (
                    courses.map((c) => (
                      <div
                        key={c.id}
                        className="border border-gray-800 rounded-lg p-4 bg-gray-900/40 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] text-white tracking-[0.2em] font-medium">{c.course_id}</span>
                            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{c.title}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{c.credits} credits</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/classes/${encodeURIComponent(c.course_id)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-gray-600 hover:text-green-500 transition-colors"
                            >
                              i
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemove(c.id); }}
                              disabled={isPending}
                              className="text-[11px] text-gray-600 hover:text-red-400 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[9px] text-gray-600">
                          {c.grade && (
                            <span className="tracking-wider">Grade: <span className="text-green-500 font-medium">{c.grade}</span></span>
                          )}
                          {professorByCourse[c.course_id] && (
                            <span className="tracking-wider">Professor: {professorByCourse[c.course_id]}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={closeSemesterModal}
                  className="mt-6 w-full text-[9px] text-gray-700 hover:text-gray-400 tracking-widest transition-colors text-center"
                >
                  exit
                </button>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── SEMESTER SECTIONS ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-20 pb-32 w-full max-w-5xl mx-auto">
        {groupedSemesters.map(([acYear, yearSems]) => (
          <div key={acYear} className="flex flex-col gap-6">
            <h3 className="text-gray-600 text-[10px] tracking-[0.6em] uppercase border-l-2 border-gray-900 pl-4">
              {getYearLabel(acYear)}
            </h3>
            <div className="flex gap-6">
              {yearSems.map((sem) => (
                <SemCard
                  key={sem.name}
                  sem={sem}
                  courses={coursesBySemester[sem.name] ?? []}
                  onExpand={() => setExpandedSemester(sem.name)}
                  onRemove={handleRemove}
                  isPending={isPending}
                  isCoopMode={coopModeBySemester[sem.name] ?? false}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
