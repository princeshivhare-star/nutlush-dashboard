-- Nutlush paid subscribers — Supabase schema
-- Run this once in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- team_members: allowlist of who can sign in and use the dashboard.
-- To give someone access, insert their email here — that's the whole flow.
-- ---------------------------------------------------------------------------
create table if not exists team_members (
  email text primary key,
  added_at timestamptz default now()
);

-- put yourself on the list so you can sign in the first time
insert into team_members (email) values ('YOUR_EMAIL_HERE@example.com')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- subscribers
-- ---------------------------------------------------------------------------
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text not null,
  address text not null,
  product text not null default '8L Almond Milk Subscription',
  delivery_days text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- deliveries: one row per scheduled/completed delivery
-- ---------------------------------------------------------------------------
create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references subscribers(id) on delete cascade,
  date date not null,
  qty numeric(5, 2) default 1,
  status text check (status in ('pending', 'delivered', 'cancelled')) default 'pending',
  note text default '',
  created_at timestamptz default now()
);
create index if not exists idx_deliveries_subscriber on deliveries (subscriber_id);
create index if not exists idx_deliveries_date on deliveries (date);

-- ---------------------------------------------------------------------------
-- helper: is the currently signed-in user on the team list?
-- ---------------------------------------------------------------------------
create or replace function is_team_member()
returns boolean as $$
  select exists (
    select 1 from team_members where email = auth.jwt() ->> 'email'
  );
$$ language sql security definer stable;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table team_members enable row level security;
alter table subscribers enable row level security;
alter table deliveries enable row level security;

-- team_members: any signed-in team member can see the list and add teammates
create policy "team can read team list" on team_members
  for select using (is_team_member() or email = auth.jwt() ->> 'email');
create policy "team can add teammates" on team_members
  for insert with check (is_team_member());
create policy "team can remove teammates" on team_members
  for delete using (is_team_member());

-- subscribers / deliveries: full access for anyone on the team list
create policy "team full access subscribers" on subscribers
  for all using (is_team_member()) with check (is_team_member());
create policy "team full access deliveries" on deliveries
  for all using (is_team_member()) with check (is_team_member());
