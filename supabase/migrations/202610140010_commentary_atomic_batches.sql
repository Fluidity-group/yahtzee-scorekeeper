-- Service-only unit-of-work commit; preserve canonical validation and freshness.
create or replace function public.clubhouse_commentary_batch(p_scope uuid,p_expected_version bigint,p_changes jsonb,p_deleted jsonb,p_rooms jsonb)returns jsonb
language plpgsql security definer set search_path='' as $$
declare v bigint;r jsonb;actual bigint;ids uuid[];
begin
 if p_expected_version is null or p_expected_version<0 then raise exception 'Expected version required';end if;
 if jsonb_typeof(p_rooms)is distinct from 'array'or jsonb_array_length(p_rooms)>201 then raise exception 'Bounded room fences required';end if;
 for r in select value from jsonb_array_elements(p_rooms)loop
  if jsonb_typeof(r)is distinct from 'object'or (r->>'id')is null or (r->>'id')!~'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'or not(r?'revision')or (r->>'revision'is not null and not coalesce(r->>'revision'~'^[0-9]+$',false))then raise exception 'Invalid room fence';end if;
 end loop;
 select array_agg((e->>'id')::uuid order by e->>'id')into ids from jsonb_array_elements(p_rooms)e;
 -- Room locks precede scope lock, matching authoritative room command ordering.
 if coalesce(cardinality(ids),0)>0 then
  perform 1 from public.clubhouse_rooms where id=any(ids)order by id for share;
  for r in select value from jsonb_array_elements(p_rooms)loop
   select revision into actual from public.clubhouse_rooms where id=(r->>'id')::uuid;
   if actual is distinct from (r->>'revision')::bigint then return jsonb_build_object('committed',false,'reason','room-changed');end if;
  end loop;
 end if;
 insert into public.clubhouse_commentary_scopes(id)values(p_scope)on conflict do nothing;
 select version into v from public.clubhouse_commentary_scopes where id=p_scope for update;
 if v<>p_expected_version then return jsonb_build_object('committed',false,'version',v);end if;
 if jsonb_typeof(p_changes)is distinct from 'object'or jsonb_typeof(p_deleted)is distinct from 'object'then raise exception 'Invalid batch patch';end if;
 if p_changes='{}'::jsonb and p_deleted='{}'::jsonb then return jsonb_build_object('committed',true,'version',v,'databaseNowMs',floor(extract(epoch from clock_timestamp())*1000));end if;
 return public.clubhouse_commentary_patch(p_scope,p_expected_version,p_changes,p_deleted);
end $$;
revoke all on function public.clubhouse_commentary_batch(uuid,bigint,jsonb,jsonb,jsonb)from public,anon,authenticated;
grant execute on function public.clubhouse_commentary_batch(uuid,bigint,jsonb,jsonb,jsonb)to service_role;
