export const SEMESTER_TOTAL_DAYS = 112;

export type SemesterInfo = {
  name: string;       // e.g. "Spring 2026"
  week: number;       // 1-based week number within the semester
  daysPassed: number;
  totalDays: number;
  progressPct: number; // 0–100, capped
};

/**
 * Determine which semester the given date falls in and how far
 * through it we are.
 *
 * Season start heuristics:
 *   Spring  — second week of January  → Jan 12
 *   Summer  — first week of June      → Jun 2
 *   Fall    — last week of August     → Aug 25
 */
export function getSemesterInfo(now: Date = new Date()): SemesterInfo {
  const y = now.getFullYear();

  const starts = {
    spring: new Date(y, 0, 12),   // Jan 12
    summer: new Date(y, 5, 2),    // Jun 2
    fall:   new Date(y, 7, 25),   // Aug 25
  };

  let name: string;
  let start: Date;

  if (now >= starts.fall) {
    name  = `Fall ${y}`;
    start = starts.fall;
  } else if (now >= starts.summer) {
    name  = `Summer ${y}`;
    start = starts.summer;
  } else if (now >= starts.spring) {
    name  = `Spring ${y}`;
    start = starts.spring;
  } else {
    // Before spring of this year — still in fall of the prior year
    name  = `Fall ${y - 1}`;
    start = new Date(y - 1, 7, 25);
  }

  const msPerDay    = 1000 * 60 * 60 * 24;
  const daysPassed  = Math.max(0, Math.floor((now.getTime() - start.getTime()) / msPerDay));
  const capped      = Math.min(daysPassed, SEMESTER_TOTAL_DAYS);
  const week        = Math.floor(capped / 7) + 1;
  const progressPct = Math.min(100, Math.round((capped / SEMESTER_TOTAL_DAYS) * 100));

  return { name, week, daysPassed: capped, totalDays: SEMESTER_TOTAL_DAYS, progressPct };
}
