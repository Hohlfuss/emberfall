-- Run once in the Supabase SQL editor before deploying the clan update.
create table if not exists public.clans (
  id uuid primary key,
  name text not null check (char_length(btrim(name)) between 3 and 30),
  description text not null default '' check (char_length(description) <= 160),
  visibility text not null check (visibility in ('public', 'invite_only')),
  owner_username text not null references public.players(username) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists clans_name_unique
  on public.clans (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')));

create table if not exists public.clan_members (
  clan_id uuid not null references public.clans(id) on delete cascade,
  username text not null references public.players(username) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (clan_id, username),
  unique (username)
);

create index if not exists clan_members_clan_id_idx
  on public.clan_members (clan_id, joined_at);

create table if not exists public.clan_invitations (
  id uuid primary key,
  clan_id uuid not null references public.clans(id) on delete cascade,
  invited_username text not null references public.players(username) on delete cascade,
  invited_by_username text not null references public.players(username) on delete cascade,
  created_at timestamptz not null default now(),
  unique (clan_id, invited_username)
);

create index if not exists clan_invitations_invited_username_idx
  on public.clan_invitations (invited_username, created_at desc);

create table if not exists public.clan_messages (
  id uuid primary key,
  clan_id uuid not null references public.clans(id) on delete cascade,
  username text not null references public.players(username) on delete cascade,
  message text not null check (char_length(message) between 1 and 240),
  created_at timestamptz not null default now()
);

create index if not exists clan_messages_clan_created_at_idx
  on public.clan_messages (clan_id, created_at desc);
