-- Historical factual invalidation is not a new speech receipt.
-- Replace the canonical validator only; patch/batch RPCs still delegate to it.
-- No grants, accounting, room, lease or provider reservation checks change.
create or replace function public.clubhouse_commentary_commit(p_scope uuid,p_expected_version bigint,p_state jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v bigint;c text;k text;entry jsonb;prior jsonb;old_budget jsonb;lim public.clubhouse_commentary_limits%rowtype;room uuid;n bigint;chars bigint;lease_value jsonb;linked_job jsonb;
 allowed text[]:=array['settings','jobs','moments','leases','attempts','budgets','exposure','memoryRecords','feedback','playerProfiles','playerProfileVersions','preferenceSharing','memorySummaries','memoryCaches','localSessions'];
begin
 p_state:=jsonb_set(p_state,'{localSessions}',coalesce(p_state->'localSessions','{}'::jsonb),true);
 if jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>33554432 or p_expected_version<0 then raise exception 'Invalid bounded commentary snapshot';end if;
 foreach c in array allowed loop if jsonb_typeof(p_state->c) is distinct from 'object' then raise exception 'Explicit commentary collections required';end if;end loop;
 if exists(select 1 from jsonb_object_keys(p_state)t(key)where not key=any(allowed))then raise exception 'Unknown commentary collection';end if;
 insert into public.clubhouse_commentary_scopes(id)values(p_scope)on conflict do nothing;
 select version into v from public.clubhouse_commentary_scopes where id=p_scope for update;
 if v<>p_expected_version then return jsonb_build_object('committed',false,'version',v,'databaseNowMs',floor(extract(epoch from clock_timestamp())*1000));end if;
 for k,entry in select key,value from jsonb_each(p_state->'localSessions')loop
  if k!~'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'or entry->>'id' is distinct from k or entry->>'ownerId' is null or entry->>'ownerId'!~'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'or jsonb_typeof(entry->'game')is distinct from 'object'then raise exception 'Invalid local commentary authority';end if;
  if exists(select 1 from public.clubhouse_rooms where id=k::uuid)then raise exception 'Local commentary cannot shadow a hosted room';end if;
  select value into prior from public.clubhouse_commentary_items where scope_id=p_scope and collection='localSessions'and item_key=k;
  if prior is not null and(prior->>'ownerId' is distinct from entry->>'ownerId'or prior->'game'->>'id' is distinct from entry->'game'->>'id')then raise exception 'Local session owner/game are immutable';end if;
 end loop;
 -- Attempts, consumed budgets, accepted-event dedupe and profile tombstones cannot be erased by Forget or expiry.
 if exists(select 1 from public.clubhouse_commentary_items i where i.scope_id=p_scope and i.collection in ('attempts','budgets','moments','playerProfileVersions','leases','localSessions') and not (p_state->i.collection ? i.item_key))then raise exception 'Accounting and dedupe rows cannot be removed';end if;
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
  -- Undo/correction revokes factual validity, never actual historical exposure.
  -- Only this exact true-to-false change is independent of the old speaker lease.
  -- Identity, audience, status, sequence, timestamps, timing and expiry stay identical.
  if prior->'valid'='true'::jsonb and entry->'valid'='false'::jsonb
   and prior-'valid' is not distinct from entry-'valid' then continue;end if;
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
revoke all on function public.clubhouse_commentary_commit(uuid,bigint,jsonb)from public,anon,authenticated;
grant execute on function public.clubhouse_commentary_commit(uuid,bigint,jsonb)to service_role;
