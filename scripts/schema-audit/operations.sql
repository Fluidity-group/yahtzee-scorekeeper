-- Run ONLY after catalog.sql confirms cron.job and storage.buckets exist.
-- Fixed migration-owned configuration only; no object names, media, Vault values,
-- player rows, tokens, credentials or application routines are read/invoked.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='20s';
SELECT jsonb_build_object(
 'auditVersion',1,'readOnly',current_setting('transaction_read_only')='on',
 'jobs',coalesce((SELECT jsonb_agg(jsonb_build_object('key',jobname,'schedule',schedule,'active',active,'commandMd5',md5(command)) ORDER BY jobname)
  FROM cron.job WHERE jobname IN ('dice-clubhouse-commentary-retention','clubhouse-portrait-cleanup-hourly')),'[]'::jsonb),
 'buckets',coalesce((SELECT jsonb_agg(jsonb_build_object('key',id,'public',public,'fileSizeLimit',file_size_limit,'mimeTypes',allowed_mime_types) ORDER BY id)
  FROM storage.buckets WHERE id IN ('clubhouse-portraits','clubhouse-avatar-animations')),'[]'::jsonb)
) AS operations_audit;
ROLLBACK;
