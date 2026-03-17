/**
 * Client-safe pathfinding utilities — no server/browser imports.
 *
 * Three modes (matching the notebook in scripts/plygrnd.ipynb):
 *   1  Lowest First          — sort by course number ascending
 *   2  Uniform Random        — Fisher-Yates shuffle
 *   3  Uniform Distribution  — round-robin interleave across course levels
 *                              (1000 / 2000 / 3000 / 4000+)
 */

export const MAX_CREDITS = 18;

export type PlannerCourse = {
  course_id: string;
  title:     string;
  credits:   number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function courseNumber(courseId: string): number {
  return parseInt(courseId.match(/\d+/)?.[0] ?? "9999", 10);
}

// ── Sorting / ordering modes ──────────────────────────────────────────────────

function mode1LowestFirst(courses: PlannerCourse[]): PlannerCourse[] {
  return [...courses].sort((a, b) => courseNumber(a.course_id) - courseNumber(b.course_id));
}

function mode2UniformRandom(courses: PlannerCourse[]): PlannerCourse[] {
  const arr = [...courses];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Groups courses by thousand-level (1000, 2000, 3000, 4000+) then
 * interleaves them round-robin so each level contributes one course
 * per cycle before cycling back.
 */
function mode3UniformDistribution(courses: PlannerCourse[]): PlannerCourse[] {
  // Sort numerically so within each level courses are lowest-first
  const sorted = [...courses].sort((a, b) => courseNumber(a.course_id) - courseNumber(b.course_id));

  // Group by thousand-level
  const levelMap = new Map<number, PlannerCourse[]>();
  for (const c of sorted) {
    const level = Math.floor(courseNumber(c.course_id) / 1000);
    if (!levelMap.has(level)) levelMap.set(level, []);
    levelMap.get(level)!.push(c);
  }

  // Levels in ascending order (Map preserves insertion order and we inserted sorted)
  const groups = Array.from(levelMap.values()).map(g => [...g]);

  // Round-robin interleave
  const result: PlannerCourse[] = [];
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const g of groups) {
      if (g.length > 0) {
        result.push(g.shift()!);
        hasMore = true;
      }
    }
  }
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type PathfinderMode = 1 | 2 | 3;

export const MODE_META: Record<PathfinderMode, { name: string; desc: string }> = {
  1: {
    name: "Lowest First",
    desc: "Prioritises lower course numbers (1000 → 4000). Good for building prerequisites first.",
  },
  2: {
    name: "Random",
    desc: "Shuffles courses randomly. Good for variety or exploring a fresh arrangement.",
  },
  3: {
    name: "Balanced",
    desc: "Spreads courses evenly across all levels (1000 / 2000 / 3000 / 4000+). Good for a balanced workload.",
  },
};

/**
 * Runs the chosen pathfinding mode and fills a semester up to `maxCredits`.
 *
 * Unlike the notebook (which breaks on first overflow), this implementation
 * uses continue — so lighter courses that arrive later can still be packed in.
 *
 * Returns:
 *   scheduled — courses placed in this semester
 *   remaining — everything left over (preserves order for next run)
 */
export function runPathfinder(
  courses:    PlannerCourse[],
  mode:       PathfinderMode,
  maxCredits: number = MAX_CREDITS
): { scheduled: PlannerCourse[]; remaining: PlannerCourse[] } {
  const ordered =
    mode === 1 ? mode1LowestFirst(courses) :
    mode === 2 ? mode2UniformRandom(courses) :
                 mode3UniformDistribution(courses);

  const scheduled: PlannerCourse[] = [];
  const scheduledIds = new Set<string>();
  let total = 0;

  for (const c of ordered) {
    if (total + c.credits <= maxCredits) {
      total += c.credits;
      scheduled.push(c);
      scheduledIds.add(c.course_id);
    }
    // continue (not break) — pack lighter courses even if a heavy one didn't fit
  }

  const remaining = courses.filter(c => !scheduledIds.has(c.course_id));
  return { scheduled, remaining };
}
