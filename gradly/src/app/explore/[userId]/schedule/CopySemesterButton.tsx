"use client";

import { useState, useTransition } from "react";
import { copySemesterCourses } from "./actions";
import type { Semester } from "@/lib/utils/planning";

type Props = {
  sourceCourseIds: string[];
  userSemesters: Semester[];
};

const TYPE_LABEL: Record<Semester["type"], string> = {
  past:     "[PAST]",
  active:   "[CURRENT]",
  upcoming: "[UPCOMING]",
};

export default function CopySemesterButton({ sourceCourseIds, userSemesters }: Props) {
  const [targetSemName, setTargetSemName] = useState(userSemesters[0]?.name ?? "");
  const [message,       setMessage]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (sourceCourseIds.length === 0 || userSemesters.length === 0) return null;

  function handleCopy() {
    const sem = userSemesters.find((s) => s.name === targetSemName);
    if (!sem) return;

    const status: "completed" | "in_progress" | "planned" =
      sem.type === "past"   ? "completed"   :
      sem.type === "active" ? "in_progress" : "planned";

    setMessage(null);
    startTransition(async () => {
      const result = await copySemesterCourses(
        sourceCourseIds,
        sem.term,
        sem.year,
        status
      );
      setMessage(
        result.error
          ? `Error: ${result.error}`
          : `Copied to ${sem.name} — courses you already have were skipped.`
      );
    });
  }

  return (
    <div>
      <label htmlFor={`copy-target-${targetSemName}`}>Copy to my semester: </label>
      <select
        id={`copy-target-${targetSemName}`}
        value={targetSemName}
        onChange={(e) => { setTargetSemName(e.target.value); setMessage(null); }}
      >
        {userSemesters.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name} {TYPE_LABEL[s.type]}
          </option>
        ))}
      </select>
      {" "}
      <button type="button" onClick={handleCopy} disabled={isPending}>
        {isPending ? "Copying…" : "Copy this semester"}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
