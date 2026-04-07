import type { PlannerCourse } from "@/lib/utils/pathfinder";

/**
 * Catalog co-op work terms use ids like COOP2011 (see classes seed).
 * Study semesters must never schedule these; they belong on co-op terms only.
 */
export function isCoopCatalogCourseId(courseId: string): boolean {
  return courseId.replace(/\s+/g, "").toUpperCase().startsWith("COOP");
}

/** Split queue: courses allowed on a study semester vs co-op–only catalog rows. */
export function partitionPlannerCoursesForStudyScheduling(
  courses: PlannerCourse[]
): { studyQueue: PlannerCourse[]; coopCatalogOnly: PlannerCourse[] } {
  const studyQueue: PlannerCourse[] = [];
  const coopCatalogOnly: PlannerCourse[] = [];
  for (const c of courses) {
    if (isCoopCatalogCourseId(c.course_id)) coopCatalogOnly.push(c);
    else studyQueue.push(c);
  }
  return { studyQueue, coopCatalogOnly };
}
