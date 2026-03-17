"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { addCourseToSemester, removeCourseFromSemester } from "./actions";

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
};

type ClassResult = {
  course_id: string;
  title: string;
  credits: number;
  subject: string;
};

type Props = {
  semesters: SemesterSection[];
  coursesBySemester: Record<string, CourseEntry[]>;
};

// Standard letter grades for the grade select
const GRADE_OPTIONS = [
  "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D+", "D", "D-",
  "F", "W", "I", "P",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlanningClient({ semesters, coursesBySemester }: Props) {
  const [query,            setQuery]            = useState("");
  const [results,          setResults]          = useState<ClassResult[] | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [targetSemName,    setTargetSemName]     = useState<string>(semesters[0]?.name ?? "");
  const [grade,            setGrade]            = useState<string>("");
  const [feedback,         setFeedback]          = useState<string | null>(null);
  const [isPending,        startTransition]      = useTransition();

  // Reset grade input whenever the selected class changes
  useEffect(() => { setGrade(""); }, [selectedCourseId]);

  // Derive which courses are already placed and in which semester
  const addedCourses = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const [semName, courses] of Object.entries(coursesBySemester)) {
      for (const c of courses) {
        map[c.course_id] = semName;
      }
    }
    return map;
  }, [coursesBySemester]);

  // Debounced search against the classes table
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setResults(null); return; }

    const timer = setTimeout(async () => {
      const sb = createClient();
      const { data } = await sb
        .from("classes")
        .select("course_id, title, credits, subject")
        .or(`course_id.ilike.%${trimmed}%,title.ilike.%${trimmed}%`)
        .order("course_id")
        .limit(15);
      setResults(data ?? []);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function toggleSelected(courseId: string) {
    setSelectedCourseId(prev => (prev === courseId ? null : courseId));
    setFeedback(null);
  }

  function handleAdd(courseId: string) {
    const sem = semesters.find(s => s.name === targetSemName);
    if (!sem) return;
    const status =
      sem.type === "past"   ? "completed"   :
      sem.type === "active" ? "in_progress" : "planned";

    setFeedback(null);
    startTransition(async () => {
      const result = await addCourseToSemester(
        courseId, sem.term, sem.year, status,
        sem.type === "past" ? grade : undefined   // only send grade for past sems
      );
      setFeedback(result.error ? `Error: ${result.error}` : `Added to ${sem.name}.`);
      if (!result.error) setSelectedCourseId(null);
    });
  }

  function handleRemove(userCourseId: string) {
    startTransition(async () => {
      const result = await removeCourseFromSemester(userCourseId);
      if (result.error) setFeedback(`Error: ${result.error}`);
    });
  }

  const typeLabel: Record<SemesterSection["type"], string> = {
    past:     "[PAST]",
    active:   "[CURRENT]",
    upcoming: "[UPCOMING]",
  };

  // Is the currently chosen target semester a past one?
  const targetSem = semesters.find(s => s.name === targetSemName);
  const isPastTarget = targetSem?.type === "past";

  return (
    <>
      {/* ── Search ─────────────────────────────────────────────────── */}
      <section>
        <h2>Search Classes</h2>
        <input
          type="search"
          placeholder="Search by course ID or title…"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedCourseId(null); }}
          autoComplete="off"
        />

        {feedback && <p>{feedback}</p>}

        {results !== null && (
          <ul>
            {results.length === 0 && <li><em>No classes found.</em></li>}

            {results.map(cls => {
              const alreadyIn  = addedCourses[cls.course_id];
              const isSelected = selectedCourseId === cls.course_id;

              return (
                <li key={cls.course_id}>
                  <button
                    type="button"
                    onClick={() => toggleSelected(cls.course_id)}
                    disabled={isPending}
                  >
                    {cls.course_id} — {cls.title} ({cls.credits} cr)
                    {alreadyIn ? ` [in ${alreadyIn}]` : ""}
                  </button>

                  {/* ── Options panel ──────────────────────────────── */}
                  {isSelected && (
                    <div style={{ marginLeft: "1rem", marginTop: "0.25rem" }}>

                      {/* Always visible: class info link */}
                      <a href={`/classes/${encodeURIComponent(cls.course_id)}`}>
                        View class info →
                      </a>

                      <br />

                      {alreadyIn ? (
                        <em>Already placed in {alreadyIn}. Remove it from that semester to move it.</em>
                      ) : (
                        <div style={{ marginTop: "0.25rem" }}>
                          {/* Semester select */}
                          <label htmlFor={`sem-select-${cls.course_id}`}>
                            Add to semester:{" "}
                          </label>
                          <select
                            id={`sem-select-${cls.course_id}`}
                            value={targetSemName}
                            onChange={e => setTargetSemName(e.target.value)}
                          >
                            {semesters.map(s => (
                              <option key={s.name} value={s.name}>
                                {s.name} {typeLabel[s.type]}
                              </option>
                            ))}
                          </select>

                          {/* Grade select — only for past semesters */}
                          {isPastTarget && (
                            <>
                              {" "}
                              <label htmlFor={`grade-${cls.course_id}`}>
                                Grade (optional):{" "}
                              </label>
                              <select
                                id={`grade-${cls.course_id}`}
                                value={grade}
                                onChange={e => setGrade(e.target.value)}
                              >
                                <option value="">—</option>
                                {GRADE_OPTIONS.map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </>
                          )}

                          {" "}
                          <button
                            type="button"
                            onClick={() => handleAdd(cls.course_id)}
                            disabled={isPending}
                          >
                            {isPending ? "Adding…" : "Add"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <hr />

      {/* ── Semester sections ──────────────────────────────────────── */}
      <section>
        <h2>Your Plan</h2>

        {semesters.map(sem => {
          const courses = coursesBySemester[sem.name] ?? [];
          const isEmpty = courses.length === 0;

          return (
            <div key={sem.name}>
              <h3>
                {sem.name} {typeLabel[sem.type]}
                {sem.type === "past" && isEmpty && (
                  <span> ⚠ No classes recorded — add completed courses above.</span>
                )}
              </h3>

              {isEmpty ? (
                <p><em>No classes added yet.</em></p>
              ) : (
                <ul>
                  {courses.map(c => (
                    <li key={c.id}>
                      {c.grade && <strong>[{c.grade}]</strong>}{" "}
                      {c.course_id} — {c.title} ({c.credits} cr)
                      {" "}[{c.status}]
                      {" "}
                      <a href={`/classes/${encodeURIComponent(c.course_id)}`}>
                        info
                      </a>
                      {" "}
                      <button
                        type="button"
                        onClick={() => handleRemove(c.id)}
                        disabled={isPending}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
