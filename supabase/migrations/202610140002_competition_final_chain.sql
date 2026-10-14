-- Versioned manual Competition capability; existing v1 games are untouched.
begin;
create or replace function public.clubhouse_competition_v2_available() returns boolean
 language sql stable security invoker set search_path = '' as $$ select true $$;
revoke all on function public.clubhouse_competition_v2_available() from public, anon, authenticated;
grant execute on function public.clubhouse_competition_v2_available() to service_role;
commit;
