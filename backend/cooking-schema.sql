-- Run once before deploying the cooking update.
-- Existing leaderboard rows start at cooking level 1 and are updated on save.
alter table public.leaderboard_stats
  add column if not exists cooking_level integer not null default 1;
