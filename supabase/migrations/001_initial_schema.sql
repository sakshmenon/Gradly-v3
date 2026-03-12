-- =============================================================
-- Gradly — Initial Schema Migration
-- Migration: 001_initial_schema
-- Run this in the Supabase SQL editor or via supabase db push
-- =============================================================

-- ---------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ---------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------
CREATE TYPE course_status AS ENUM ('planned', 'in_progress', 'completed', 'dropped');
CREATE TYPE follow_status  AS ENUM ('pending', 'accepted');
CREATE TYPE plan_feedback  AS ENUM ('thumbs_up', 'thumbs_down');
CREATE TYPE profile_visibility AS ENUM ('public', 'friends_only', 'private');


-- ---------------------------------------------------------------
-- TABLE: classes
-- Master catalog of all courses seeded from university sources.
-- The Python seed script writes into this table.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
    universal_class_id  INTEGER PRIMARY KEY,
    subject             TEXT        NOT NULL,           -- e.g. 'CS', 'MATH', 'ENGL'
    course_id           TEXT        NOT NULL UNIQUE,    -- e.g. 'CS2028C'
    title               TEXT        NOT NULL,
    credits             NUMERIC(4,1) NOT NULL DEFAULT 3,
    description         TEXT,
    prerequisites       TEXT[]      DEFAULT '{}',       -- array of course_id strings
    is_option           BOOLEAN     NOT NULL DEFAULT FALSE,
    option_group        TEXT,                           -- e.g. 'OPT_table_79893'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_subject    ON public.classes (subject);
CREATE INDEX IF NOT EXISTS idx_classes_course_id  ON public.classes (course_id);


-- ---------------------------------------------------------------
-- TABLE: degree_requirements
-- Maps a (major, requirement_category) to a list of course_ids.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.degree_requirements (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    major           TEXT        NOT NULL,           -- e.g. 'Computer Science'
    category        TEXT        NOT NULL,           -- e.g. 'Core', 'Math', 'Science Option', 'CS Elective', 'General Education'
    course_id       TEXT        REFERENCES public.classes(course_id) ON DELETE CASCADE,
    credits_needed  NUMERIC(4,1),                   -- for open elective slots without a fixed course_id
    display_order   INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_degree_req_major ON public.degree_requirements (major);


-- ---------------------------------------------------------------
-- TABLE: users  (extends auth.users via trigger)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT        NOT NULL UNIQUE,
    display_name    TEXT,
    university      TEXT,
    major           TEXT,
    degree_type     TEXT        DEFAULT 'BS',       -- BS, BA, BFA, etc.
    catalog_year    INTEGER,                         -- e.g. 2024
    year_in_school  SMALLINT    CHECK (year_in_school BETWEEN 1 AND 5),
    gpa             NUMERIC(3,2) CHECK (gpa BETWEEN 0 AND 4),
    avatar_url      TEXT,
    visibility      profile_visibility NOT NULL DEFAULT 'friends_only',
    onboarded       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row whenever a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------
-- TABLE: user_courses
-- A student's planned or completed courses.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_courses (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id       TEXT        NOT NULL REFERENCES public.classes(course_id) ON DELETE CASCADE,
    semester        TEXT        NOT NULL,    -- e.g. 'Fall', 'Spring', 'Summer'
    year            INTEGER     NOT NULL,    -- e.g. 2025
    status          course_status NOT NULL DEFAULT 'planned',
    grade           TEXT,                   -- e.g. 'A', 'B+', null if planned
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)             -- a student can only place a course once
);

CREATE INDEX IF NOT EXISTS idx_user_courses_user   ON public.user_courses (user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_status ON public.user_courses (status);

CREATE TRIGGER trg_user_courses_updated_at
    BEFORE UPDATE ON public.user_courses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------
-- TABLE: course_ratings
-- Community-sourced reviews for individual courses.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_ratings (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id       TEXT        NOT NULL REFERENCES public.classes(course_id) ON DELETE CASCADE,
    stars           SMALLINT    NOT NULL CHECK (stars BETWEEN 1 AND 5),
    difficulty      SMALLINT    CHECK (difficulty BETWEEN 1 AND 5),
    workload        SMALLINT    CHECK (workload BETWEEN 1 AND 5),
    professor_name  TEXT,
    review_text     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)             -- one rating per student per course
);

CREATE INDEX IF NOT EXISTS idx_ratings_course ON public.course_ratings (course_id);


-- ---------------------------------------------------------------
-- TABLE: follows
-- Social graph: who follows whom.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status          follow_status NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (follower_id, following_id),
    CHECK (follower_id <> following_id)     -- can't follow yourself
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows (following_id);


-- ---------------------------------------------------------------
-- TABLE: path_plans
-- Stored output of the path recommendation algorithm.
-- plan_data is a JSON array of semester objects.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.path_plans (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_data       JSONB       NOT NULL DEFAULT '[]',
    -- example plan_data shape:
    -- [{"semester":"Fall","year":2025,"courses":["CS2028C","MATH2076"]}, ...]
    feedback        plan_feedback,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_path_plans_user ON public.path_plans (user_id);

CREATE TRIGGER trg_path_plans_updated_at
    BEFORE UPDATE ON public.path_plans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
