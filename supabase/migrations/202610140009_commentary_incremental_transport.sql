-- Same service-only authority and canonical commit validation; smaller network payloads.
create or replace function public.clubhouse_commentary_load_changed(p_scope uuid,p_known_version bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v bigint;data jsonb;
begin
 insert into public.clubhouse_commentary_scopes(id) values(p_scope) on conflict do nothing;
 select version into v from public.clubhouse_commentary_scopes where id=p_scope for share;
 if p_known_version is not null and p_known_version=v then
  return jsonb_build_object('version',v,'notModified',true,'databaseNowMs',floor(extract(epoch from clock_timestamp())*1000));
 end if;
 select coalesce(jsonb_object_agg(collection,entries),'{}'::jsonb) into data from (
  select collection,jsonb_object_agg(item_key,value) entries from public.clubhouse_commentary_items where scope_id=p_scope group by collection
 ) collections;
 return jsonb_build_object('version',v,'state',data,'databaseNowMs',floor(extract(epoch from clock_timestamp())*1000));
end $$;

create or replace function public.clubhouse_commentary_patch(p_scope uuid,p_expected_version bigint,p_changes jsonb,p_deleted jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v bigint;state jsonb;c text;k text;entry jsonb;
 allowed text[]:=array['settings','jobs','moments','leases','attempts','budgets','exposure','memoryRecords','feedback','playerProfiles','playerProfileVersions','preferenceSharing','memorySummaries','memoryCaches','localSessions'];
begin
 if p_expected_version is null or p_expected_version<0 or jsonb_typeof(p_changes) is distinct from 'object' or jsonb_typeof(p_deleted) is distinct from 'object' or octet_length(p_changes::text)+octet_length(p_deleted::text)>33554432 then raise exception 'Invalid bounded commentary patch';end if;
 if exists(select 1 from jsonb_object_keys(p_changes)t(key)where not key=any(allowed))or exists(select 1 from jsonb_object_keys(p_deleted)t(key)where not key=any(allowed))then raise exception 'Unknown commentary collection';end if;
 insert into public.clubhouse_commentary_scopes(id)values(p_scope)on conflict do nothing;
 -- Lock exclusively BEFORE reconstructing: concurrent patch callers cannot both
 -- take a shared lock and deadlock while upgrading to the canonical commit lock.
 select version into v from public.clubhouse_commentary_scopes where id=p_scope for update;
 if v<>p_expected_version then return jsonb_build_object('committed',false,'version',v,'databaseNowMs',floor(extract(epoch from clock_timestamp())*1000));end if;
 state:=public.clubhouse_commentary_load(p_scope)->'state';
 foreach c in array allowed loop
  state:=jsonb_set(state,array[c],coalesce(state->c,'{}'::jsonb),true);
  if p_changes ? c then
   if jsonb_typeof(p_changes->c)is distinct from 'object'then raise exception 'Patch values must be objects';end if;
   state:=jsonb_set(state,array[c],(state->c)||(p_changes->c));
  end if;
  if p_deleted ? c then
   if jsonb_typeof(p_deleted->c)is distinct from 'array'then raise exception 'Patch deletions must be arrays';end if;
   for entry in select value from jsonb_array_elements(p_deleted->c)loop
    if jsonb_typeof(entry)is distinct from 'string'then raise exception 'Patch deletion key must be text';end if;
    k:=entry#>>'{}';state:=jsonb_set(state,array[c],(state->c)-k);
   end loop;
  end if;
 end loop;
 -- Reuse every canonical budget, immutable-owner, lease, exposure, CAS and
 -- anti-deletion rule. This API cannot bypass or replace commit validation.
 return public.clubhouse_commentary_commit(p_scope,p_expected_version,state);
end $$;
revoke all on function public.clubhouse_commentary_load_changed(uuid,bigint) from public,anon,authenticated;
revoke all on function public.clubhouse_commentary_patch(uuid,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.clubhouse_commentary_load_changed(uuid,bigint) to service_role;
grant execute on function public.clubhouse_commentary_patch(uuid,bigint,jsonb,jsonb) to service_role;
