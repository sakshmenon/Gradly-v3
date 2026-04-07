"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  getSemesterChronologicalIndex,
  getSemesterOffsetFromStart,
  type SemesterTerm,
} from "@/lib/utils/planning";
import { isCoopCatalogCourseId } from "@/lib/utils/coopPlacement";

type ClassRow = {
  course_id: string;
  class_kind: string;
  coop_sequence: number | null;
};

/** Co-op work-term rows: class_kind, or catalog ids starting with COOP (must not go on study terms). */
function isCoopCatalogCourse(classRow: ClassRow): boolean {
  if (classRow.class_kind === "coop") return true;
  return isCoopCatalogCourseId(classRow.course_id);
}

/** Labels for errors — always from `classes`, never hardcoded course IDs. */
async function describeExpectedCoopFromCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nextSeq: number
): Promise<string> {
  const { data } = await supabase
    .from("classes")
    .select("course_id, title")
    .eq("class_kind", "coop")
    .eq("coop_sequence", nextSeq)
    .maybeSingle();

  if (!data) {
    return `No row exists in the classes table for co-op sequence ${nextSeq} (class_kind = 'coop', coop_sequence = ${nextSeq}).`;
  }
  return `Add ${data.course_id} — ${data.title} (catalog sequence ${nextSeq}).`;
}

export async function getNextCoopSequenceForSemester(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  term: string,
  year: number
): Promise<number> {
  const targetIdx = getSemesterChronologicalIndex(term as SemesterTerm, year);

  const { data: rows } = await supabase
    .from("user_courses")
    .select("semester, year, course_id, classes(class_kind, coop_sequence)")
    .eq("user_id", userId);

  let maxSeq = 0;
  for (const row of rows ?? []) {
    const cls = row.classes as { class_kind?: string | null; coop_sequence?: number | null } | null;
    const cid = row.course_id as string;
    const isCoopRow =
      cls?.class_kind === "coop" || isCoopCatalogCourseId(cid);
    if (!isCoopRow || cls?.coop_sequence == null) continue;
    const rIdx = getSemesterChronologicalIndex(row.semester as SemesterTerm, row.year);
    if (rIdx < targetIdx) maxSeq = Math.max(maxSeq, cls.coop_sequence);
  }
  return maxSeq + 1;
}

/** Next co-op sequence (1-based) required for this term/year — for UI / auto-scheduler. */
export async function getNextCoopSequenceForTermYear(term: string, year: number): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 1;
  return getNextCoopSequenceForSemester(supabase, user.id, term, year);
}

/**
 * Shared placement rules (co-op vs study). Used by planner inserts and auto-scheduler approve.
 */
export async function validateCoursePlacementForSemester(
  courseId: string,
  term: string,
  year: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: cls, error: clsErr } = await supabase
    .from("classes")
    .select("course_id, class_kind, coop_sequence")
    .eq("course_id", courseId)
    .single();

  if (clsErr || !cls) return { error: clsErr?.message ?? "Class not found" };
  const classRow = cls as ClassRow;

  const { data: modeRow } = await supabase
    .from("user_semester_modes")
    .select("is_coop")
    .eq("user_id", user.id)
    .eq("semester", term)
    .eq("year", year)
    .maybeSingle();

  const isCoopSemester = modeRow?.is_coop === true;

  const { data: inSem } = await supabase
    .from("user_courses")
    .select("id, course_id, classes(class_kind)")
    .eq("user_id", user.id)
    .eq("semester", term)
    .eq("year", year);

  const rowsInSem = inSem ?? [];

  if (isCoopSemester) {
    if (!isCoopCatalogCourse(classRow)) {
      return {
        error:
          "Co-op semesters only allow co-op work-term courses from the catalog (class_kind = 'coop').",
      };
    }
    if (rowsInSem.length >= 1) {
      return { error: "Co-op semesters allow exactly one course." };
    }
    const nextSeq = await getNextCoopSequenceForSemester(supabase, user.id, term, year);
    if (classRow.coop_sequence !== nextSeq) {
      const hint = await describeExpectedCoopFromCatalog(supabase, nextSeq);
      return {
        error: `Co-op placements must follow catalog order. ${hint}`,
      };
    }
  } else {
    // Study semester: never schedule co-op catalog courses (class_kind or COOP* id).
    if (isCoopCatalogCourse(classRow)) {
      return {
        error:
          "Study semesters cannot include co-op work courses. Mark this term as a co-op semester on the planner, then place the next COOP catalog course there.",
      };
    }
  }

  return {};
}

export async function addCourseToSemester(
  courseId: string,
  term: string,
  year: number,
  status: "completed" | "in_progress" | "planned",
  grade?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const validation = await validateCoursePlacementForSemester(courseId, term, year);
  if (validation.error) return { error: validation.error };

  const { error } = await supabase.from("user_courses").insert({
    user_id:   user.id,
    course_id: courseId,
    semester:  term,
    year,
    status,
    grade:     grade?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/planning");
  revalidatePath("/");
  return { success: true as const };
}

export async function setSemesterCoopMode(
  term: string,
  year: number,
  isCoop: boolean,
  startingSemester: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const offset = getSemesterOffsetFromStart(startingSemester, term as SemesterTerm, year);
  if (isCoop && offset < 2) {
    return { error: "The first two semesters in your plan cannot be co-op semesters." };
  }

  const { data: rows } = await supabase
    .from("user_courses")
    .select("id, course_id, classes(class_kind)")
    .eq("user_id", user.id)
    .eq("semester", term)
    .eq("year", year);

  const placed = rows ?? [];

  function rowIsCoopCatalog(r: (typeof placed)[0]): boolean {
    const kind = (r.classes as { class_kind?: string } | null)?.class_kind;
    return kind === "coop" || isCoopCatalogCourseId(r.course_id as string);
  }

  if (isCoop) {
    if (placed.length > 1) {
      return { error: "Remove extra courses so at most one remains before marking this semester as co-op." };
    }
    if (placed.length === 1) {
      if (!rowIsCoopCatalog(placed[0])) {
        return { error: "Remove non–co-op courses from this semester before marking it as co-op." };
      }
    }
    const { error } = await supabase.from("user_semester_modes").upsert(
      {
        user_id: user.id,
        semester: term,
        year,
        is_coop: true,
      },
      { onConflict: "user_id,semester,year" }
    );
    if (error) return { error: error.message };
  } else {
    for (const r of placed) {
      if (rowIsCoopCatalog(r)) {
        return { error: "Remove the co-op course from this semester before turning off co-op mode." };
      }
    }
    const { error } = await supabase
      .from("user_semester_modes")
      .delete()
      .eq("user_id", user.id)
      .eq("semester", term)
      .eq("year", year);
    if (error) return { error: error.message };
  }

  revalidatePath("/planning");
  return { success: true as const };
}

export async function removeCourseFromSemester(userCourseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_courses")
    .delete()
    .eq("id", userCourseId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/planning");
  revalidatePath("/");
  return { success: true as const };
}
