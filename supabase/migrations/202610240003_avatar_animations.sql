-- Private pre-generated animations, tied to the exact chosen avatar job.
-- No paid generation at score time; no client writes or public bucket access.
create table if not exists public.clubhouse_avatar_animations(
 owner_id uuid not null references auth.users(id) on delete cascade,
 avatar_job_id uuid not null references public.clubhouse_portrait_jobs(id) on delete cascade,
 kind text not null check(kind in('yahtzee','full-house','upper-bonus','large-straight','game-win','tournament-win','scratch','low-kind','upper-impossible')),
 object_path text not null unique,
 sha256 text not null check(sha256~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 primary key(owner_id,avatar_job_id,kind),
 check(object_path=owner_id::text||'/'||avatar_job_id::text||'/'||kind||'.mp4')
);
alter table public.clubhouse_avatar_animations enable row level security;
revoke all on public.clubhouse_avatar_animations from public,anon,authenticated;
grant select,insert,update,delete on public.clubhouse_avatar_animations to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clubhouse-avatar-animations','clubhouse-avatar-animations',false,5242880,array['video/mp4'])
on conflict(id)do update set public=false;

create or replace function public.clubhouse_avatar_animation(p_actor uuid,p_owner uuid,p_avatar uuid,p_kind text,p_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare asset public.clubhouse_avatar_animations;
begin
 if p_actor is null or not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null and not coalesce(is_anonymous,false))then raise exception 'Animation unauthorized' using errcode='42501';end if;
 if p_actor<>p_owner and not exists(select 1 from public.clubhouse_rooms where code=p_code and p_actor=any(member_ids)and p_owner=any(member_ids))then raise exception 'Animation not available at this table' using errcode='42501';end if;
 if not exists(select 1 from public.clubhouse_avatars where owner_id=p_owner and kind='generated'and job_id=p_avatar)then return null;end if;
 select * into asset from public.clubhouse_avatar_animations where owner_id=p_owner and avatar_job_id=p_avatar and kind=p_kind;
 if not found then return null;end if;
 return jsonb_build_object('path',asset.object_path);
end;
$$;
revoke all on function public.clubhouse_avatar_animation(uuid,uuid,uuid,text,text)from public,anon,authenticated;
grant execute on function public.clubhouse_avatar_animation(uuid,uuid,uuid,text,text)to service_role;

create or replace function public.clubhouse_avatar_animation_cleanup(p_deleted jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pending jsonb;
begin
 if p_deleted is not null then
  delete from public.clubhouse_avatar_animations c where object_path in(select jsonb_array_elements_text(p_deleted))
   and not exists(select 1 from public.clubhouse_avatars a where a.owner_id=c.owner_id and a.kind='generated'and a.job_id=c.avatar_job_id);
 end if;
 -- Discover from Storage too, so cascaded account/job deletion cannot strand
 -- objects after their metadata rows disappear. Never delete a chosen avatar's set.
 select coalesce(jsonb_agg(name),'[]'::jsonb)into pending from(
  select o.name from storage.objects o where o.bucket_id='clubhouse-avatar-animations'
  and not exists(select 1 from public.clubhouse_avatars a where a.owner_id::text=split_part(o.name,'/',1)and a.kind='generated'and a.job_id::text=split_part(o.name,'/',2))
  order by o.created_at limit 100
 )expired;
 return pending;
end;
$$;
revoke all on function public.clubhouse_avatar_animation_cleanup(jsonb)from public,anon,authenticated;
grant execute on function public.clubhouse_avatar_animation_cleanup(jsonb)to service_role;
