-- Owner explicitly authorized hourly private portrait cleanup on 24 October2026.
-- Secrets are provisioned separately; migration/source never contains their values.
-- This job performs cleanup only: it cannot generate images or spend the trial cap.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.clubhouse_invoke_portrait_cleanup()
returns bigint language plpgsql security definer set search_path='' as $$
declare endpoint text; cleanup_token text;
begin
 select decrypted_secret into strict endpoint from vault.decrypted_secrets where name='clubhouse_portrait_cleanup_url';
 select decrypted_secret into strict cleanup_token from vault.decrypted_secrets where name='clubhouse_portrait_cleanup_token';
 if endpoint !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/portrait-cleanup$' or length(cleanup_token)<32 then
  raise exception 'Portrait cleanup configuration is invalid';
 end if;
 return net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-portrait-cleanup-token',cleanup_token),body:='{}'::jsonb,timeout_milliseconds:=110000);
end;
$$;
revoke all on function public.clubhouse_invoke_portrait_cleanup() from public,anon,authenticated,service_role;

-- Named schedule is idempotent. Keep disabled until deployment verifies worker,
-- private storage and matching Vault/edge secrets. Rollout explicitly activates it.
select cron.schedule('clubhouse-portrait-cleanup-hourly','17 * * * *','select public.clubhouse_invoke_portrait_cleanup();');
select cron.alter_job((select jobid from cron.job where jobname='clubhouse-portrait-cleanup-hourly'),active:=false);
