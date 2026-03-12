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
