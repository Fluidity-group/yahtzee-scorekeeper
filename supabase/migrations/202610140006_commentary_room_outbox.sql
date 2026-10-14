-- Atomic room/history/receipt/outbox preparation. Backend only; no provider I/O.
begin;
alter table public.clubhouse_commentary_outbox add column if not exists processed_at timestamptz;
alter table public.clubhouse_commentary_outbox add column if not exists processing_status text;
alter table public.clubhouse_commentary_outbox add column if not exists job_id text;
create index if not exists clubhouse_commentary_outbox_pending on public.clubhouse_commentary_outbox(scope_id,room_id,created_at)where processed_at is null;
create or replace function public.clubhouse_commentary_atomic_available()returns boolean language sql stable security invoker set search_path=''as $$select true$$;
create or replace function public.clubhouse_commit_game_commentary(p_room_id uuid,p_expected_revision bigint,p_state jsonb,p_actor_id uuid,p_command_id text,p_fingerprint text,p_scope uuid,p_outbox jsonb)returns boolean
language plpgsql security definer set search_path='' as $$
declare prior public.clubhouse_rooms%rowtype;row jsonb;envelope jsonb;rows jsonb:='[]';next_state jsonb:=p_state;audience jsonb;receipt jsonb;prior_game jsonb;marker jsonb;committed boolean;
begin
 if p_scope<>'d1ce0000-0000-4000-8000-000000000026'::uuid then raise exception 'Unsupported commentary scope';end if;
 if p_command_id is null or p_command_id!~'^[A-Za-z0-9_-]{8,100}$'or p_fingerprint is null or length(p_fingerprint)>16384 then raise exception 'Durable accepted command required';end if;
 if jsonb_typeof(p_outbox)is distinct from 'array'or jsonb_array_length(p_outbox)>10 then raise exception 'Bounded accepted outbox required';end if;
 select * into prior from public.clubhouse_rooms where id=p_room_id for update;
 if not found or not(p_actor_id=any(prior.member_ids))then raise exception 'Invalid room member';end if;
 select jsonb_build_object('room_id',room_id,'command_id',command_id,'actor_id',actor_id,'fingerprint',fingerprint)into receipt from public.clubhouse_room_receipts where room_id=p_room_id and command_id=p_command_id;
 if receipt is not null then if receipt->>'actor_id'<>p_actor_id::text or receipt->>'fingerprint'<>p_fingerprint then raise exception 'Command collision';end if;return false;end if;
 if prior.revision<>p_expected_revision then return false;end if;
 audience:=to_jsonb(prior.member_ids);
 for row in select value from jsonb_array_elements(p_outbox)loop
  if row->>'roomId'is distinct from p_room_id::text or row->>'gameId'is distinct from p_state->'game'->>'id'or row->>'commandId'is distinct from p_command_id or row->>'actorId'is distinct from p_actor_id::text or row->'audience'is distinct from audience or(row->>'expectedRoomRevision')::bigint is distinct from prior.revision or(row->>'acceptedRoomRevision')::bigint is distinct from prior.revision+1 then raise exception 'Outbox must bind actual locked acceptance';end if;
  if row->>'purpose'='opening'then
   if prior.state->>'status'is distinct from 'lobby'or coalesce(prior.state->'game','null'::jsonb)<>'null'::jsonb or prior.host_id<>p_actor_id or p_state->>'status'is distinct from 'active'then raise exception 'Invalid opening transition';end if;
  elsif row->>'purpose'='return'then
   if prior.state->'tournament'->>'status'is distinct from 'paused'or p_state->'tournament'->>'status'is distinct from 'playing'or prior.state->'game'->>'id'is distinct from p_state->'game'->>'id'or prior.host_id<>p_actor_id then raise exception 'Invalid return transition';end if;
  elsif row->>'purpose'='next-game'then
   if prior.state->'game'->>'status'is distinct from 'finished'or prior.state->'game'->>'id'=p_state->'game'->>'id'or p_state->'game'->>'status'is distinct from 'active'or coalesce((p_state->>'gameSequence')::integer,1)<>coalesce((prior.state->>'gameSequence')::integer,1)+1 then raise exception 'Invalid next game transition';end if;
   prior_game:=jsonb_build_object('authorized',true,'game',prior.state->'game','accountIds',audience);
  elsif row->>'purpose'in('score','correction')then
   if prior.state->'game'->>'id'is distinct from p_state->'game'->>'id'or not exists(select 1 from jsonb_array_elements(p_state->'game'->'events')e where e->>'commandId'=p_command_id)then raise exception 'Missing accepted command events';end if;
  else raise exception 'Unsupported accepted purpose';end if;
  if row->>'purpose'in('opening','return','next-game')then
   if marker is not null then raise exception 'Only one lifecycle moment per acceptance';end if;
   marker:=jsonb_build_object('commandId',p_command_id,'purpose',row->>'purpose','acceptedRoomRevision',prior.revision+1,'gameId',p_state->'game'->>'id');
  end if;
 end loop;
 -- Caller cannot invent a lifecycle marker outside its accepted outbox row.
 next_state:=case when marker is not null then jsonb_set(p_state,'{commentaryLifecycle}',marker)when prior.state ? 'commentaryLifecycle'then jsonb_set(p_state,'{commentaryLifecycle}',prior.state->'commentaryLifecycle')else p_state-'commentaryLifecycle'end;
 committed:=public.clubhouse_commit_game(p_room_id,p_expected_revision,next_state,p_actor_id,p_command_id,p_fingerprint);
 if not committed then return false;end if;
 select jsonb_build_object('room_id',room_id,'command_id',command_id,'actor_id',actor_id,'fingerprint',fingerprint)into receipt from public.clubhouse_room_receipts where room_id=p_room_id and command_id=p_command_id;
 for row in select value from jsonb_array_elements(p_outbox)loop
  envelope:=row||jsonb_build_object('moment',row,'beforeRoom',prior.state,'acceptedRoom',next_state,'receipt',receipt);
  if row->>'purpose'='next-game'then envelope:=envelope||jsonb_build_object('priorGame',prior_game);end if;
  rows:=rows||jsonb_build_array(envelope);
 end loop;
 perform clubhouse_commentary_private.append_outbox(p_scope,rows);
 return true;
end$$;
create or replace function public.clubhouse_commentary_ack_outbox(p_scope uuid,p_idempotency_key text,p_status text,p_job_id text default null)returns boolean
language plpgsql security definer set search_path=''as $$
declare entry public.clubhouse_commentary_outbox%rowtype;job jsonb;
begin
 if not coalesce(p_status in('enqueued','invalidated','retry'),false)then raise exception 'Invalid acknowledgement';end if;
 select * into entry from public.clubhouse_commentary_outbox where scope_id=p_scope and idempotency_key=p_idempotency_key for update;
 if not found then return false;end if;
 if entry.processed_at is not null then return entry.processing_status=p_status and entry.job_id is not distinct from p_job_id;end if;
 if p_status='enqueued'then
  select value into job from public.clubhouse_commentary_items where scope_id=p_scope and collection='jobs'and item_key=p_job_id;
  if job is null or job->>'roomId'is distinct from entry.room_id::text or job->'facts'->>'gameId'is distinct from entry.game_id::text or job->'facts'->>'commandId'is distinct from entry.command_id then raise exception 'Acknowledgement requires durable matching job';end if;
 elsif p_status='invalidated'and entry.payload->>'kind'<>'invalidate'then raise exception 'Moment cannot be acknowledged as invalidation';end if;
 update public.clubhouse_commentary_outbox set processing_status=p_status,job_id=p_job_id,processed_at=case when p_status='retry'then null else clock_timestamp()end where scope_id=p_scope and idempotency_key=p_idempotency_key;
 return true;
end$$;
revoke all on function public.clubhouse_commentary_atomic_available(),public.clubhouse_commit_game_commentary(uuid,bigint,jsonb,uuid,text,text,uuid,jsonb),public.clubhouse_commentary_ack_outbox(uuid,text,text,text)from public,anon,authenticated;
grant execute on function public.clubhouse_commentary_atomic_available(),public.clubhouse_commit_game_commentary(uuid,bigint,jsonb,uuid,text,text,uuid,jsonb),public.clubhouse_commentary_ack_outbox(uuid,text,text,text)to service_role;
commit;
