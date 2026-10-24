-- Only members can read snapshots for realtime subscriptions. All client writes
-- pass through membership, turn and score validation in the Edge Function.
create table if not exists public.clubhouse_rooms (
 id uuid primary key,
 code text not null unique check (code ~ '^[A-Z2-9]{8}$'),
 host_id uuid not null references auth.users(id),
 member_ids uuid[] not null,
 revision bigint not null default 0,
 state jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.clubhouse_rooms enable row level security;
revoke all on public.clubhouse_rooms from anon, authenticated;
grant select on public.clubhouse_rooms to authenticated;
grant all on public.clubhouse_rooms to service_role;
create policy "Members read their own rooms" on public.clubhouse_rooms for select
 to authenticated using ((select auth.uid()) = any(member_ids));
create index if not exists clubhouse_rooms_members on public.clubhouse_rooms using gin(member_ids);
create index if not exists clubhouse_rooms_host_time on public.clubhouse_rooms(host_id,created_at);
alter publication supabase_realtime add table public.clubhouse_rooms;
