-- Run the diagnostic query first. If it returns rows, rename the duplicate
-- players before creating the unique index below.
select
  lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')) as display_name,
  array_agg(username order by username) as accounts
from public.players
group by lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
having count(*) > 1;

-- This protects display-name uniqueness even when two signup requests arrive
-- at the same time. Names are compared case-insensitively with spaces collapsed.
create unique index if not exists players_display_name_unique
  on public.players (
    lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
  );
