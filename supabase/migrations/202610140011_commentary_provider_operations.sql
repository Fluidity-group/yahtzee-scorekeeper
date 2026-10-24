-- Atomic provider transitions: all existing provider/budget/lease guards live
-- inside the scope lock; no paid request can precede the committed receipt.
create or replace function public.clubhouse_commentary_dispatch(p_scope uuid,p_input jsonb)returns jsonb
language plpgsql security definer set search_path='' as $$
declare v bigint;a jsonb;j jsonb;l jsonb;b jsonb;lim public.clubhouse_commentary_limits%rowtype;n bigint;chars bigint;delta bigint;result jsonb;now_ms numeric:=floor(extract(epoch from clock_timestamp())*1000);req text:=p_input->>'requestId';room uuid;
begin
 if jsonb_typeof(p_input)is distinct from 'object'or not coalesce(p_input->>'submittedCharacters'~'^[0-9]+$',false)or not coalesce(p_input->>'expiresAt'~'^[0-9]+$',false)or(p_input->>'expiresAt')::numeric<=now_ms or p_input->>'stage'not in('writer','tts')then raise exception 'Invalid provider dispatch';end if;
 room:=(p_input->>'roomId')::uuid;
 select version into v from public.clubhouse_commentary_scopes where id=p_scope for update;if v is null then raise exception 'Uninitialized provider scope';end if;
 select value into a from public.clubhouse_commentary_items where scope_id=p_scope and collection='attempts'and item_key=req;
 select value into j from public.clubhouse_commentary_items where scope_id=p_scope and collection='jobs'and item_key=p_input->>'jobId';
 select value into b from public.clubhouse_commentary_items where scope_id=p_scope and collection='budgets'and item_key=room::text;
 select * into lim from public.clubhouse_commentary_limits where scope_id=p_scope and room_id=room;
 if a is null or j is null or b is null or lim.room_id is null or lim.expires_at<=clock_timestamp()or a->>'jobId'is distinct from p_input->>'jobId'or a->>'stage'is distinct from p_input->>'stage'or a->>'status'is distinct from 'submitted'or a->>'providerDispatchedAt'is not null or j->>'roomId'is distinct from room::text or j->'profile'->>'enabled'is distinct from 'true'or j->>'status'in('cancelled','silent','failed')then raise exception 'Provider attempt is not dispatchable';end if;
 if p_input->>'stage'='writer'and(j->>'status'is distinct from 'generating'or j->>'workerToken'is distinct from req)then raise exception 'Writer stage changed';end if;
 if p_input->>'stage'='tts'then
  select value into l from public.clubhouse_commentary_items where scope_id=p_scope and collection='leases'and item_key=room::text;
  if j->>'status'is distinct from 'streaming'or j->>'activeTtsAttemptId'is distinct from req or l is null or l->>'owner'is distinct from j->'claim'->>'owner'or l->>'device'is distinct from j->'claim'->>'device'or l->>'epoch'is distinct from j->'claim'->>'epoch'or(l->>'expiresAt')::numeric<=now_ms then raise exception 'Playback lease expired before voice dispatch';end if;
 end if;
 select count(*),coalesce(sum((value->>'submittedCharacters')::bigint),0)into n,chars from public.clubhouse_commentary_items where scope_id=p_scope and collection='attempts'and value->>'allowanceId'=p_input->>'allowanceId'and value->>'stage'=p_input->>'stage'and value->>'providerDispatchedAt'is not null;
 if n>=200 or(p_input->>'stage'='tts'and chars+(p_input->>'submittedCharacters')::bigint>36000)then raise exception 'Administered provider ceiling reached';end if;
 delta:=greatest(0,(p_input->>'submittedCharacters')::bigint-(a->>'characters')::bigint);
 if(b->>'requests')::bigint>lim.max_requests or(b->>'characters')::bigint+delta>lim.max_characters then raise exception 'Administered room ceiling reached';end if;
 b:=jsonb_set(b,'{characters}',to_jsonb((b->>'characters')::bigint+delta));
 a:=a||jsonb_build_object('allowanceId',p_input->'allowanceId','providerDispatchedAt',now_ms,'provider',p_input->'provider','model',p_input->'model','submittedCharacters',p_input->'submittedCharacters','maxOutputTokens',p_input->'maxOutputTokens');
 result:=public.clubhouse_commentary_patch(p_scope,v,jsonb_build_object('attempts',jsonb_build_object(req,a),'budgets',jsonb_build_object(room::text,b)),'{}');
 if result->>'committed'is distinct from 'true'then raise exception 'Provider reservation conflicted';end if;
 return jsonb_build_object('id',req,'requestId',req,'allowanceId',p_input->'allowanceId','stage',p_input->'stage','committed',true);
end $$;
create or replace function public.clubhouse_commentary_finish(p_scope uuid,p_id text,p_metadata jsonb)returns boolean
language plpgsql security definer set search_path='' as $$
declare v bigint;a jsonb;result jsonb;
begin
 if jsonb_typeof(p_metadata)is distinct from 'object'or octet_length(p_metadata::text)>8192 then raise exception 'Bounded provider metadata required';end if;
 select version into v from public.clubhouse_commentary_scopes where id=p_scope for update;
 select value into a from public.clubhouse_commentary_items where scope_id=p_scope and collection='attempts'and item_key=p_id;
 if a is null or a->>'providerDispatchedAt'is null then raise exception 'Missing dispatched attempt';end if;
 a:=a||jsonb_build_object('providerResult',p_metadata,'providerFinishedAt',floor(extract(epoch from clock_timestamp())*1000));
 result:=public.clubhouse_commentary_patch(p_scope,v,jsonb_build_object('attempts',jsonb_build_object(p_id,a)),'{}');
 if result->>'committed'is distinct from 'true'then raise exception 'Provider completion conflicted';end if;return true;
end $$;
revoke all on function public.clubhouse_commentary_dispatch(uuid,jsonb),public.clubhouse_commentary_finish(uuid,text,jsonb)from public,anon,authenticated;
grant execute on function public.clubhouse_commentary_dispatch(uuid,jsonb),public.clubhouse_commentary_finish(uuid,text,jsonb)to service_role;
