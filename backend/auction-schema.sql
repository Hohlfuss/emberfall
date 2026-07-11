create table if not exists public.auction_listings (
  id uuid primary key,
  seller_username text not null references public.players(username) on delete cascade,
  seller_name text not null,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  price integer not null check (price > 0),
  created_at timestamptz not null default now()
);

create index if not exists auction_listings_created_at_idx
  on public.auction_listings (created_at desc);
