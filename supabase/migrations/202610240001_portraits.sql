-- Additive portrait state. No updates to accounts, rooms, scores or game rules.
create table if not exists public.clubhouse_avatars(
 owner_id uuid primary key references auth.users(id) on delete cascade,
 revision integer not null default 0 check(revision>=0),
 kind text not null default 'preset' check(kind in('preset','generated')),
 preset text not null default 'character-1' check(preset in('character-1','character-2','character-3','character-4')),
 style text, image_path text, original_path text, job_id uuid,
 updated_at timestamptz not null default now()
);
create table if not exists public.clubhouse_portrait_budget(
 id integer primary key check(id=1), cap_microusd bigint not null default 0 check(cap_microusd>=0),
 reserved_microusd bigint not null default 0 check(reserved_microusd>=0), enabled boolean not null default false
);
-- Inert on installation. The release owner must explicitly configure the remaining
-- authorized trial cap. Each attempt reserves $0.50, including unknown outcomes.
insert into public.clubhouse_portrait_budget(id) values(1) on conflict do nothing;
create table if not exists public.clubhouse_portrait_jobs(
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 style text not null check(style in('box-art','noir-comic','neon-airbrush','retro-pixel')),
 fingerprint text not null, status text not null default 'pending' check(status in('pending','ready','confirmed','failed')),
 original_path text not null, image_path text not null, usage jsonb,cleanup_paths jsonb not null default '[]'::jsonb,cleanup_passes integer not null default 0,cleaned_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists clubhouse_portrait_jobs_owner on public.clubhouse_portrait_jobs(owner_id,created_at desc);
alter table public.clubhouse_avatars enable row level security;
alter table public.clubhouse_portrait_budget enable row level security;
alter table public.clubhouse_portrait_jobs enable row level security;
revoke all on public.clubhouse_avatars,public.clubhouse_portrait_budget,public.clubhouse_portrait_jobs from public,anon,authenticated;
grant all on public.clubhouse_avatars,public.clubhouse_portrait_budget,public.clubhouse_portrait_jobs to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clubhouse-portraits','clubhouse-portraits',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false;
-- No client storage policies: all original/draft access passes through authenticated
-- owner validation in the portrait endpoint. Peers only get confirmed avatars.

create or replace function public.clubhouse_portraits(p_action text,p_actor uuid,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.clubhouse_avatars; j public.clubhouse_portrait_jobs; b public.clubhouse_portrait_budget;
 job_id uuid; paths jsonb; roster uuid[]; result jsonb;
begin
 if p_actor is null or not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then raise exception 'portrait unauthorized' using errcode='42501'; end if;
 insert into public.clubhouse_avatars(owner_id) values(p_actor) on conflict do nothing;
 select * into p from public.clubhouse_avatars where owner_id=p_actor for update;
 if p_action='profile' then return to_jsonb(p); end if;
 if p_action='cleanup' then
  -- Discover expired/lost drafts without relying on a phone retaining their IDs.
  -- Failed jobs are revisited after ten minutes to catch an interrupted upload.
  update public.clubhouse_portrait_jobs jx set status='failed',cleanup_paths=cleanup_paths||jsonb_build_array(original_path,image_path),updated_at=now()
   where owner_id=p_actor and not exists(select 1 from public.clubhouse_avatars ax where ax.job_id=jx.id)
   and ((status='pending' and created_at<now()-interval '10 minutes') or(status='ready' and created_at<now()-interval '24 hours') or(status='failed' and cleanup_passes<2 and coalesce(cleaned_at,updated_at)<now()-interval '10 minutes'));
  return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'paths',x.cleanup_paths)) from(select id,cleanup_paths from public.clubhouse_portrait_jobs where owner_id=p_actor and jsonb_array_length(cleanup_paths)>0 order by created_at limit 20)x),'[]'::jsonb);
 end if;
 if p_action='cleanup-complete' then
  -- A concurrent avatar change may have appended more paths while storage was
  -- deleting. Acknowledge only the exact immutable object paths actually deleted.
  update public.clubhouse_portrait_jobs set cleanup_paths=coalesce((select jsonb_agg(v) from jsonb_array_elements(cleanup_paths) v where not coalesce(p_payload->'paths','[]'::jsonb) @> jsonb_build_array(v)),'[]'::jsonb)
   where id=(p_payload->>'id')::uuid and owner_id=p_actor;
  update public.clubhouse_portrait_jobs set cleaned_at=now(),cleanup_passes=cleanup_passes+1 where id=(p_payload->>'id')::uuid and owner_id=p_actor and cleanup_paths='[]'::jsonb;
  return '{}'::jsonb;
 end if;
 if p_action='peers' then
  select member_ids into roster from public.clubhouse_rooms where code=p_payload->>'code' and p_actor=any(member_ids);
  if roster is null then raise exception 'portrait forbidden' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a)-'original_path') from public.clubhouse_avatars a where owner_id=any(roster)),'[]'::jsonb);
 end if;
 if p_action='reserve' then
  job_id=(p_payload->>'id')::uuid;
  select * into j from public.clubhouse_portrait_jobs where id=job_id;
  if found then
   if j.owner_id<>p_actor or j.fingerprint<>p_payload->>'fingerprint' or j.style<>p_payload->>'style' then raise exception 'portrait request conflict' using errcode='42501'; end if;
   return jsonb_build_object('fresh',false,'job',to_jsonb(j));
  end if;
  if (select count(*) from public.clubhouse_portrait_jobs where owner_id=p_actor and created_at>now()-interval '1 hour')>=10 then raise exception 'portrait rate limit' using errcode='P0001'; end if;
  select * into b from public.clubhouse_portrait_budget where id=1 for update;
  if not b.enabled or b.reserved_microusd+500000>b.cap_microusd then raise exception 'portrait budget exhausted' using errcode='P0001'; end if;
  update public.clubhouse_portrait_budget set reserved_microusd=reserved_microusd+500000 where id=1;
  insert into public.clubhouse_portrait_jobs(id,owner_id,style,fingerprint,original_path,image_path)
   values(job_id,p_actor,p_payload->>'style',p_payload->>'fingerprint',p_actor::text||'/'||job_id::text||'/original',p_actor::text||'/'||job_id::text||'/portrait') returning * into j;
  return jsonb_build_object('fresh',true,'job',to_jsonb(j));
 end if;
 if p_action in('status','complete','fail','confirm') then
  select * into j from public.clubhouse_portrait_jobs where id=(p_payload->>'id')::uuid and owner_id=p_actor for update;
  if not found then raise exception 'portrait not found' using errcode='42501'; end if;
  if p_action='status' then
   if j.status='pending' and j.created_at<now()-interval '10 minutes' then update public.clubhouse_portrait_jobs set status='failed',cleanup_paths=cleanup_paths||jsonb_build_array(original_path,image_path),updated_at=now() where id=j.id returning * into j;end if;
   return to_jsonb(j);
  end if;
  if p_action='complete' then
   if j.status<>'pending' then raise exception 'portrait not pending'; end if;
   update public.clubhouse_portrait_jobs set status='ready',usage=p_payload->'usage',updated_at=now() where id=j.id returning * into j;return to_jsonb(j);
  end if;
  if p_action='fail' then update public.clubhouse_portrait_jobs set status='failed',cleanup_paths=cleanup_paths||jsonb_build_array(original_path,image_path),cleanup_passes=0,updated_at=now() where id=j.id and status in('pending','failed');return '{}'::jsonb; end if;
  if p_action='confirm' then
   if j.status='confirmed' and p.job_id=j.id then
    if (p.original_path is not null)<>(p_payload->>'retainOriginal')::boolean then raise exception 'portrait revision conflict' using errcode='40001';end if;
    return jsonb_build_object('profile',to_jsonb(p),'cleanup',j.cleanup_paths);
   end if;
   if j.status<>'ready' then raise exception 'portrait not ready'; end if;
   if p.revision<>(p_payload->>'revision')::integer then raise exception 'portrait revision conflict' using errcode='40001'; end if;
   paths='[]'::jsonb;
   if p.image_path is not null and p.image_path<>j.image_path then paths=paths||jsonb_build_array(p.image_path); end if;
   if p.original_path is not null and p.original_path<>j.original_path then paths=paths||jsonb_build_array(p.original_path); end if;
   if not (p_payload->>'retainOriginal')::boolean then paths=paths||jsonb_build_array(j.original_path);end if;
   update public.clubhouse_avatars set revision=revision+1,kind='generated',style=j.style,image_path=j.image_path,
    original_path=case when (p_payload->>'retainOriginal')::boolean then j.original_path else null end,job_id=j.id,updated_at=now() where owner_id=p_actor returning * into p;
   update public.clubhouse_portrait_jobs set status='confirmed',cleanup_paths=cleanup_paths||paths,updated_at=now() where id=j.id;
   -- Confirming a choice supersedes every other unconfirmed draft for this
   -- account, including originals from earlier Regenerate attempts.
   update public.clubhouse_portrait_jobs set status='failed',cleanup_paths=cleanup_paths||jsonb_build_array(original_path,image_path),updated_at=now()
    where owner_id=p_actor and id<>j.id and status in('pending','ready','failed');
   return jsonb_build_object('profile',to_jsonb(p),'cleanup',paths);
  end if;
 end if;
 if p_action in('preset','delete-original') then
  if p.revision<>(p_payload->>'revision')::integer then raise exception 'portrait revision conflict' using errcode='40001'; end if;
  paths='[]'::jsonb;
  if p_action='preset' then
   if p.preset=p_payload->>'preset' and p.kind='preset' then return jsonb_build_object('profile',to_jsonb(p),'cleanup',paths); end if;
   if p.image_path is not null then paths=paths||jsonb_build_array(p.image_path); end if;
   if p.original_path is not null then paths=paths||jsonb_build_array(p.original_path); end if;
   if p.job_id is not null then update public.clubhouse_portrait_jobs set cleanup_paths=cleanup_paths||paths where id=p.job_id and owner_id=p_actor;end if;
   update public.clubhouse_avatars set revision=revision+1,kind='preset',preset=p_payload->>'preset',style=null,image_path=null,original_path=null,job_id=null,updated_at=now() where owner_id=p_actor returning * into p;
   return jsonb_build_object('profile',to_jsonb(p),'cleanup',paths);
  end if;
  update public.clubhouse_avatars set revision=revision+1,original_path=null,updated_at=now() where owner_id=p_actor returning * into p;return to_jsonb(p);
 end if;
 raise exception 'unknown portrait action';
end $$;
revoke all on function public.clubhouse_portraits(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.clubhouse_portraits(text,uuid,jsonb) to service_role;

create or replace function public.clubhouse_portrait_cleanup_owners()
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(owner_id),'[]'::jsonb) from(
  select distinct owner_id from public.clubhouse_portrait_jobs
  where jsonb_array_length(cleanup_paths)>0 or(status='pending' and created_at<now()-interval '10 minutes')
   or(status='ready' and created_at<now()-interval '24 hours') or(status='failed' and cleanup_passes<2 and coalesce(cleaned_at,updated_at)<now()-interval '10 minutes')
  order by owner_id limit 25
 )x
$$;
revoke all on function public.clubhouse_portrait_cleanup_owners() from public,anon,authenticated;
grant execute on function public.clubhouse_portrait_cleanup_owners() to service_role;
