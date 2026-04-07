"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { copySemesterCourses } from "./actions";
import type { Semester } from "@/lib/utils/planning";
import {
  DEMO_COPY_TARGET_TERM,
  DEMO_COPY_TARGET_YEAR,
  DEMO_PENDING_COPY_KEY,
} from "@/lib/demo/config";
import { isDemoActive, recordDemoMutation } from "@/lib/demo/store";

type Props = {
  sourceCourseIds: string[];
  userSemesters:   Semester[];
  /** Semester card that the presentation demo copies from (peer’s seeded term) */
  demoCopySource?: boolean;
};

export default function CopySemesterButton({
  sourceCourseIds,
  userSemesters,
  demoCopySource = false,
}: Props) {
  const [showPicker,    setShowPicker]    = useState(false);
  const [targetSemName, setTargetSemName] = useState(userSemesters[0]?.name ?? "");
  const [copied,        setCopied]        = useState(false);
  const [isPending,     startTransition]  = useTransition();
  const demoCopyFired = useRef(false);
  const semestersRef = useRef(userSemesters);
  const sourceIdsRef = useRef(sourceCourseIds);
  semestersRef.current = userSemesters;
  sourceIdsRef.current = sourceCourseIds;

  // Demo: session flag + stable deps — avoids timer churn from new userSemesters[] each render.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!demoCopySource || !isDemoActive()) return;
    if (sessionStorage.getItem(DEMO_PENDING_COPY_KEY) !== "1") return;
    if (demoCopyFired.current) return;
    if (sourceCourseIds.length === 0) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      sessionStorage.removeItem(DEMO_PENDING_COPY_KEY);
      demoCopyFired.current = true;

      const sems = semestersRef.current;
      const ids = sourceIdsRef.current;
      const target = sems.find(
        (s) => s.term === DEMO_COPY_TARGET_TERM && s.year === DEMO_COPY_TARGET_YEAR
      );

      const finishDemo = () => {
        window.dispatchEvent(new Event("gradly-demo-copy-done"));
      };

      if (!target || ids.length === 0) {
        finishDemo();
        return;
      }

      const status: "completed" | "in_progress" | "planned" =
        target.type === "past"
          ? "completed"
          : target.type === "active"
            ? "in_progress"
            : "planned";

      startTransition(async () => {
        const result = await copySemesterCourses(
          ids,
          target.term,
          target.year,
          status
        );
        if (!result.error) {
          recordDemoMutation({
            kind: "courses",
            term: target.term,
            year: target.year,
            courseIds: [...ids],
          });
          setCopied(true);
        }
        finishDemo();
      });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [demoCopySource, sourceCourseIds.length, startTransition]);

  if (sourceCourseIds.length === 0 || userSemesters.length === 0) return null;

  function handleCopy() {
    const sem = userSemesters.find((s) => s.name === targetSemName);
    if (!sem) return;

    const status: "completed" | "in_progress" | "planned" =
      sem.type === "past"   ? "completed"   :
      sem.type === "active" ? "in_progress" : "planned";

    startTransition(async () => {
      const result = await copySemesterCourses(
        sourceCourseIds,
        sem.term,
        sem.year,
        status
      );
      if (!result.error) {
        setCopied(true);
        setShowPicker(false);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* COPY / SUCCESS toggle button */}
      <button
        onClick={() => {
          if (copied) return;
          setShowPicker((prev) => !prev);
        }}
        disabled={isPending}
        className={[
          "text-[8px] tracking-[0.3em] uppercase px-2 py-1 border transition-all duration-300 self-end",
          copied
            ? "border-green-500 text-green-500 bg-green-500/10"
            : "border-gray-800 text-gray-600 hover:border-gray-400 hover:text-white",
        ].join(" ")}
      >
        {isPending ? "..." : copied ? "SUCCESS" : "COPY"}
      </button>

      {/* Semester picker (shown when COPY is toggled) */}
      {showPicker && !copied && (
        <div className="flex flex-col gap-2 bg-gray-950 border border-gray-800 p-3 rounded w-full">
          <select
            value={targetSemName}
            onChange={(e) => setTargetSemName(e.target.value)}
            className="w-full bg-transparent border border-gray-800 text-gray-400 text-[8px] uppercase tracking-widest px-2 py-1 outline-none focus:border-gray-600"
          >
            {userSemesters.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} [{s.type === "past" ? "PAST" : s.type === "active" ? "CURRENT" : "UPCOMING"}]
              </option>
            ))}
          </select>
          <button
            onClick={handleCopy}
            disabled={isPending}
            className="w-full py-1 bg-white text-black text-[8px] font-bold uppercase tracking-widest hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            CONFIRM
          </button>
        </div>
      )}
    </div>
  );
}
