-- Run once before deploying the farming update.
-- Existing leaderboard rows start at farming level 1 and are updated on save.
alter table public.leaderboard_stats
  add column if not exists farming_level integer not null default 1;
