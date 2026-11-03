-- Additive private authoring storage. Publishing still uses clubhouse_commit_game.
begin;
create table if not exists public.clubhouse_reaction_drafts (
 id uuid primary key,
 room_id uuid not null references public.clubhouse_rooms(id),
 owner_id uuid not null references auth.users(id),
 rule_id text not null check(length(rule_id) between 1 and 160),
 revision bigint not null check(revision>0),
 base_config_version bigint not null check(base_config_version>=0),
 content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=16384),
 deleted boolean not null default false,
 last_request_id uuid not null,
 last_fingerprint text not null,
 updated_at timestamptz not null default now()
);
alter table public.clubhouse_reaction_drafts enable row level security;
revoke all on public.clubhouse_reaction_drafts from public,anon,authenticated;
grant all on public.clubhouse_reaction_drafts to service_role;
create unique index if not exists clubhouse_reaction_draft_active_rule
 on public.clubhouse_reaction_drafts(owner_id,room_id,rule_id) where not deleted;
create index if not exists clubhouse_reaction_draft_owner_room on public.clubhouse_reaction_drafts(owner_id,room_id);

create or replace function public.clubhouse_save_reaction_draft(
 p_room_id uuid,p_owner_id uuid,p_id uuid,p_expected_revision bigint,
 p_base_version bigint,p_content jsonb,p_request_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 prior public.clubhouse_reaction_drafts%rowtype;
 saved public.clubhouse_reaction_drafts%rowtype;
 members uuid[];
 rid text;
 fingerprint text;
begin
 select member_ids into members from public.clubhouse_rooms where id=p_room_id for update;
 if not found or not(p_owner_id=any(members)) then raise exception 'Invalid member' using errcode='42501';end if;
 if p_id is null or p_request_id is null or p_expected_revision is null or p_expected_revision<0 or p_base_version is null or p_base_version<0
  or p_content is null or jsonb_typeof(p_content)<>'object' or octet_length(p_content::text)>16384
  or coalesce(p_content->>'operation','') not in ('save','remove') then raise exception 'Invalid draft' using errcode='22023';end if;
 rid=case when p_content->>'operation'='save' then p_content->'rule'->>'id' else p_content->>'ruleId' end;
 if rid is null or length(rid) not between 1 and 160 then raise exception 'Invalid draft rule' using errcode='22023';end if;
 fingerprint=md5(jsonb_build_array(p_expected_revision,p_base_version,p_content)::text);
 select * into prior from public.clubhouse_reaction_drafts where id=p_id for update;
 if found then
  if prior.room_id<>p_room_id or prior.owner_id<>p_owner_id then raise exception 'Invalid owner' using errcode='42501';end if;
  if prior.deleted then raise exception 'Discarded draft' using errcode='40001';end if;
  if prior.last_request_id=p_request_id then
   if prior.last_fingerprint<>fingerprint then raise exception 'Request collision' using errcode='40001';end if;
   return to_jsonb(prior);
  end if;
  if prior.revision<>p_expected_revision or prior.rule_id<>rid then raise exception 'Draft changed' using errcode='40001';end if;
  update public.clubhouse_reaction_drafts set revision=revision+1,base_config_version=p_base_version,content=p_content,
   last_request_id=p_request_id,last_fingerprint=fingerprint,updated_at=now() where id=p_id returning * into saved;
 else
  if p_expected_revision<>0 then raise exception 'Draft changed' using errcode='40001';end if;
  if (select count(*) from public.clubhouse_reaction_drafts where room_id=p_room_id and owner_id=p_owner_id and not deleted)>=32
   then raise exception 'Too many drafts' using errcode='22023';end if;
  insert into public.clubhouse_reaction_drafts(id,room_id,owner_id,rule_id,revision,base_config_version,content,last_request_id,last_fingerprint)
   values(p_id,p_room_id,p_owner_id,rid,1,p_base_version,p_content,p_request_id,fingerprint) returning * into saved;
 end if;
 return to_jsonb(saved);
end $$;

create or replace function public.clubhouse_discard_reaction_draft(p_room_id uuid,p_owner_id uuid,p_id uuid,p_expected_revision bigint)
 returns boolean language plpgsql security invoker set search_path='' as $$
declare prior public.clubhouse_reaction_drafts%rowtype;members uuid[];
begin
 select member_ids into members from public.clubhouse_rooms where id=p_room_id for update;
 if not found or not(p_owner_id=any(members)) then raise exception 'Invalid member' using errcode='42501';end if;
 select * into prior from public.clubhouse_reaction_drafts where id=p_id for update;
 if not found then return true;end if;
 if prior.room_id<>p_room_id or prior.owner_id<>p_owner_id then raise exception 'Invalid owner' using errcode='42501';end if;
 if prior.deleted then return true;end if;
 if p_expected_revision is null or prior.revision<>p_expected_revision then raise exception 'Draft changed' using errcode='40001';end if;
 update public.clubhouse_reaction_drafts set deleted=true,content='{}'::jsonb,last_fingerprint='',revision=revision+1,updated_at=now() where id=p_id;
 return true;
end $$;
revoke all on function public.clubhouse_save_reaction_draft(uuid,uuid,uuid,bigint,bigint,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.clubhouse_discard_reaction_draft(uuid,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.clubhouse_save_reaction_draft(uuid,uuid,uuid,bigint,bigint,jsonb,uuid) to service_role;
grant execute on function public.clubhouse_discard_reaction_draft(uuid,uuid,uuid,bigint) to service_role;
-- Linearize publication with draft save/discard using the same room -> draft lock order.
create or replace function public.clubhouse_commit_reaction_draft(
 p_room_id uuid,p_expected_revision bigint,p_state jsonb,p_actor_id uuid,
 p_command_id text,p_fingerprint text,p_draft_id uuid,p_draft_revision bigint
) returns boolean language plpgsql security invoker set search_path='' as $$
declare prior public.clubhouse_rooms%rowtype;draft public.clubhouse_reaction_drafts%rowtype;receipt public.clubhouse_room_receipts%rowtype;
begin
 select * into prior from public.clubhouse_rooms where id=p_room_id for update;
 if not found or not(p_actor_id=any(prior.member_ids)) then raise exception 'Invalid member' using errcode='42501';end if;
 select * into receipt from public.clubhouse_room_receipts where room_id=p_room_id and command_id=p_command_id;
 if found then
  if receipt.actor_id<>p_actor_id or receipt.fingerprint<>p_fingerprint then raise exception 'Request collision' using errcode='42501';end if;
  return false;
 end if;
 if prior.revision<>p_expected_revision then return false;end if;
 select * into draft from public.clubhouse_reaction_drafts where id=p_draft_id for update;
 if not found or draft.room_id<>p_room_id or draft.owner_id<>p_actor_id or draft.deleted
  or p_draft_revision is null or draft.revision<>p_draft_revision
  or draft.base_config_version<>coalesce((prior.state->'reactions'->>'version')::bigint,0)
  then raise exception 'Draft changed before publication' using errcode='40001';end if;
 if p_state->'game' is distinct from prior.state->'game'
  or p_state->'reactionPublication'->>'draftId' is distinct from p_draft_id::text
  or p_state->'reactionPublication'->>'draftRevision' is distinct from p_draft_revision::text
  or p_state->'reactionPublication'->>'authorId' is distinct from p_actor_id::text
  or p_state->'reactionPublication'->>'commandId' is distinct from p_command_id
  then raise exception 'Invalid publication' using errcode='22023';end if;
 return public.clubhouse_commit_game(p_room_id,p_expected_revision,p_state,p_actor_id,p_command_id,p_fingerprint);
end $$;
revoke all on function public.clubhouse_commit_reaction_draft(uuid,bigint,jsonb,uuid,text,text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.clubhouse_commit_reaction_draft(uuid,bigint,jsonb,uuid,text,text,uuid,bigint) to service_role;
commit;
