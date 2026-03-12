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
-- =============================================================
-- Gradly — Row Level Security Policies
-- Migration: 002_rls_policies
-- Run AFTER 001_initial_schema.sql
-- =============================================================


-- ---------------------------------------------------------------
-- ENABLE RLS on all user-data tables
-- (public.classes and public.degree_requirements are read-only catalogs;
--  we still enable RLS but allow public SELECT)
-- ---------------------------------------------------------------
ALTER TABLE public.classes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.degree_requirements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_plans            ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------
-- classes — public read catalog, no user writes
-- ---------------------------------------------------------------
CREATE POLICY "classes: anyone can read"
    ON public.classes FOR SELECT
    USING (true);


-- ---------------------------------------------------------------
-- degree_requirements — public read catalog, no user writes
-- ---------------------------------------------------------------
CREATE POLICY "degree_requirements: anyone can read"
    ON public.degree_requirements FOR SELECT
    USING (true);


-- ---------------------------------------------------------------
-- users
-- ---------------------------------------------------------------

-- A user can always read their own profile row
CREATE POLICY "users: read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Public profiles are visible to everyone (authenticated)
CREATE POLICY "users: read public profiles"
    ON public.users FOR SELECT
    USING (visibility = 'public' AND auth.role() = 'authenticated');

-- Friends-only profiles are visible to followers whose request was accepted
CREATE POLICY "users: read friends-only profiles"
    ON public.users FOR SELECT
    USING (
        visibility = 'friends_only'
        AND auth.role() = 'authenticated'
        AND (
            auth.uid() = id
            OR EXISTS (
                SELECT 1 FROM public.follows f
                WHERE f.follower_id = auth.uid()
                  AND f.following_id = id
                  AND f.status = 'accepted'
            )
        )
    );

-- A user can insert their own profile row (handled by trigger, but allow manual upsert)
CREATE POLICY "users: insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- A user can update only their own profile
CREATE POLICY "users: update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- ---------------------------------------------------------------
-- user_courses
-- ---------------------------------------------------------------

-- Users can see their own courses unconditionally
CREATE POLICY "user_courses: read own"
    ON public.user_courses FOR SELECT
    USING (user_id = auth.uid());

-- Users can see courses of people they follow (accepted) whose profile is not private
CREATE POLICY "user_courses: read followed users"
    ON public.user_courses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.follows f
            JOIN public.users u ON u.id = user_courses.user_id
            WHERE f.follower_id  = auth.uid()
              AND f.following_id = user_courses.user_id
              AND f.status       = 'accepted'
              AND u.visibility  <> 'private'
        )
    );

-- Users can also see courses of users with fully public profiles
CREATE POLICY "user_courses: read public users"
    ON public.user_courses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = user_courses.user_id
              AND u.visibility = 'public'
        )
    );

CREATE POLICY "user_courses: insert own"
    ON public.user_courses FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_courses: update own"
    ON public.user_courses FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_courses: delete own"
    ON public.user_courses FOR DELETE
    USING (user_id = auth.uid());


-- ---------------------------------------------------------------
-- course_ratings
-- ---------------------------------------------------------------

-- Any authenticated user can read ratings (community data)
CREATE POLICY "course_ratings: read all authenticated"
    ON public.course_ratings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "course_ratings: insert own"
    ON public.course_ratings FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "course_ratings: update own"
    ON public.course_ratings FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "course_ratings: delete own"
    ON public.course_ratings FOR DELETE
    USING (user_id = auth.uid());


-- ---------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------

-- A follower can see their own outgoing follow rows
CREATE POLICY "follows: read own outgoing"
    ON public.follows FOR SELECT
    USING (follower_id = auth.uid());

-- A user can see follow requests directed at them
CREATE POLICY "follows: read own incoming"
    ON public.follows FOR SELECT
    USING (following_id = auth.uid());

CREATE POLICY "follows: insert own"
    ON public.follows FOR INSERT
    WITH CHECK (follower_id = auth.uid());

-- Only the recipient can accept/reject (update status); follower can also delete
CREATE POLICY "follows: update as recipient"
    ON public.follows FOR UPDATE
    USING (following_id = auth.uid())
    WITH CHECK (following_id = auth.uid());

CREATE POLICY "follows: delete own"
    ON public.follows FOR DELETE
    USING (follower_id = auth.uid() OR following_id = auth.uid());


-- ---------------------------------------------------------------
-- path_plans
-- ---------------------------------------------------------------

-- Owner can always read their own plans
CREATE POLICY "path_plans: read own"
    ON public.path_plans FOR SELECT
    USING (user_id = auth.uid());

-- Accepted followers can read plans of non-private users
CREATE POLICY "path_plans: read followed"
    ON public.path_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.follows f
            JOIN public.users u ON u.id = path_plans.user_id
            WHERE f.follower_id  = auth.uid()
              AND f.following_id = path_plans.user_id
              AND f.status       = 'accepted'
              AND u.visibility  <> 'private'
        )
    );

-- Public user plans are readable by all authenticated users
CREATE POLICY "path_plans: read public"
    ON public.path_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = path_plans.user_id
              AND u.visibility = 'public'
        )
    );

CREATE POLICY "path_plans: insert own"
    ON public.path_plans FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "path_plans: update own"
    ON public.path_plans FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "path_plans: delete own"
    ON public.path_plans FOR DELETE
    USING (user_id = auth.uid());


-- =============================================================
-- Migration 003: Profile Fields
-- =============================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS starting_semester   TEXT,
    ADD COLUMN IF NOT EXISTS expected_graduation TEXT;
