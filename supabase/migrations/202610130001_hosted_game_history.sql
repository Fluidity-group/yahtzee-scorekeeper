-- Additive development candidate. Apply before enabling hosted rematches.
-- Archive + successor + readiness receipt commit together, or not at all.
begin;
create table if not exists public.clubhouse_games (
 id uuid primary key,
 room_id uuid not null references public.clubhouse_rooms(id),
 sequence_number integer not null check (sequence_number > 0),
 member_ids uuid[] not null,
 state jsonb not null,
 revision bigint not null,
 ended_at timestamptz,
 unique (room_id, sequence_number)
);
create table if not exists public.clubhouse_room_receipts (
 room_id uuid not null references public.clubhouse_rooms(id),
 command_id text not null,
 actor_id uuid not null,
 fingerprint text not null,
 primary key (room_id, command_id)
);
alter table public.clubhouse_games enable row level security;
alter table public.clubhouse_room_receipts enable row level security;
revoke all on public.clubhouse_games, public.clubhouse_room_receipts from anon, authenticated;
grant select on public.clubhouse_games to authenticated;
grant all on public.clubhouse_games, public.clubhouse_room_receipts to service_role;
drop policy if exists "Members read their hosted game history" on public.clubhouse_games;
create policy "Members read their hosted game history" on public.clubhouse_games for select
 to authenticated using ((select auth.uid()) = any(member_ids));
create index if not exists clubhouse_games_member_ids on public.clubhouse_games using gin(member_ids);

-- Preserve genuine existing snapshots; never reconstruct missing older games.
insert into public.clubhouse_games(id,room_id,sequence_number,member_ids,state,revision,ended_at)
 select (state->'game'->>'id')::uuid,id,coalesce((state->>'gameSequence')::integer,1),member_ids,
 state->'game',(state->'game'->>'revision')::bigint,(state->'game'->>'endedAt')::timestamptz
 from public.clubhouse_rooms where state->'game' is not null and state->'game'<>'null'::jsonb
 on conflict do nothing;
-- Never silently fall back to room-only writes for a migrated first game.
update public.clubhouse_rooms set state=jsonb_set(state,'{historyVersion}','1'::jsonb)
 where state->'game' is not null and state->'game'<>'null'::jsonb;

create or replace function public.clubhouse_rematch_available() returns boolean
 language sql stable security invoker set search_path = '' as $$ select true $$;
revoke all on function public.clubhouse_rematch_available() from public, anon, authenticated;
grant execute on function public.clubhouse_rematch_available() to service_role;

create or replace function public.clubhouse_commit_game(
 p_room_id uuid, p_expected_revision bigint, p_state jsonb,
 p_actor_id uuid, p_command_id text default null, p_fingerprint text default null
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare
 prior public.clubhouse_rooms%rowtype;
 receipt public.clubhouse_room_receipts%rowtype;
 snapshot jsonb;
 seq integer;
begin
 select * into prior from public.clubhouse_rooms where id=p_room_id for update;
 if not found or not (p_actor_id = any(prior.member_ids)) then raise exception 'Invalid room member'; end if;
 if p_command_id is not null then
  select * into receipt from public.clubhouse_room_receipts where room_id=p_room_id and command_id=p_command_id;
  if found then
   if receipt.actor_id<>p_actor_id or receipt.fingerprint<>p_fingerprint then raise exception 'Command collision'; end if;
   return false; -- caller reads the current accepted room/receipt on retry
  end if;
 end if;
 if prior.revision<>p_expected_revision then return false; end if;
 if (p_state->>'id')::uuid is distinct from p_room_id or p_state->>'code' is distinct from prior.code
  or (p_state->>'revision')::bigint is distinct from prior.revision+1
  or p_state->'members' is distinct from prior.state->'members'
  or p_state->>'hostId' is distinct from prior.state->>'hostId' then raise exception 'Invalid transition'; end if;
 -- Preserve the exact previous game's accepted state before a pointer moves.
 snapshot=prior.state->'game';
 seq=coalesce((prior.state->>'gameSequence')::integer,1);
 if snapshot is not null and snapshot<>'null'::jsonb then
  insert into public.clubhouse_games(id,room_id,sequence_number,member_ids,state,revision,ended_at)
   values ((snapshot->>'id')::uuid,p_room_id,seq,prior.member_ids,snapshot,(snapshot->>'revision')::bigint,(snapshot->>'endedAt')::timestamptz)
   on conflict(id) do update set state=excluded.state, revision=excluded.revision, ended_at=excluded.ended_at
    where public.clubhouse_games.room_id=excluded.room_id and public.clubhouse_games.sequence_number=excluded.sequence_number;
  if not found then raise exception 'Game identity belongs to another table'; end if;
 end if;
 snapshot=p_state->'game';
 seq=coalesce((p_state->>'gameSequence')::integer,1);
 if snapshot is null or snapshot='null'::jsonb then raise exception 'Missing game'; end if;
 insert into public.clubhouse_games(id,room_id,sequence_number,member_ids,state,revision,ended_at)
  values ((snapshot->>'id')::uuid,p_room_id,seq,prior.member_ids,snapshot,(snapshot->>'revision')::bigint,(snapshot->>'endedAt')::timestamptz)
  on conflict(id) do update set state=excluded.state, revision=excluded.revision, ended_at=excluded.ended_at
   where public.clubhouse_games.room_id=excluded.room_id and public.clubhouse_games.sequence_number=excluded.sequence_number;
 if not found then raise exception 'Game identity belongs to another table'; end if;
 update public.clubhouse_rooms set state=p_state,revision=(p_state->>'revision')::bigint where id=p_room_id;
 if p_command_id is not null then
  if p_fingerprint is null then raise exception 'Missing command fingerprint'; end if;
  insert into public.clubhouse_room_receipts(room_id,command_id,actor_id,fingerprint)
   values(p_room_id,p_command_id,p_actor_id,p_fingerprint);
 end if;
 return true;
end $$;
revoke all on function public.clubhouse_commit_game(uuid,bigint,jsonb,uuid,text,text) from public, anon, authenticated;
grant execute on function public.clubhouse_commit_game(uuid,bigint,jsonb,uuid,text,text) to service_role;
commit;
