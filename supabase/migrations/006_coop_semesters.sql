-- =============================================================
-- Migration 006: Co-op semesters & co-op course catalog
-- =============================================================

-- Course kind: regular study vs co-op work term (single placement per co-op semester)
ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS class_kind TEXT NOT NULL DEFAULT 'study'
        CHECK (class_kind IN ('study', 'coop'));

ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS coop_sequence SMALLINT
        CHECK (coop_sequence IS NULL OR coop_sequence > 0);

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_coop_kind_sequence_check;
ALTER TABLE public.classes
    ADD CONSTRAINT classes_coop_kind_sequence_check
        CHECK (class_kind <> 'coop' OR coop_sequence IS NOT NULL);

-- Per-user flag: this planner semester is a co-op term (not stored on user_courses rows)
CREATE TABLE IF NOT EXISTS public.user_semester_modes (
    user_id   UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    semester  TEXT    NOT NULL,
    year      INTEGER NOT NULL,
    is_coop   BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, semester, year)
);

CREATE INDEX IF NOT EXISTS idx_user_semester_modes_user ON public.user_semester_modes (user_id);

ALTER TABLE public.user_semester_modes ENABLE ROW LEVEL SECURITY;

-- Idempotent: safe to re-run if policies were created in a partial run
DROP POLICY IF EXISTS "user_semester_modes: read own" ON public.user_semester_modes;
DROP POLICY IF EXISTS "user_semester_modes: insert own" ON public.user_semester_modes;
DROP POLICY IF EXISTS "user_semester_modes: update own" ON public.user_semester_modes;
DROP POLICY IF EXISTS "user_semester_modes: delete own" ON public.user_semester_modes;

CREATE POLICY "user_semester_modes: read own"
    ON public.user_semester_modes FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "user_semester_modes: insert own"
    ON public.user_semester_modes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_semester_modes: update own"
    ON public.user_semester_modes FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_semester_modes: delete own"
    ON public.user_semester_modes FOR DELETE
    USING (user_id = auth.uid());

-- Co-op offerings are defined only as rows in public.classes (class_kind = 'coop', coop_sequence set).
-- Add them via your catalog seed or admin tooling — do not hardcode course IDs in application code.
