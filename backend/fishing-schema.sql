-- Run once before deploying the fishing update.
-- Existing leaderboard rows start at fishing level 1 and are updated on save.
alter table public.leaderboard_stats
  add column if not exists fishing_level integer not null default 1;
