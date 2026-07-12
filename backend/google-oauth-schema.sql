-- Run this once in the Supabase SQL editor before enabling Google login.
alter table public.players
  add column if not exists google_sub text,
  add column if not exists google_email text;

alter table public.players
  alter column salt drop not null,
  alter column password_hash drop not null;

create unique index if not exists players_google_sub_unique
  on public.players (google_sub)
  where google_sub is not null;

create index if not exists players_google_email_idx
  on public.players (google_email)
  where google_email is not null;
