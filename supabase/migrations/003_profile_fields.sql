-- =============================================================
-- Gradly — Migration 003: Profile Fields
-- Adds starting_semester and expected_graduation to users table
-- =============================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS starting_semester   TEXT,   -- e.g. 'Fall 2024'
    ADD COLUMN IF NOT EXISTS expected_graduation TEXT;   -- e.g. 'Spring 2028'
