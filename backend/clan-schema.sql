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

alter table public.clans
  add column if not exists raid_victories integer not null default 0 check (raid_victories >= 0);

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

create table if not exists public.clan_raids (
  id uuid primary key,
  clan_id uuid not null references public.clans(id) on delete cascade,
  week_key date not null,
  boss_id text not null,
  boss_name text not null,
  boss_title text not null,
  boss_icon text not null,
  boss_description text not null,
  difficulty integer not null check (difficulty > 0),
  max_health bigint not null check (max_health > 0),
  current_health bigint not null check (current_health >= 0 and current_health <= max_health),
  attack integer not null check (attack > 0),
  defense integer not null check (defense >= 0),
  attack_speed integer not null check (attack_speed > 0),
  gold_reward integer not null check (gold_reward >= 0),
  xp_reward integer not null check (xp_reward >= 0),
  clan_xp_reward bigint not null check (clan_xp_reward >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  defeated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (clan_id, week_key)
);

create index if not exists clan_raids_clan_week_idx
  on public.clan_raids (clan_id, week_key desc);

create table if not exists public.clan_raid_attempts (
  id uuid primary key,
  raid_id uuid not null references public.clan_raids(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  username text not null references public.players(username) on delete cascade,
  attempt_date date not null,
  damage bigint not null check (damage > 0),
  survived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (raid_id, username, attempt_date)
);

create index if not exists clan_raid_attempts_raid_damage_idx
  on public.clan_raid_attempts (raid_id, damage desc, created_at);

create table if not exists public.clan_raid_rewards (
  id uuid primary key default gen_random_uuid(),
  raid_id uuid not null references public.clan_raids(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  username text not null references public.players(username) on delete cascade,
  gold_reward integer not null check (gold_reward >= 0),
  xp_reward integer not null check (xp_reward >= 0),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique (raid_id, username)
);

create index if not exists clan_raid_rewards_player_idx
  on public.clan_raid_rewards (username, claimed_at, created_at);

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

-- Applies one daily raid attempt while holding a lock on the shared boss row.
-- On the killing blow, every current member receives a pending personal reward,
-- clan XP is awarded, and the next weekly raid difficulty is increased.
create or replace function public.record_clan_raid_attempt(
  attempt_id uuid,
  target_raid_id uuid,
  target_clan_id uuid,
  attacker_username text,
  attempt_day date,
  dealt_damage bigint,
  attacker_survived boolean
)
returns table (
  applied_damage bigint,
  remaining_health bigint,
  raid_defeated boolean,
  personal_gold integer,
  personal_xp integer,
  awarded_clan_xp bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  raid_row public.clan_raids%rowtype;
  actual_damage bigint;
  new_health bigint;
  defeated_now boolean;
begin
  if dealt_damage < 1 then
    raise exception 'Raid damage must be positive';
  end if;

  if not exists (
    select 1 from public.clan_members
    where clan_id = target_clan_id and username = attacker_username
  ) then
    raise exception 'You are not a member of this clan';
  end if;

  select * into raid_row
  from public.clan_raids
  where id = target_raid_id and clan_id = target_clan_id
  for update;

  if raid_row.id is null then
    raise exception 'Clan raid not found';
  end if;
  if raid_row.defeated_at is not null or raid_row.current_health <= 0 then
    raise exception 'This raid boss has already been defeated';
  end if;
  if now() < raid_row.starts_at or now() >= raid_row.ends_at then
    raise exception 'This clan raid is not active';
  end if;

  actual_damage := least(dealt_damage, raid_row.current_health);

  insert into public.clan_raid_attempts (
    id, raid_id, clan_id, username, attempt_date, damage, survived
  ) values (
    attempt_id, target_raid_id, target_clan_id, attacker_username,
    attempt_day, actual_damage, attacker_survived
  );

  new_health := raid_row.current_health - actual_damage;
  defeated_now := new_health = 0;

  update public.clan_raids
  set current_health = new_health,
      defeated_at = case when defeated_now then now() else defeated_at end
  where id = target_raid_id;

  if defeated_now then
    update public.clans
    set contribution_xp = contribution_xp + raid_row.clan_xp_reward,
        raid_victories = raid_victories + 1
    where id = target_clan_id;

    insert into public.clan_raid_rewards (
      raid_id, clan_id, username, gold_reward, xp_reward
    )
    select target_raid_id, target_clan_id, member.username,
           raid_row.gold_reward, raid_row.xp_reward
    from public.clan_members member
    where member.clan_id = target_clan_id
    on conflict (raid_id, username) do nothing;
  end if;

  return query select
    actual_damage,
    new_health,
    defeated_now,
    raid_row.gold_reward,
    raid_row.xp_reward,
    case when defeated_now then raid_row.clan_xp_reward else 0 end;
end;
$$;

revoke all on function public.record_clan_raid_attempt(uuid, uuid, uuid, text, date, bigint, boolean) from public, anon, authenticated;
grant execute on function public.record_clan_raid_attempt(uuid, uuid, uuid, text, date, bigint, boolean) to service_role;

-- The game accesses these tables only through the backend secret-key client.
alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.clan_invitations enable row level security;
alter table public.clan_messages enable row level security;
alter table public.clan_contributions enable row level security;
alter table public.clan_contributor_totals enable row level security;
alter table public.clan_raids enable row level security;
alter table public.clan_raid_attempts enable row level security;
alter table public.clan_raid_rewards enable row level security;
