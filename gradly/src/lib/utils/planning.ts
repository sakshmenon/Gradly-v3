import { getSemesterInfo } from "./semester";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SemesterTerm = "Spring" | "Summer" | "Fall";

export type Semester = {
  name: string;               // "Fall 2024"
  term: SemesterTerm;
  year: number;
  type: "past" | "active" | "upcoming";
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TERM_ORDER: Record<SemesterTerm, number> = { Spring: 0, Summer: 1, Fall: 2 };
const TERMS: SemesterTerm[] = ["Spring", "Summer", "Fall"];

export const AVAILABLE_MAJORS = ["Computer Science"] as const;
export type Major = (typeof AVAILABLE_MAJORS)[number];

// ── Year-in-school ────────────────────────────────────────────────────────────

/**
 * Returns a label like "Freshman", "Sophomore", etc. based on
 * the number of semesters elapsed since the student's starting semester.
 * Each academic year spans 3 semesters (Spring, Summer, Fall).
 */
export function getYearInSchool(startingSemester: string): string {
  const current = getCurrentSemesterName();
  const s = parseSemester(startingSemester);
  const c = parseSemester(current);
  const elapsed = semIdx(c.term, c.year) - semIdx(s.term, s.year);
  if (elapsed < 0)  return "Incoming";
  if (elapsed < 3)  return "Freshman";
  if (elapsed < 6)  return "Sophomore";
  if (elapsed < 9)  return "Junior";
  if (elapsed < 12) return "Senior";
  return "Super Senior";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function parseSemester(s: string): { term: SemesterTerm; year: number; name: string } {
  const [term, yearStr] = s.split(" ");
  return { term: term as SemesterTerm, year: parseInt(yearStr, 10), name: s };
}

function semIdx(term: SemesterTerm, year: number): number {
  return year * 3 + TERM_ORDER[term];
}

export function compareSemesters(a: string, b: string): number {
  const pa = parseSemester(a);
  const pb = parseSemester(b);
  return semIdx(pa.term, pa.year) - semIdx(pb.term, pb.year);
}

export function getCurrentSemesterName(): string {
  return getSemesterInfo().name;
}

// ── Range generators ──────────────────────────────────────────────────────────

/**
 * Returns every semester from `start` through `end` (inclusive),
 * each tagged as past / active / upcoming relative to `currentSem`.
 */
export function generateSemesterRange(
  start: string,
  end: string,
  currentSem: string
): Semester[] {
  const s = parseSemester(start);
  const e = parseSemester(end);
  const c = parseSemester(currentSem);

  const startIdx   = semIdx(s.term, s.year);
  const endIdx     = semIdx(e.term, e.year);
  const currentIdx = semIdx(c.term, c.year);

  if (startIdx > endIdx) return [];

  const result: Semester[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const year    = Math.floor(i / 3);
    const term    = TERMS[i % 3];
    const name    = `${term} ${year}`;
    const type    = i < currentIdx ? "past" : i === currentIdx ? "active" : "upcoming";
    result.push({ name, term, year, type });
  }
  return result;
}

/**
 * Returns names of all semesters strictly before `currentSemester`,
 * starting from `startSemester`. Used for the "empty past semesters" alert.
 */
/**
 * Returns semesters from the one AFTER `currentSemester` through
 * `expectedGraduation` — these are the slots the recommendation algorithm
 * can schedule courses into.
 *
 * Summer semesters are excluded by default (most students don't take them).
 */
export function getFuturePlanSemesters(
  currentSemester:    string,
  expectedGraduation: string,
  includeSummer = false
): Array<{ semester: string; year: number }> {
  const c    = parseSemester(currentSemester);
  const grad = parseSemester(expectedGraduation);

  const nextIdx = semIdx(c.term, c.year) + 1;
  const gradIdx = semIdx(grad.term, grad.year);

  const result: Array<{ semester: string; year: number }> = [];
  for (let i = nextIdx; i <= gradIdx; i++) {
    const year = Math.floor(i / 3);
    const term = TERMS[i % 3];
    if (!includeSummer && term === "Summer") continue;
    result.push({ semester: term, year });
  }
  return result;
}

export function getPastSemesterNames(
  startSemester: string,
  currentSemester: string
): string[] {
  const s = parseSemester(startSemester);
  const c = parseSemester(currentSemester);
  const startIdx   = semIdx(s.term, s.year);
  const currentIdx = semIdx(c.term, c.year);

  if (startIdx >= currentIdx) return [];

  const result: string[] = [];
  for (let i = startIdx; i < currentIdx; i++) {
    result.push(`${TERMS[i % 3]} ${Math.floor(i / 3)}`);
  }
  return result;
}
