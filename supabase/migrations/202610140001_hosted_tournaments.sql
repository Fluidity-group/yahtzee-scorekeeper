-- Bounded tournament metadata stays with the room's atomic game/history commit.
-- This trigger also prevents older room-only writers bypassing the contract.
begin;
create or replace function public.clubhouse_validate_tournament() returns trigger
 language plpgsql security invoker set search_path = '' as $$
declare
 tournament jsonb = new.state->'tournament';
 previous jsonb;
 game jsonb = new.state->'game';
 previous_game jsonb;
 sequence integer = coalesce((new.state->>'gameSequence')::integer,1);
 previous_sequence integer;
 games integer;
 players integer;
 frozen boolean = false;
begin
 if tg_op='UPDATE' then
  previous=old.state->'tournament'; previous_game=old.state->'game';
  previous_sequence=coalesce((old.state->>'gameSequence')::integer,1);
  frozen=previous_game is not null and previous_game<>'null'::jsonb;
 end if;
 if tournament is null or tournament='null'::jsonb then
  if previous is not null and previous<>'null'::jsonb then raise exception 'Tournament cannot be removed'; end if;
  return new; -- existing standalone rooms keep their original contract
 end if;
 if jsonb_typeof(tournament)<>'object'
  or jsonb_typeof(tournament->'name') is distinct from 'string'
  or length(btrim(tournament->>'name')) not between 1 and 60
  or jsonb_typeof(tournament->'gameCount') is distinct from 'number'
  or (tournament->>'gameCount') !~ '^[0-9]+$'
  or jsonb_typeof(tournament->'playerCount') is distinct from 'number'
  or (tournament->>'playerCount') !~ '^[0-9]+$'
  or (tournament->>'status') is null
  or (tournament->>'status') not in ('playing','paused','completed') then raise exception 'Invalid tournament metadata'; end if;
 games=(tournament->>'gameCount')::integer;
 players=(tournament->>'playerCount')::integer;
 if games not between 2 and 20 or players not between 2 and 8
  or cardinality(new.member_ids)>players or new.state->>'source' is distinct from 'manual' then raise exception 'Invalid tournament limits'; end if;
 if previous->'rules' is not null and previous->'rules'<>'null'::jsonb then
  if tournament->'rules' is distinct from previous->'rules'
   or new.state->'mode' is distinct from old.state->'mode'
   or new.state->'source' is distinct from old.state->'source' then raise exception 'Tournament rules are frozen'; end if;
 end if;
 if frozen then
  if previous is null or previous='null'::jsonb then raise exception 'Cannot convert a started room into a tournament'; end if;
  if tournament->'name' is distinct from previous->'name'
   or tournament->'gameCount' is distinct from previous->'gameCount'
   or tournament->'playerCount' is distinct from previous->'playerCount'
   or tournament->'rules' is distinct from previous->'rules'
   or new.state->'mode' is distinct from old.state->'mode'
   or new.state->'source' is distinct from old.state->'source'
   or new.member_ids is distinct from old.member_ids then raise exception 'Started tournament contract is frozen'; end if;
  if previous->>'status'='paused' and game is distinct from previous_game then raise exception 'Resume tournament before changing game'; end if;
 end if;
 if game is null or game='null'::jsonb then
  if frozen or tournament->>'status'<>'playing' then raise exception 'Invalid tournament lobby'; end if;
  return new;
 end if;
 if cardinality(new.member_ids)<>players or sequence not between 1 and games
  or jsonb_typeof(tournament->'rules') is distinct from 'object'
  or game->'rules' is distinct from tournament->'rules'
  or game->'mode' is distinct from new.state->'mode' then raise exception 'Invalid tournament game contract'; end if;
 if array(select (value->>'id')::uuid from jsonb_array_elements(game->'players')) is distinct from new.member_ids then raise exception 'Tournament game roster must match accounts'; end if;
 if frozen then
  if game->>'id' is distinct from previous_game->>'id' then
   if sequence<>previous_sequence+1 or previous_game->>'status'<>'finished'
    or previous->>'status'<>'playing' then raise exception 'Invalid tournament successor'; end if;
  elsif sequence<>previous_sequence then raise exception 'Game identity cannot change sequence'; end if;
 elsif sequence<>1 then raise exception 'Tournament must start at game one'; end if;
 if sequence=games and game->>'status'='finished' then
  if tournament->>'status'<>'completed' then raise exception 'Final tournament game must complete tournament'; end if;
 elsif tournament->>'status'='completed' then raise exception 'Tournament games remain'; end if;
 return new;
end $$;
revoke all on function public.clubhouse_validate_tournament() from public, anon, authenticated;
grant execute on function public.clubhouse_validate_tournament() to service_role;
drop trigger if exists clubhouse_tournament_contract on public.clubhouse_rooms;
create trigger clubhouse_tournament_contract before insert or update on public.clubhouse_rooms
 for each row execute function public.clubhouse_validate_tournament();

create or replace function public.clubhouse_tournaments_available() returns boolean
 language sql stable security invoker set search_path = '' as $$ select true $$;
revoke all on function public.clubhouse_tournaments_available() from public, anon, authenticated;
grant execute on function public.clubhouse_tournaments_available() to service_role;
commit;
