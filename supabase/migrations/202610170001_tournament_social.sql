-- Additive only: existing clubhouse_rooms/member_ids/state are NOT backfilled or reset.
create table if not exists public.clubhouse_invitations(
 id uuid primary key, room_id uuid not null references public.clubhouse_rooms(id) on delete cascade,
 sender_id uuid not null references auth.users(id), recipient_email text not null,
 status text not null default 'pending' check(status in('pending','accepted','declined','revoked')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days',
 accepted_by uuid references auth.users(id), unique(room_id,recipient_email)
);
create table if not exists public.clubhouse_play_requests(
 id uuid primary key, room_id uuid not null references public.clubhouse_rooms(id) on delete cascade,
 sender_id uuid not null references auth.users(id), recipient_id uuid not null references auth.users(id),
 game_id text, game_sequence integer not null, status text not null default 'pending' check(status in('pending','ready','declined','cancelled')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '10 minutes',
 check(sender_id<>recipient_id)
);
create table if not exists public.clubhouse_social_devices(
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 platform text not null check(platform in('ios','android')), token text not null,
 active boolean not null default true, updated_at timestamptz not null default now(), unique(platform,token)
);
create table if not exists public.clubhouse_social_push_outbox(
 id uuid primary key default gen_random_uuid(), event_id uuid not null, kind text not null check(kind in('invite','play','ready')),
 room_id uuid not null references public.clubhouse_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id), device_id uuid not null references public.clubhouse_social_devices(id) on delete cascade,
 title text not null, body text not null, expires_at timestamptz not null,
 status text not null default 'queued' check(status in('queued','sending','sent','failed','cancelled')),
 attempts integer not null default 0, lease_id uuid, lease_until timestamptz, available_at timestamptz not null default now(),
 created_at timestamptz not null default now(), unique(event_id,kind,device_id)
);
create index if not exists clubhouse_invitation_recipient on public.clubhouse_invitations(recipient_email,created_at desc);
create index if not exists clubhouse_play_recipient on public.clubhouse_play_requests(recipient_id,created_at desc);
create index if not exists clubhouse_social_push_due on public.clubhouse_social_push_outbox(status,available_at);
alter table public.clubhouse_invitations enable row level security;
alter table public.clubhouse_play_requests enable row level security;
alter table public.clubhouse_social_devices enable row level security;
alter table public.clubhouse_social_push_outbox enable row level security;
revoke all on public.clubhouse_invitations,public.clubhouse_play_requests,public.clubhouse_social_devices,public.clubhouse_social_push_outbox from anon,authenticated;
grant select on public.clubhouse_invitations,public.clubhouse_play_requests to authenticated;
grant all on public.clubhouse_invitations,public.clubhouse_play_requests,public.clubhouse_social_devices,public.clubhouse_social_push_outbox to service_role;

create or replace function public.clubhouse_social_email() returns text language sql stable security definer set search_path='' as $$
 select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null and coalesce(is_anonymous,false)=false
$$;
revoke all on function public.clubhouse_social_email() from public,anon;
grant execute on function public.clubhouse_social_email() to authenticated;
drop policy if exists "Own tournament invitations" on public.clubhouse_invitations;
create policy "Own tournament invitations" on public.clubhouse_invitations for select to authenticated
 using(sender_id=(select auth.uid()) or recipient_email=(select public.clubhouse_social_email()));
drop policy if exists "Own play requests" on public.clubhouse_play_requests;
create policy "Own play requests" on public.clubhouse_play_requests for select to authenticated
 using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));

-- Only trusted server code queues/delivers pushes. A queue row is never proof of receipt.
create or replace function public.clubhouse_queue_social_push(p_event uuid,p_kind text,p_room uuid,p_user uuid,p_title text,p_body text,p_expiry timestamptz)
 returns void language sql security definer set search_path='' as $$
 insert into public.clubhouse_social_push_outbox(event_id,kind,room_id,user_id,device_id,title,body,expires_at)
 select p_event,p_kind,p_room,p_user,id,p_title,p_body,p_expiry from public.clubhouse_social_devices where user_id=p_user and active
 on conflict(event_id,kind,device_id) do nothing
$$;
revoke all on function public.clubhouse_queue_social_push(uuid,text,uuid,uuid,text,text,timestamptz) from public,anon,authenticated;

create or replace function public.clubhouse_social(p_action text,p_payload jsonb default '{}'::jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); email text; r public.clubhouse_rooms%rowtype; i public.clubhouse_invitations%rowtype;
 q public.clubhouse_play_requests%rowtype; target uuid; target_email text; actor_name text; player_name text;
 new_members jsonb; new_state jsonb; event_id uuid; result jsonb; existing record;
begin
 email:=public.clubhouse_social_email();
 if actor is null or email is null then raise exception 'Sign in with a verified game account.' using errcode='42501'; end if;
 if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then raise exception 'Invalid request.'; end if;
 if p_action<>'inbox' then perform pg_advisory_xact_lock(hashtextextended('clubhouse-social:'||actor::text,0)); end if;
 if p_action='inbox' then
  select jsonb_build_object(
   'invitations',coalesce((select jsonb_agg(x) from (select a.id,a.room_id,a.sender_id,a.recipient_email,a.status,a.expires_at,
     a.sender_id=actor as sent, b.code,b.state->'tournament'->>'name' as tournament_name,
     (b.state->'tournament'->>'gameCount')::int as game_count,
     (select m->>'name' from jsonb_array_elements(b.state->'members') m where m->>'userId'=a.sender_id::text) as sender_name,
     (b.state->>'status'='lobby' and (b.state->>'joinExpiresAt')::timestamptz>now() and a.expires_at>now()) as actionable
     from public.clubhouse_invitations a join public.clubhouse_rooms b on b.id=a.room_id
     where a.sender_id=actor or a.recipient_email=email order by a.created_at desc limit 100) x),'[]'::jsonb),
   'requests',coalesce((select jsonb_agg(x) from (select a.id,a.room_id,a.sender_id,a.recipient_id,a.status,a.expires_at,a.game_id,a.game_sequence,
     a.sender_id=actor as sent,b.code,b.state->'tournament'->>'name' as tournament_name,
     (select m->>'name' from jsonb_array_elements(b.state->'members') m where m->>'userId'=a.sender_id::text) as sender_name,
     (select m->>'name' from jsonb_array_elements(b.state->'members') m where m->>'userId'=a.recipient_id::text) as recipient_name,
     (a.expires_at>now() and actor=any(b.member_ids) and a.game_id is not distinct from b.state->'game'->>'id' and a.game_sequence=coalesce((b.state->>'gameSequence')::int,1) and coalesce(b.state->'tournament'->>'status','')<>'completed') as actionable
     from public.clubhouse_play_requests a join public.clubhouse_rooms b on b.id=a.room_id
     where a.sender_id=actor or a.recipient_id=actor order by a.created_at desc limit 100) x),'[]'::jsonb)) into result;
  return result;
 end if;
 if p_action='device-register' then
  if p_payload->>'platform' not in('ios','android') or length(p_payload->>'token') not between 16 and 4096 then raise exception 'Invalid notification registration.'; end if;
  event_id:=(p_payload->>'id')::uuid;
  delete from public.clubhouse_social_devices where platform=p_payload->>'platform' and token=p_payload->>'token' and id<>event_id;
  insert into public.clubhouse_social_devices(id,user_id,platform,token) values(event_id,actor,p_payload->>'platform',p_payload->>'token')
   on conflict(id) do update set user_id=actor,platform=excluded.platform,token=excluded.token,active=true,updated_at=now();
  return jsonb_build_object('ok',true);
 end if;
 if p_action='device-remove' then
  update public.clubhouse_social_devices set active=false,updated_at=now() where id=(p_payload->>'id')::uuid and user_id=actor;
  update public.clubhouse_social_push_outbox set status='cancelled',lease_id=null,lease_until=null where device_id=(p_payload->>'id')::uuid and user_id=actor and status in('queued','sending');
  return jsonb_build_object('ok',true);
 end if;
 -- Lock room FIRST consistently, so accept/start/score cannot interleave roster changes.
 if p_action in('invite-accept','invite-decline','invite-revoke') then
  select * into i from public.clubhouse_invitations where id=(p_payload->>'id')::uuid;
  if not found or (i.recipient_email<>email and i.sender_id<>actor) then raise exception 'Invitation not available.' using errcode='42501'; end if;
  select * into r from public.clubhouse_rooms where id=i.room_id for update;
  select * into i from public.clubhouse_invitations where id=i.id for update;
 elsif p_action in('play-ready','play-decline','play-cancel') then
  select * into q from public.clubhouse_play_requests where id=(p_payload->>'id')::uuid;
  if not found or actor not in(q.sender_id,q.recipient_id) then raise exception 'Play request not available.' using errcode='42501'; end if;
  select * into r from public.clubhouse_rooms where id=q.room_id for update;
  select * into q from public.clubhouse_play_requests where id=q.id for update;
 else
  select * into r from public.clubhouse_rooms where code=upper(p_payload->>'code') for update;
 end if;
 if r.id is null or r.state->'tournament' is null then raise exception 'Tournament not available.' using errcode='42501'; end if;
 actor_name:=(select m->>'name' from jsonb_array_elements(r.state->'members') m where m->>'userId'=actor::text);
 if p_action='invite-create' then
  if r.host_id<>actor or r.state->>'status'<>'lobby' then raise exception 'Only the organiser can invite new players before starting.' using errcode='42501'; end if;
  if (r.state->>'joinExpiresAt')::timestamptz<=now() then raise exception 'This lobby invitation has expired.'; end if;
  target_email:=lower(trim(p_payload->>'email'));
  if target_email is null or length(target_email)>254 or target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or target_email=email then raise exception 'Enter another player''s email address.'; end if;
  select * into i from public.clubhouse_invitations where room_id=r.id and recipient_email=target_email;
  if found then return jsonb_build_object('ok',true); end if;
  if (select count(*) from public.clubhouse_invitations where sender_id=actor and created_at>now()-interval '1 hour')>=20 then raise exception 'Invitation limit reached. Try later.'; end if;
  event_id:=(p_payload->>'id')::uuid;
  insert into public.clubhouse_invitations(id,room_id,sender_id,recipient_email) values(event_id,r.id,actor,target_email);
  select id into target from auth.users where lower(auth.users.email)=target_email and email_confirmed_at is not null and coalesce(is_anonymous,false)=false limit 1;
  if target is not null then perform public.clubhouse_queue_social_push(event_id,'invite',r.id,target,'Tournament invitation',actor_name||' invited you to a tournament. Open to review.',least(now()+interval '7 days',(r.state->>'joinExpiresAt')::timestamptz)); end if;
  return jsonb_build_object('ok',true);
 elsif p_action='invite-accept' then
  if i.recipient_email<>email then raise exception 'Sign in to the invited account.' using errcode='42501'; end if;
  if actor=any(r.member_ids) then return jsonb_build_object('ok',true,'code',r.code); end if;
  if i.status<>'pending' or i.expires_at<=now() or r.state->>'status'<>'lobby' or (r.state->>'joinExpiresAt')::timestamptz<=now() then raise exception 'This invitation is no longer open.'; end if;
  if cardinality(r.member_ids)>=least(8,(r.state->'tournament'->>'playerCount')::int) then raise exception 'This tournament is full.'; end if;
  player_name:=trim(p_payload->>'name');
  if player_name is null or length(player_name) not between 1 and 24 or player_name ~ '[[:cntrl:]]' then raise exception 'Use a player name of 1–24 characters.'; end if;
  if exists(select 1 from jsonb_array_elements(r.state->'members') m where lower(m->>'name')=lower(player_name)) then raise exception 'That player name is already taken.'; end if;
  new_members:=(r.state->'members')||jsonb_build_array(jsonb_build_object('userId',actor,'name',player_name));
  new_state:=jsonb_set(jsonb_set(r.state,'{members}',new_members),'{revision}',to_jsonb(r.revision+1));
  update public.clubhouse_rooms set member_ids=array_append(member_ids,actor),state=new_state,revision=revision+1 where id=r.id;
  update public.clubhouse_invitations set status='accepted',accepted_by=actor where id=i.id;
  return jsonb_build_object('ok',true,'code',r.code);
 elsif p_action in('invite-decline','invite-revoke') then
  if p_action='invite-decline' and i.recipient_email<>email or p_action='invite-revoke' and i.sender_id<>actor then raise exception 'Invitation not available.' using errcode='42501'; end if;
  update public.clubhouse_invitations set status=case when p_action='invite-decline' then 'declined' else 'revoked' end where id=i.id and status='pending';
  return jsonb_build_object('ok',true);
 end if;
 if not actor=any(r.member_ids) then raise exception 'You are not a member of this tournament.' using errcode='42501'; end if;
 if p_action='play-create' then
  target:=(p_payload->>'recipientId')::uuid; event_id:=(p_payload->>'id')::uuid;
  if target is null or target=actor or not target=any(r.member_ids) then raise exception 'Choose another tournament member.'; end if;
  if coalesce(r.state->'tournament'->>'status','')='completed' then raise exception 'This tournament is complete.'; end if;
  if p_payload->>'gameId' is distinct from r.state->'game'->>'id' then raise exception 'The game changed. Reopen this tournament.'; end if;
  select * into q from public.clubhouse_play_requests where id=event_id;
  if found then
   if q.sender_id<>actor or q.recipient_id<>target or q.room_id<>r.id or q.game_id is distinct from p_payload->>'gameId' then raise exception 'Request ID already used.'; end if;
   return jsonb_build_object('ok',true,'id',q.id);
  end if;
  if exists(select 1 from public.clubhouse_play_requests where sender_id=actor and recipient_id=target and created_at>now()-interval '60 seconds') or (select count(*) from public.clubhouse_play_requests where sender_id=actor and created_at>now()-interval '1 hour')>=20 then raise exception 'Request already sent. Give them a moment.'; end if;
  insert into public.clubhouse_play_requests(id,room_id,sender_id,recipient_id,game_id,game_sequence) values(event_id,r.id,actor,target,r.state->'game'->>'id',coalesce((r.state->>'gameSequence')::int,1));
  perform public.clubhouse_queue_social_push(event_id,'play',r.id,target,'Ready to play?',actor_name||' is ready. Open your tournament to respond.',now()+interval '10 minutes');
  return jsonb_build_object('ok',true,'id',event_id);
 elsif p_action in('play-ready','play-decline','play-cancel') then
  if p_action='play-cancel' and actor<>q.sender_id or p_action<>'play-cancel' and actor<>q.recipient_id then raise exception 'This request belongs to another player.' using errcode='42501'; end if;
  if q.expires_at<=now() or q.game_id is distinct from r.state->'game'->>'id' or q.game_sequence<>coalesce((r.state->>'gameSequence')::int,1) or coalesce(r.state->'tournament'->>'status','')='completed' then raise exception 'This play request has expired. Open the current tournament.'; end if;
  if q.status='pending' then
   update public.clubhouse_play_requests set status=case p_action when 'play-ready' then 'ready' when 'play-decline' then 'declined' else 'cancelled' end where id=q.id;
   if p_action='play-ready' then perform public.clubhouse_queue_social_push(q.id,'ready',r.id,q.sender_id,'Player ready',actor_name||' is ready to play. Open your tournament.',q.expires_at); end if;
  elsif q.status<>(case p_action when 'play-ready' then 'ready' when 'play-decline' then 'declined' else 'cancelled' end) then
   raise exception 'This play request was already answered or cancelled. Refresh your invitations.';
  end if;
  return jsonb_build_object('ok',true,'code',r.code);
 end if;
 raise exception 'Unknown tournament request.';
end $$;
revoke all on function public.clubhouse_social(text,jsonb) from public,anon;
grant execute on function public.clubhouse_social(text,jsonb) to authenticated;

create or replace function public.clubhouse_claim_social_push(p_lease uuid,p_limit int default 10)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 update public.clubhouse_social_push_outbox set status='failed' where status='sending' and attempts>=5 and lease_until<now();
 update public.clubhouse_social_push_outbox o set status='cancelled' where status in('queued','sending') and
  (expires_at<=now() or not exists(select 1 from public.clubhouse_social_devices d where d.id=o.device_id and d.user_id=o.user_id and d.active));
 -- Cancel stale, revoked or answered events before taking a lease.
 update public.clubhouse_social_push_outbox o set status='cancelled' where status in('queued','sending') and
  not exists(select 1 from public.clubhouse_rooms r where r.id=o.room_id and
   (o.kind='invite' and exists(select 1 from public.clubhouse_invitations i join auth.users u on lower(u.email)=i.recipient_email where i.id=o.event_id and u.id=o.user_id and u.email_confirmed_at is not null and i.status='pending' and r.state->>'status'='lobby')
    or o.kind in('play','ready') and o.user_id=any(r.member_ids) and coalesce(r.state->'tournament'->>'status','')<>'completed' and exists(select 1 from public.clubhouse_play_requests q where q.id=o.event_id and q.game_id is not distinct from r.state->'game'->>'id' and q.game_sequence=coalesce((r.state->>'gameSequence')::int,1) and q.status=case o.kind when 'play' then 'pending' else 'ready' end)));
 with due as(select o.id from public.clubhouse_social_push_outbox o where o.status in('queued','sending') and o.available_at<=now() and (o.lease_until is null or o.lease_until<now()) and o.attempts<5 order by o.created_at limit greatest(1,least(p_limit,20)) for update skip locked),
 leased as(update public.clubhouse_social_push_outbox o set status='sending',lease_id=p_lease,lease_until=now()+interval '60 seconds',attempts=attempts+1 from due where o.id=due.id returning o.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'lease',p_lease,'platform',d.platform,'token',d.token,'title',o.title,'body',o.body,'expiresAt',o.expires_at,'data',jsonb_build_object('code',r.code,'eventId',o.event_id,'kind',o.kind))),'[]'::jsonb) into result from leased o join public.clubhouse_social_devices d on d.id=o.device_id join public.clubhouse_rooms r on r.id=o.room_id;
 return result;
end $$;
create or replace function public.clubhouse_finish_social_push(p_id uuid,p_lease uuid,p_outcome text,p_invalid boolean default false)
 returns boolean language plpgsql security definer set search_path='' as $$
declare device uuid;
begin
 if p_outcome not in('sent','retry','failed') then raise exception 'Invalid push outcome.'; end if;
 update public.clubhouse_social_push_outbox set status=case when p_outcome='retry' and attempts<5 then 'queued' when p_outcome='sent' then 'sent' else 'failed' end,
  available_at=now()+interval '30 seconds',lease_id=null,lease_until=null
  where id=p_id and lease_id=p_lease and status='sending' and lease_until>now() returning device_id into device;
 if device is null then return false; end if;
 if p_invalid then update public.clubhouse_social_devices set active=false where id=device; end if;
 return true;
end $$;
revoke all on function public.clubhouse_claim_social_push(uuid,int),public.clubhouse_finish_social_push(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.clubhouse_claim_social_push(uuid,int),public.clubhouse_finish_social_push(uuid,uuid,text,boolean) to service_role;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='clubhouse_invitations') then alter publication supabase_realtime add table public.clubhouse_invitations; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='clubhouse_play_requests') then alter publication supabase_realtime add table public.clubhouse_play_requests; end if;
end $$;
