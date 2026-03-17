-- =============================================================
-- Gradly — Migration 005: Course Ratings Semester Taken
-- Adds semester_taken column to course_ratings so reviewers can
-- record which semester/professor they experienced the class with.
-- =============================================================

ALTER TABLE public.course_ratings
    ADD COLUMN IF NOT EXISTS semester_taken TEXT;   -- e.g. 'Fall 2024'
