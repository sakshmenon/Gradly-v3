"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  semester: string;           // "Fall"
  year:     number;
  name:     string;           // "Fall 2026"
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

  const [semIdx,            setSemIdx]            = useState(0);
  const [queue,             setQueue]             = useState<PlannerCourse[]>(initialQueue);
  const [semCourses,        setSemCourses]        = useState<PlannerCourse[]>([]);
  const [mode,              setMode]              = useState<PathfinderMode>(1);
  const [step,              setStep]              = useState<"configure" | "review">("configure");
  const [searchQuery,       setSearchQuery]       = useState("");
  const [searchResults,     setSearchResults]     = useState<SearchClass[] | null>(null);
  const [message,           setMessage]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sem         = semesters[semIdx];
  const isLastSem   = semIdx >= semesters.length - 1;
  const semCredits  = semCourses.reduce((s, c) => s + c.credits, 0);
  const semIds      = new Set(semCourses.map(c => c.course_id));

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

  // ── Handlers ───────────────────────────────────────────────────

  function handlePathfind() {
    const { scheduled, remaining } = runPathfinder(queue, mode);
    setSemCourses(scheduled);
    setQueue(remaining);
    setStep("review");
    setMessage(null);
  }

  function handleRerun() {
    // Return current semester courses to queue and run again
    const restoredQueue = [...queue, ...semCourses];
    setSemCourses([]);
    const { scheduled, remaining } = runPathfinder(restoredQueue, mode);
    setSemCourses(scheduled);
    setQueue(remaining);
    setMessage(null);
  }

  function handleRemoveCourse(courseId: string) {
    const removed = semCourses.find(c => c.course_id === courseId);
    if (!removed) return;
    setSemCourses(prev => prev.filter(c => c.course_id !== courseId));
    setQueue(prev => [...prev, removed]);
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
    setSemCourses(prev => [...prev, { course_id: cls.course_id, title: cls.title, credits: cls.credits }]);
    // Also remove from queue if it was there (avoids double-scheduling)
    setQueue(prev => prev.filter(c => c.course_id !== cls.course_id));
    setMessage(null);
  }

  function handleSkipSemester() {
    if (isLastSem) { router.push("/planning"); return; }
    setSemCourses([]);
    setStep("configure");
    setMessage(null);
    setSemIdx(i => i + 1);
  }

  function handleStartOver() {
    setQueue(prev => [...prev, ...semCourses]);
    setSemCourses([]);
    setStep("configure");
    setMessage(null);
  }

  function handleApprove() {
    if (!sem) return;
    const status = sem.type === "active" ? "in_progress" : "planned";
    const approvedIds = new Set(semCourses.map(c => c.course_id));
    const newQueue = queue.filter(c => !approvedIds.has(c.course_id));

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
        setSemIdx(i => i + 1);
      }
    });
  }

  // ── Done / no-semesters states ──────────────────────────────────

  if (!sem) {
    return (
      <section>
        <p>
          {queue.length > 0
            ? `${queue.length} course(s) remain but no more semesters are available in your graduation window.`
            : "All required courses have been scheduled!"}
        </p>
        <a href="/planning">← Back to Planning</a>
      </section>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <>
      {/* ── Session status bar ─────────────────────────────────── */}
      <p>
        Semester {semIdx + 1} of {semesters.length} &mdash;{" "}
        <strong>{sem.name}</strong> [{sem.type === "active" ? "CURRENT" : "UPCOMING"}]
        {" · "}
        {queue.length} course(s) in queue
      </p>

      <a href="/planning">Exit session</a>

      <hr />

      {/* ── Configure step ─────────────────────────────────────── */}
      {step === "configure" && (
        <section>
          <h2>Choose Pathfinding Mode</h2>

          <fieldset>
            <legend>Mode</legend>
            {([1, 2, 3] as PathfinderMode[]).map(m => (
              <label key={m} style={{ display: "block", marginBottom: "0.4rem" }}>
                <input
                  type="radio"
                  name="pf-mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                {" "}
                <strong>Mode {m} — {MODE_META[m].name}</strong>
                {": "}
                {MODE_META[m].desc}
              </label>
            ))}
          </fieldset>

          <br />

          {queue.length === 0 ? (
            <p><em>Queue is empty — all required courses have been scheduled.</em></p>
          ) : (
            <button type="button" onClick={handlePathfind}>
              Pathfind →
            </button>
          )}

          <p>
            <button type="button" onClick={handleSkipSemester}>
              Skip this semester →
            </button>
          </p>

          {/* Show remaining queue */}
          {queue.length > 0 && (
            <details>
              <summary>{queue.length} course(s) in queue</summary>
              <ul>
                {queue.map(c => (
                  <li key={c.course_id}>
                    {c.course_id} — {c.title} ({c.credits} cr)
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* ── Review step ────────────────────────────────────────── */}
      {step === "review" && (
        <>
          <section>
            <h2>
              {sem.name} &mdash; {semCredits} / {MAX_CREDITS} credits
            </h2>

            {semCourses.length === 0 ? (
              <p><em>No courses placed. Add via search below or re-run pathfinder.</em></p>
            ) : (
              <ul>
                {semCourses.map(c => (
                  <li key={c.course_id}>
                    {c.course_id} — {c.title} ({c.credits} cr)
                    {" "}
                    <button
                      type="button"
                      onClick={() => handleRemoveCourse(c.course_id)}
                      disabled={isPending}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <button type="button" onClick={handleRerun} disabled={isPending}>
                ↺ Re-run Pathfinder
              </button>
              {" "}
              <button type="button" onClick={handleStartOver} disabled={isPending}>
                ↩ Change Mode
              </button>
              {" "}
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
              >
                {isPending
                  ? "Saving…"
                  : isLastSem
                  ? "✓ Approve & Finish"
                  : "✓ Approve & Continue →"}
              </button>
            </div>

            {message && <p>{message}</p>}
          </section>

          <hr />

          {/* ── Manual search ──────────────────────────────────── */}
          <section>
            <h3>Add courses manually</h3>
            <p>
              Credit allowance remaining:{" "}
              <strong>{MAX_CREDITS - semCredits} cr</strong>
            </p>

            <input
              type="search"
              placeholder="Search by course ID or title…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setMessage(null); }}
              autoComplete="off"
            />

            {searchResults !== null && (
              <ul>
                {searchResults.length === 0 && <li><em>No results.</em></li>}
                {searchResults.map(cls => {
                  const alreadyAdded = semIds.has(cls.course_id);
                  const wouldExceed  = semCredits + cls.credits > MAX_CREDITS;
                  return (
                    <li key={cls.course_id}>
                      {cls.course_id} — {cls.title} ({cls.credits} cr)
                      {" "}
                      {alreadyAdded ? (
                        <em>(already in semester)</em>
                      ) : wouldExceed ? (
                        <em>(exceeds {MAX_CREDITS} cr limit)</em>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddFromSearch(cls)}
                          disabled={isPending}
                        >
                          Add
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Remaining queue (collapsible) */}
            {queue.length > 0 && (
              <details style={{ marginTop: "1rem" }}>
                <summary>{queue.length} course(s) still in queue</summary>
                <ul>
                  {queue.map(c => (
                    <li key={c.course_id}>
                      {c.course_id} — {c.title} ({c.credits} cr)
                      {" "}
                      <button
                        type="button"
                        onClick={() => handleAddFromSearch(c)}
                        disabled={isPending || semCredits + c.credits > MAX_CREDITS}
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </>
      )}
    </>
  );
}
