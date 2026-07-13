-- Run or re-run in the Supabase SQL editor before deploying clan updates.
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

alter table public.clans
  add column if not exists contribution_xp bigint not null default 0 check (contribution_xp >= 0);

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

create table if not exists public.clan_contributions (
  id uuid primary key,
  clan_id uuid not null references public.clans(id) on delete cascade,
  username text not null references public.players(username) on delete cascade,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  item_tier integer not null check (item_tier > 0),
  value bigint not null check (value > 0),
  contribution_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists clan_contributions_clan_date_idx
  on public.clan_contributions (clan_id, contribution_date desc, created_at desc);

create table if not exists public.clan_contributor_totals (
  clan_id uuid not null references public.clans(id) on delete cascade,
  username text not null references public.players(username) on delete cascade,
  total_items bigint not null default 0 check (total_items >= 0),
  total_value bigint not null default 0 check (total_value >= 0),
  last_contributed_at timestamptz not null default now(),
  primary key (clan_id, username)
);

create index if not exists clan_contributor_totals_ranking_idx
  on public.clan_contributor_totals (clan_id, total_value desc);

-- Records a contribution, updates the member's total, and adds clan XP atomically.
create or replace function public.record_clan_contribution(
  contribution_id uuid,
  target_clan_id uuid,
  contributor_username text,
  contributed_item text,
  contributed_quantity integer,
  contributed_tier integer,
  contributed_value bigint,
  contributed_date date
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_total bigint;
begin
  insert into public.clan_contributions (
    id, clan_id, username, item_name, quantity, item_tier, value, contribution_date
  ) values (
    contribution_id, target_clan_id, contributor_username, contributed_item,
    contributed_quantity, contributed_tier, contributed_value, contributed_date
  );

  insert into public.clan_contributor_totals (
    clan_id, username, total_items, total_value, last_contributed_at
  ) values (
    target_clan_id, contributor_username, contributed_quantity, contributed_value, now()
  )
  on conflict (clan_id, username) do update set
    total_items = public.clan_contributor_totals.total_items + excluded.total_items,
    total_value = public.clan_contributor_totals.total_value + excluded.total_value,
    last_contributed_at = excluded.last_contributed_at;

  update public.clans
  set contribution_xp = contribution_xp + contributed_value
  where id = target_clan_id
  returning contribution_xp into new_total;

  if new_total is null then
    raise exception 'Clan not found';
  end if;
  return new_total;
end;
$$;

revoke all on function public.record_clan_contribution(uuid, uuid, text, text, integer, integer, bigint, date) from public, anon, authenticated;
grant execute on function public.record_clan_contribution(uuid, uuid, text, text, integer, integer, bigint, date) to service_role;

-- The game accesses these tables only through the backend secret-key client.
alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.clan_invitations enable row level security;
alter table public.clan_messages enable row level security;
alter table public.clan_contributions enable row level security;
alter table public.clan_contributor_totals enable row level security;
