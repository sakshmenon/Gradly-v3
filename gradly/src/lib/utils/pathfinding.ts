// ── Types ─────────────────────────────────────────────────────────────────────

export type CourseData = {
  course_id:    string;
  title:        string;
  credits:      number;
  prerequisites: string[];
  is_option:    boolean;
  option_group: string | null;
};

export type DegreeReq = {
  course_id:     string | null; // null = open elective slot (no specific course)
  category:      string;
  credits_needed: number | null;
  display_order: number;
};

export type PlannedSemester = {
  semester: string;  // term only, e.g. "Fall"
  year:     number;
  courses:  string[]; // course_ids
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_COURSES_PER_SEMESTER = 5;

// ── Internal helpers ──────────────────────────────────────────────────────────

function prereqsMet(
  courseId: string,
  satisfied: Set<string>,
  courseMap: Map<string, CourseData>
): boolean {
  const info = courseMap.get(courseId);
  if (!info || info.prerequisites.length === 0) return true;
  return info.prerequisites.every((p) => satisfied.has(p));
}

/**
 * Determines the ordered list of course IDs that still need to be scheduled,
 * respecting option groups (only one course per group is planned).
 *
 * Returns courses in priority order: lower display_order = higher priority.
 */
function computeRemainingCourses(
  requirements: DegreeReq[],
  completed:    Set<string>,
  courseMap:    Map<string, CourseData>
): string[] {
  // Mark option groups already satisfied by completed courses
  const satisfiedGroups = new Set<string>();
  for (const courseId of completed) {
    const info = courseMap.get(courseId);
    if (info?.is_option && info.option_group) {
      satisfiedGroups.add(info.option_group);
    }
  }

  const plannedGroups = new Set<string>();
  const remaining: string[] = [];

  // Sort by display_order so core courses come first
  const sorted = [...requirements].sort((a, b) => a.display_order - b.display_order);

  for (const req of sorted) {
    if (!req.course_id) continue; // Skip open elective slots

    // Skip if already completed
    if (completed.has(req.course_id)) continue;

    const info = courseMap.get(req.course_id);

    // Option group handling: include only one representative per group
    if (info?.is_option && info.option_group) {
      if (satisfiedGroups.has(info.option_group)) continue;
      if (plannedGroups.has(info.option_group)) continue;
      plannedGroups.add(info.option_group);
    }

    remaining.push(req.course_id);
  }

  return remaining;
}

// ── Main algorithm ────────────────────────────────────────────────────────────

/**
 * Greedy topological scheduler.
 *
 * For each future semester (in chronological order), it selects up to
 * MAX_COURSES_PER_SEMESTER courses whose full prerequisite chain is satisfied
 * by either:
 *   - courses already completed/in-progress (the `completed` set), or
 *   - courses assigned to an *earlier* semester in this plan.
 *
 * Within each semester, priority follows the order of `requirements`
 * (i.e., core/required courses before electives).
 *
 * If a course's prerequisites are never satisfied (e.g., because a required
 * prerequisite hasn't been taken and isn't in the requirements list), it will
 * simply be omitted from the plan rather than causing an error.
 */
export function buildPlan(
  requirements:    DegreeReq[],
  completed:       Set<string>,
  courseMap:       Map<string, CourseData>,
  futureSemesters: { semester: string; year: number }[]
): PlannedSemester[] {
  const orderedRemaining = computeRemainingCourses(requirements, completed, courseMap);
  const remaining        = new Set(orderedRemaining);
  const satisfied        = new Set(completed); // grows as we assign courses
  const plan: PlannedSemester[] = [];

  for (const sem of futureSemesters) {
    if (remaining.size === 0) break;

    const selected: string[] = [];

    for (const courseId of orderedRemaining) {
      if (!remaining.has(courseId))           continue;
      if (selected.length >= MAX_COURSES_PER_SEMESTER) break;
      if (prereqsMet(courseId, satisfied, courseMap)) {
        selected.push(courseId);
      }
    }

    for (const id of selected) {
      satisfied.add(id);
      remaining.delete(id);
    }

    if (selected.length > 0) {
      plan.push({ semester: sem.semester, year: sem.year, courses: selected });
    }
  }

  return plan;
}
