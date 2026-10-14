-- Fresh POC commentary durability. No room function is changed by this migration.
create schema if not exists clubhouse_commentary_private;
revoke all on schema clubhouse_commentary_private from public,anon,authenticated;
create table if not exists public.clubhouse_commentary_scopes (
 id uuid primary key, version bigint not null default 0 check(version between 0 and 9007199254740990),
 updated_at timestamptz not null default clock_timestamp()
);
create table if not exists public.clubhouse_commentary_items (
 scope_id uuid not null references public.clubhouse_commentary_scopes(id), collection text not null,
 item_key text not null check(length(item_key) between 1 and 1024 and item_key not in ('__proto__','constructor','prototype')),
 value jsonb not null, created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 primary key(scope_id,collection,item_key),
 check(collection in ('settings','jobs','moments','leases','attempts','budgets','exposure','memoryRecords','feedback','playerProfiles','playerProfileVersions','preferenceSharing','memorySummaries','memoryCaches'))
);
create table if not exists public.clubhouse_commentary_limits (
 scope_id uuid not null references public.clubhouse_commentary_scopes(id), room_id uuid not null,
 max_requests bigint not null check(max_requests>=0),max_characters bigint not null check(max_characters>=0),
 expires_at timestamptz not null,primary key(scope_id,room_id)
);
create table if not exists public.clubhouse_commentary_outbox (
 scope_id uuid not null references public.clubhouse_commentary_scopes(id),idempotency_key text not null check(length(idempotency_key) between 1 and 1024),
 room_id uuid not null,game_id uuid not null,command_id text not null check(length(command_id) between 1 and 200),
 payload jsonb not null,created_at timestamptz not null default clock_timestamp(),primary key(scope_id,idempotency_key)
);
alter table public.clubhouse_commentary_scopes enable row level security;
alter table public.clubhouse_commentary_items enable row level security;
alter table public.clubhouse_commentary_limits enable row level security;
alter table public.clubhouse_commentary_outbox enable row level security;
revoke all on public.clubhouse_commentary_scopes,public.clubhouse_commentary_items,public.clubhouse_commentary_limits,public.clubhouse_commentary_outbox from public,anon,authenticated,service_role;
grant select on public.clubhouse_commentary_scopes,public.clubhouse_commentary_items,public.clubhouse_commentary_limits,public.clubhouse_commentary_outbox to service_role;

create or replace function public.clubhouse_commentary_load(p_scope uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v bigint; data jsonb;
begin
 insert into public.clubhouse_commentary_scopes(id) values(p_scope) on conflict do nothing;
 -- One lock gives a consistent version+state; network/provider work never runs here.
 select version into v from public.clubhouse_commentary_scopes where id=p_scope for share;
 select coalesce(jsonb_object_agg(collection,entries),'{}'::jsonb) into data from (
  select collection,jsonb_object_agg(item_key,value) entries from public.clubhouse_commentary_items where scope_id=p_scope group by collection
 ) collections;
 return jsonb_build_object('version',v,'state',data,'databaseNowMs',floor(extract(epoch from clock_timestamp())*1000));
end $$;

-- Backend administration only. No public app operation grants usage or resets counters.
create or replace function public.clubhouse_commentary_set_limit(p_scope uuid,p_room uuid,p_max_requests bigint,p_max_characters bigint,p_expires_at timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_max_requests<0 or p_max_characters<0 or p_expires_at<=clock_timestamp() then raise exception 'Explicit bounded unexpired commentary allowance required';end if;
 insert into public.clubhouse_commentary_scopes(id) values(p_scope) on conflict do nothing;
 perform 1 from public.clubhouse_commentary_scopes where id=p_scope for update;
 insert into public.clubhouse_commentary_limits(scope_id,room_id,max_requests,max_characters,expires_at)values(p_scope,p_room,p_max_requests,p_max_characters,p_expires_at)
 on conflict(scope_id,room_id)do update set max_requests=excluded.max_requests,max_characters=excluded.max_characters,expires_at=excluded.expires_at;
 update public.clubhouse_commentary_scopes set version=version+1,updated_at=clock_timestamp() where id=p_scope;
 return true;
end $$;

create or replace function public.clubhouse_commentary_commit(p_scope uuid,p_expected_version bigint,p_state jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v bigint;c text;k text;entry jsonb;prior jsonb;old_budget jsonb;lim public.clubhouse_commentary_limits%rowtype;room uuid;n bigint;chars bigint;lease_value jsonb;linked_job jsonb;
 allowed text[]:=array['settings','jobs','moments','leases','attempts','budgets','exposure','memoryRecords','feedback','playerProfiles','playerProfileVersions','preferenceSharing','memorySummaries','memoryCaches'];
begin
 if jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>33554432 or p_expected_version<0 then raise exception 'Invalid bounded commentary snapshot';end if;
 foreach c in array allowed loop if jsonb_typeof(p_state->c) is distinct from 'object' then raise exception 'Explicit commentary collections required';end if;end loop;
 if exists(select 1 from jsonb_object_keys(p_state)t(key)where not key=any(allowed))then raise exception 'Unknown commentary collection';end if;
 insert into public.clubhouse_commentary_scopes(id)values(p_scope)on conflict do nothing;
 select version into v from public.clubhouse_commentary_scopes where id=p_scope for update;
 if v<>p_expected_version then return jsonb_build_object('committed',false,'version',v,'databaseNowMs',floor(extract(epoch from clock_timestamp())*1000));end if;
 -- Attempts, consumed budgets, accepted-event dedupe and profile tombstones cannot be erased by Forget or expiry.
 if exists(select 1 from public.clubhouse_commentary_items i where i.scope_id=p_scope and i.collection in ('attempts','budgets','moments','playerProfileVersions','leases') and not (p_state->i.collection ? i.item_key))then raise exception 'Accounting and dedupe rows cannot be removed';end if;
 for k,entry in select key,value from jsonb_each(p_state->'budgets')loop
  if not coalesce(entry->>'requests'~'^[0-9]+$',false) or not coalesce(entry->>'characters'~'^[0-9]+$',false) then raise exception 'Invalid commentary consumption';end if;
  select value into old_budget from public.clubhouse_commentary_items where scope_id=p_scope and collection='budgets' and item_key=k;
  if (entry->>'requests')::bigint<coalesce((old_budget->>'requests')::bigint,0) or (entry->>'characters')::bigint<coalesce((old_budget->>'characters')::bigint,0)then raise exception 'Consumed commentary allowance cannot reset';end if;
  if (entry->>'requests')::bigint>coalesce((old_budget->>'requests')::bigint,0) or (entry->>'characters')::bigint>coalesce((old_budget->>'characters')::bigint,0)then
   room:=k::uuid;select * into lim from public.clubhouse_commentary_limits where scope_id=p_scope and room_id=room;
   if not found or lim.expires_at<=clock_timestamp() or (entry->>'requests')::bigint>lim.max_requests or (entry->>'characters')::bigint>lim.max_characters then raise exception 'Administered commentary allowance exhausted';end if;
  end if;
 end loop;
 for k,entry in select key,value from jsonb_each(p_state->'attempts')loop
  select value into prior from public.clubhouse_commentary_items where scope_id=p_scope and collection='attempts'and item_key=k;
  if prior is not null then
   if prior->>'jobId' is distinct from entry->>'jobId' or prior->>'stage' is distinct from entry->>'stage' or prior->>'characters' is distinct from entry->>'characters' or (prior->>'status'<>'submitted'and entry->>'status'='submitted')then raise exception 'Provider reservation cannot change or reset';end if;
  elsif entry->>'status' is distinct from 'submitted' or not coalesce(entry->>'characters'~'^[0-9]+$',false) or not coalesce(p_state->'jobs' ? (entry->>'jobId'),false)then raise exception 'Attempt must be persisted submitted before dispatch';end if;
  if prior is null and entry->>'stage'='tts'then
   linked_job:=p_state->'jobs'->(entry->>'jobId');lease_value:=p_state->'leases'->(linked_job->>'roomId');
   if lease_value is null or not coalesce(lease_value->>'expiresAt'~'^[0-9]+$',false)or(lease_value->>'expiresAt')::numeric<=floor(extract(epoch from clock_timestamp())*1000)or lease_value->>'owner'is distinct from linked_job->'claim'->>'owner'or lease_value->>'device'is distinct from linked_job->'claim'->>'device'or lease_value->>'epoch'is distinct from linked_job->'claim'->>'epoch'or lease_value->>'activeJobId'is distinct from entry->>'jobId' then raise exception 'TTS reservation requires unexpired fenced playback lease at commit';end if;
  end if;
 end loop;
  for k,entry in select key,value from jsonb_each(p_state->'playerProfileVersions')loop
  select value into prior from public.clubhouse_commentary_items where scope_id=p_scope and collection='playerProfileVersions'and item_key=k;
  if not coalesce(entry::text~'^[0-9]+$',false)or entry::text::numeric>9007199254740991 or entry::text::numeric<coalesce(prior::text::numeric,0)then raise exception 'Personal profile tombstone cannot regress';end if;
 end loop;
  for k,entry in select key,value from jsonb_each(p_state->'leases')loop
  select value into prior from public.clubhouse_commentary_items where scope_id=p_scope and collection='leases'and item_key=k;
  if prior is not distinct from entry then continue;end if;
  if not coalesce(entry->>'epoch'~'^[1-9][0-9]*$',false)or not coalesce(entry->>'expiresAt'~'^[0-9]+$',false)or not coalesce(entry->>'owner'~'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$',false)or not coalesce(length(entry->>'device')between 8 and 100,false)then raise exception 'Invalid fenced playback lease';end if;
  if (entry->>'expiresAt')::numeric<=floor(extract(epoch from clock_timestamp())*1000)or(entry->>'expiresAt')::numeric>floor(extract(epoch from clock_timestamp())*1000)+15000 then raise exception 'Lease must use current database time and bounded horizon';end if;
  if prior is null then if(entry->>'epoch')::bigint<>1 then raise exception 'Initial playback epoch must be one';end if;
  elsif(entry->>'epoch')::bigint=(prior->>'epoch')::bigint then
   if prior->>'owner'is distinct from entry->>'owner'or prior->>'device'is distinct from entry->>'device' then raise exception 'Playback owner cannot change within an epoch';end if;
   if(prior->>'expiresAt')::numeric<=floor(extract(epoch from clock_timestamp())*1000)then raise exception 'Expired playback epoch cannot renew';end if;
  elsif(entry->>'epoch')::bigint<>(prior->>'epoch')::bigint+1 or(prior->>'expiresAt')::numeric>floor(extract(epoch from clock_timestamp())*1000)then raise exception 'Playback epoch must advance only after lease expiry';end if;
 end loop;
  for k,entry in select key,value from jsonb_each(p_state->'jobs')loop
  select value into prior from public.clubhouse_commentary_items where scope_id=p_scope and collection='jobs'and item_key=k;
  if prior is not distinct from entry or not coalesce(entry->>'status'in('claimed','streaming','started'),false)then continue;end if;
  lease_value:=p_state->'leases'->(entry->>'roomId');
  if lease_value is null or not coalesce(lease_value->>'expiresAt'~'^[0-9]+$',false)or(lease_value->>'expiresAt')::numeric<=floor(extract(epoch from clock_timestamp())*1000)or lease_value->>'owner'is distinct from entry->'claim'->>'owner'or lease_value->>'device'is distinct from entry->'claim'->>'device'or lease_value->>'epoch'is distinct from entry->'claim'->>'epoch'or lease_value->>'activeJobId'is distinct from k then raise exception 'Active job requires unexpired fenced playback lease at commit';end if;
 end loop;
 for k,entry in select key,value from jsonb_each(p_state->'exposure')loop
  select value into prior from public.clubhouse_commentary_items where scope_id=p_scope and collection='exposure'and item_key=k;
  if prior is not distinct from entry or (prior is not null and prior-'expiresAt' is not distinct from entry-'expiresAt')or not coalesce(entry->>'status'in('started','completed'),false)then continue;end if;
  linked_job:=p_state->'jobs'->(entry->>'jobId');lease_value:=p_state->'leases'->(linked_job->>'roomId');
  if linked_job is null or lease_value is null or not coalesce(lease_value->>'expiresAt'~'^[0-9]+$',false)or(lease_value->>'expiresAt')::numeric<=floor(extract(epoch from clock_timestamp())*1000)or linked_job->'claim'->>'token'is distinct from k or lease_value->>'owner'is distinct from entry->>'reportingAccount'or lease_value->>'epoch'is distinct from entry->>'epoch'or lease_value->>'device'is distinct from linked_job->'claim'->>'device' then raise exception 'Speech receipt requires current fenced lease at commit';end if;
  if entry->'heardBy'is distinct from jsonb_build_array(entry->>'reportingAccount')then raise exception 'Host speech cannot infer other listener exposure';end if;
 end loop;
 -- Every new provider attempt has a matching atomic positive budget reservation.
 for room,n,chars in select (p_state->'jobs'->(a.value->>'jobId')->>'roomId')::uuid,count(*),sum((a.value->>'characters')::bigint)
  from jsonb_each(p_state->'attempts')a where not exists(select 1 from public.clubhouse_commentary_items i where i.scope_id=p_scope and i.collection='attempts'and i.item_key=a.key)
  group by (p_state->'jobs'->(a.value->>'jobId')->>'roomId')::uuid loop
  select value into old_budget from public.clubhouse_commentary_items where scope_id=p_scope and collection='budgets'and item_key=room::text;
  entry:=p_state->'budgets'->room::text;
  if entry is null or (entry->>'requests')::bigint-coalesce((old_budget->>'requests')::bigint,0)<n or (entry->>'characters')::bigint-coalesce((old_budget->>'characters')::bigint,0)<chars then raise exception 'Atomic attempt budget reservation required';end if;
 end loop;
 delete from public.clubhouse_commentary_items i where i.scope_id=p_scope and not(p_state->i.collection ? i.item_key);
 insert into public.clubhouse_commentary_items(scope_id,collection,item_key,value)
 select p_scope,col.key,item.key,item.value from jsonb_each(p_state)col cross join lateral jsonb_each(col.value)item
 on conflict(scope_id,collection,item_key)do update set value=excluded.value,updated_at=clock_timestamp() where public.clubhouse_commentary_items.value is distinct from excluded.value;
 update public.clubhouse_commentary_scopes set version=version+1,updated_at=clock_timestamp() where id=p_scope returning version into v;
 return jsonb_build_object('committed',true,'version',v,'databaseNowMs',floor(extract(epoch from clock_timestamp())*1000));
end $$;

create or replace function public.clubhouse_commentary_expire(p_scope uuid)returns jsonb
language plpgsql security definer set search_path='' as $$
declare ids text[];removed bigint;now_ms numeric:=floor(extract(epoch from clock_timestamp())*1000);
begin
 perform 1 from public.clubhouse_commentary_scopes where id=p_scope for update;
 select coalesce(array_agg(distinct key),'{}'::text[])into ids from (
  select case when collection='memoryRecords'then item_key when collection='feedback'then value->>'recordId'else value->>'jobId'end key
  from public.clubhouse_commentary_items where scope_id=p_scope and collection in ('memoryRecords','feedback','exposure') and
  ((value->>'expiresAt'~'^[0-9]+$'and (value->>'expiresAt')::numeric<=now_ms)or(updated_at<=clock_timestamp()-interval '90 days'))
 ) expired;
 delete from public.clubhouse_commentary_items where scope_id=p_scope and
  ((collection='memoryRecords'and item_key=any(ids))or(collection='feedback'and(value->>'recordId'=any(ids)or(value->>'expiresAt'~'^[0-9]+$'and(value->>'expiresAt')::numeric<=now_ms)))or(collection='exposure'and value->>'jobId'=any(ids))or(collection in ('memorySummaries','memoryCaches')and(cardinality(ids)>0 or updated_at<=clock_timestamp()-interval '90 days')));
 get diagnostics removed=row_count;
 update public.clubhouse_commentary_items set value=jsonb_set(jsonb_set(value,'{line}','null'::jsonb),'{reason}','"history-expired"'::jsonb),updated_at=clock_timestamp()where scope_id=p_scope and collection='jobs'and item_key=any(ids);
 update public.clubhouse_commentary_scopes set version=version+1,updated_at=clock_timestamp()where id=p_scope;
 return jsonb_build_object('removedItems',removed,'expiredJobs',cardinality(ids),'scoresChanged',false);
end $$;

create or replace function public.clubhouse_commentary_forget(p_scope uuid,p_account uuid)returns jsonb
language plpgsql security definer set search_path='' as $$
declare ids text[];removed bigint;
begin
 perform 1 from public.clubhouse_commentary_scopes where id=p_scope for update;
 select coalesce(array_agg(distinct item_key),'{}'::text[])into ids from public.clubhouse_commentary_items where scope_id=p_scope and
  ((collection='jobs'and value->'audience' @>jsonb_build_array(p_account::text))or(collection='memoryRecords'and(value->'audience' @>jsonb_build_array(p_account::text)or value->'line'->>'targetAccountId'=p_account::text)));
 delete from public.clubhouse_commentary_items where scope_id=p_scope and
  ((collection='memoryRecords'and item_key=any(ids))or(collection='feedback'and(value->>'accountId'=p_account::text or value->>'recordId'=any(ids)))or(collection='exposure'and(value->>'jobId'=any(ids)or value->>'reportingAccount'=p_account::text or value->'expectedAudience' @>jsonb_build_array(p_account::text)))or collection in ('memorySummaries','memoryCaches'));
 get diagnostics removed=row_count;
 update public.clubhouse_commentary_items set value=jsonb_set(jsonb_set(jsonb_set(value,'{line}','null'::jsonb),'{reason}','"history-forgotten"'::jsonb),'{status}',to_jsonb(case when value->>'status' in('claimed','streaming','started','ready','pending','generating')then 'cancelled'else value->>'status'end)),updated_at=clock_timestamp()where scope_id=p_scope and collection='jobs'and item_key=any(ids);
 update public.clubhouse_commentary_scopes set version=version+1,updated_at=clock_timestamp()where id=p_scope;
 return jsonb_build_object('removedItems',removed,'affectedJobs',cardinality(ids),'scoresChanged',false);
end $$;

-- Private owner-only hook. Future room CAS must call this inside its SAME SQL transaction.
create or replace function clubhouse_commentary_private.append_outbox(p_scope uuid,p_rows jsonb)returns integer
language plpgsql security invoker set search_path='' as $$
declare row jsonb;prior jsonb;count_added integer:=0;
begin
 if jsonb_typeof(p_rows)<>'array'or jsonb_array_length(p_rows)>10 then raise exception 'Bounded accepted outbox required';end if;
 insert into public.clubhouse_commentary_scopes(id)values(p_scope)on conflict do nothing;
 perform 1 from public.clubhouse_commentary_scopes where id=p_scope for update;
 for row in select value from jsonb_array_elements(p_rows)loop
  if not coalesce(row->>'kind'in('moment','invalidate'),false)or not coalesce(row->>'purpose'in('score','opening','return','next-game','correction'),false)or jsonb_typeof(row->'audience')is distinct from 'array'or not coalesce(length(row->>'commandId')between 1 and 200,false)or not coalesce(row->>'expectedRoomRevision'~'^[0-9]+$',false)or not coalesce(row->>'acceptedRoomRevision'~'^[0-9]+$',false)then raise exception 'Invalid accepted outbox row';end if;
  if jsonb_array_length(row->'audience')not between 1 and 8 or (row->>'acceptedRoomRevision')::bigint<>(row->>'expectedRoomRevision')::bigint+1 or exists(select 1 from jsonb_array_elements_text(row->'audience')a(value)where value!~'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$')or not(row->'audience' @>jsonb_build_array(row->>'actorId'))then raise exception 'Invalid accepted revision or audience';end if;
  if (row->>'idempotencyKey')::jsonb is distinct from jsonb_build_array(row->>'roomId',row->>'gameId',row->>'commandId',row->>'kind',row->>'purpose')then raise exception 'Outbox key must bind accepted room/game/command/kind/purpose';end if;
  perform (row->>'acceptedAt')::timestamptz;
  select payload into prior from public.clubhouse_commentary_outbox where scope_id=p_scope and idempotency_key=row->>'idempotencyKey';
  if prior is not null then if prior is distinct from row then raise exception 'Accepted outbox idempotency collision';end if;continue;end if;
  insert into public.clubhouse_commentary_outbox(scope_id,idempotency_key,room_id,game_id,command_id,payload)values(p_scope,row->>'idempotencyKey',(row->>'roomId')::uuid,(row->>'gameId')::uuid,row->>'commandId',row)on conflict do nothing;
  if found then count_added:=count_added+1;end if;
 end loop;return count_added;
end $$;
revoke all on function clubhouse_commentary_private.append_outbox(uuid,jsonb) from public,anon,authenticated,service_role;

revoke all on function public.clubhouse_commentary_load(uuid),public.clubhouse_commentary_commit(uuid,bigint,jsonb),public.clubhouse_commentary_set_limit(uuid,uuid,bigint,bigint,timestamptz),public.clubhouse_commentary_expire(uuid),public.clubhouse_commentary_forget(uuid,uuid) from public,anon,authenticated;
grant execute on function public.clubhouse_commentary_load(uuid),public.clubhouse_commentary_commit(uuid,bigint,jsonb),public.clubhouse_commentary_set_limit(uuid,uuid,bigint,bigint,timestamptz),public.clubhouse_commentary_expire(uuid),public.clubhouse_commentary_forget(uuid,uuid) to service_role;

