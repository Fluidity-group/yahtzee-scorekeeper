-- Automatic POC commentary retention. Fixed scope; no secrets, HTTP or provider calls.
-- Install pattern: https://supabase.com/docs/guides/cron/install
begin;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function clubhouse_commentary_private.cleanup_retention()
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 fixed_scope constant uuid:='d1ce0000-0000-4000-8000-000000000026';
 cutoff timestamptz:=clock_timestamp();
 expired jsonb;pending_removed bigint;processed_removed bigint;
begin
 -- Existing expiry locks the scope and purges heard records/ratings/derived captions.
 -- Its 90-day boundary uses database time; profiles and consumed accounting survive.
 expired:=public.clubhouse_commentary_expire(fixed_scope);
 delete from public.clubhouse_commentary_outbox
 where scope_id=fixed_scope and processed_at is null and created_at<cutoff-interval '1 day';
 get diagnostics pending_removed=row_count;
 delete from public.clubhouse_commentary_outbox
 where scope_id=fixed_scope and processed_at is not null and processed_at<cutoff-interval '90 days';
 get diagnostics processed_removed=row_count;
 return jsonb_build_object('expired',expired,'stalePendingOutboxRemoved',pending_removed,
  'oldProcessedOutboxRemoved',processed_removed,'scoresChanged',false,'profilesChanged',false);
end $$;
-- Only the migration/function owner can execute. Job runs as its creating owner.
revoke all on function clubhouse_commentary_private.cleanup_retention() from public,anon,authenticated,service_role;

-- Named schedule is idempotent for the same migration owner (pg_cron updates that job).
select cron.schedule('dice-clubhouse-commentary-retention','*/15 * * * *',
 'select clubhouse_commentary_private.cleanup_retention();');
commit;
