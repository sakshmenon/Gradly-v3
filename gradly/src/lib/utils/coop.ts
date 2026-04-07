import {
  getSemesterChronologicalIndex,
  parseSemester,
  type SemesterTerm,
} from "./planning";

/**
 * Next required co-op sequence number (1-based) for a target semester.
 * Counts prior co-op placements in strictly earlier semesters only.
 */
export function computeNextCoopSequence(params: {
  /** Planner semesters in chronological order (same order as `generateSemesterRange`). */
  orderedSemesterNames: string[];
  coursesBySemester: Record<
    string,
    Array<{ class_kind?: string; coop_sequence?: number | null }>
  >;
  targetSemesterName: string;
}): number {
  const { orderedSemesterNames, coursesBySemester, targetSemesterName } = params;
  const target = parseSemester(targetSemesterName);
  const targetIdx = getSemesterChronologicalIndex(target.term as SemesterTerm, target.year);

  let maxSeq = 0;
  for (const semName of orderedSemesterNames) {
    const s = parseSemester(semName);
    const idx = getSemesterChronologicalIndex(s.term as SemesterTerm, s.year);
    if (idx >= targetIdx) continue;
    for (const c of coursesBySemester[semName] ?? []) {
      if (c.class_kind === "coop" && c.coop_sequence != null) {
        maxSeq = Math.max(maxSeq, c.coop_sequence);
      }
    }
  }
  return maxSeq + 1;
}
