-- =============================================================
-- Gradly — Migration 004: Public Visibility Default
-- Users need to be discoverable for the Explore page to work.
-- Changing the default from 'friends_only' to 'public'.
-- Users can opt down to 'friends_only' or 'private' in settings.
-- =============================================================

ALTER TABLE public.users
    ALTER COLUMN visibility SET DEFAULT 'public';

-- Update existing rows that still hold the old default
UPDATE public.users
SET visibility = 'public'
WHERE visibility = 'friends_only';
