-- Catalog-only audit. Never invoke application routines or read business/Vault rows.
-- Run on the approved project with psql -X -A -t -v ON_ERROR_STOP=1 -f <this file>.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '20s';
WITH
project_tables AS (
 SELECT c.oid,n.nspname AS schema,c.relname AS name,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls,
        pg_get_userbyid(c.relowner) AS owner,c.relkind
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND left(c.relname,10)='clubhouse_' AND c.relkind IN ('r','p')
),
project_functions AS (
 SELECT p.*,n.nspname AS schema,l.lanname AS language,
        n.nspname||'.'||p.proname||'('||oidvectortypes(p.proargtypes)||')' AS key
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname='public' AND left(p.proname,10)='clubhouse_') OR n.nspname='clubhouse_commentary_private'
)
SELECT jsonb_build_object(
 'auditVersion',1,
 'observedAt',transaction_timestamp(),
 'serverMajor',current_setting('server_version_num')::integer/10000,
 'readOnly',current_setting('transaction_read_only')='on',
 'tables',coalesce((SELECT jsonb_agg(jsonb_build_object('key',t.schema||'.'||t.name,'rls',t.rls,'forceRls',t.force_rls,'owner',t.owner,'kind',t.relkind,
   'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type) FROM aclexplode(coalesce((SELECT relacl FROM pg_class WHERE oid=t.oid),acldefault('r', (SELECT relowner FROM pg_class WHERE oid=t.oid)))) x),
   'privileges',(SELECT jsonb_object_agg(role_name,jsonb_build_object(
    'select',has_table_privilege(role_name,t.oid,'SELECT'),'insert',has_table_privilege(role_name,t.oid,'INSERT'),
    'update',has_table_privilege(role_name,t.oid,'UPDATE'),'delete',has_table_privilege(role_name,t.oid,'DELETE'),
    'truncate',has_table_privilege(role_name,t.oid,'TRUNCATE'),'references',has_table_privilege(role_name,t.oid,'REFERENCES'),
    'trigger',has_table_privilege(role_name,t.oid,'TRIGGER'))) FROM unnest(ARRAY['anon','authenticated','service_role']) role_name)
  ) ORDER BY t.schema,t.name) FROM project_tables t),'[]'::jsonb),
 'columns',coalesce((SELECT jsonb_agg(jsonb_build_object('key',t.schema||'.'||t.name||'.'||a.attname,
   'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'identity',a.attidentity,
   'generated',a.attgenerated,'defaultMd5',md5(pg_get_expr(d.adbin,d.adrelid))) ORDER BY t.schema,t.name,a.attnum)
  FROM project_tables t JOIN pg_attribute a ON a.attrelid=t.oid LEFT JOIN pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
  WHERE a.attnum>0 AND NOT a.attisdropped),'[]'::jsonb),
 'constraints',coalesce((SELECT jsonb_agg(jsonb_build_object('key',t.schema||'.'||t.name||'.'||c.conname,
   'type',c.contype,'definitionMd5',md5(pg_get_constraintdef(c.oid,true)),'validated',c.convalidated,'deferrable',c.condeferrable,'deferred',c.condeferred)
  ORDER BY t.schema,t.name,c.conname) FROM project_tables t JOIN pg_constraint c ON c.conrelid=t.oid WHERE c.contype<>'n'),'[]'::jsonb),
 'indexes',coalesce((SELECT jsonb_agg(jsonb_build_object('key',t.schema||'.'||c.relname,'table',t.schema||'.'||t.name,
   'definitionMd5',md5(pg_get_indexdef(i.indexrelid)),'valid',i.indisvalid,'ready',i.indisready) ORDER BY t.schema,c.relname)
  FROM project_tables t JOIN pg_index i ON i.indrelid=t.oid JOIN pg_class c ON c.oid=i.indexrelid),'[]'::jsonb),
 'policies',coalesce((SELECT jsonb_agg(jsonb_build_object('key',t.schema||'.'||t.name||'.'||p.polname,
   'command',p.polcmd,'permissive',p.polpermissive,
   'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END) FROM unnest(p.polroles) r),
   'usingMd5',md5(pg_get_expr(p.polqual,p.polrelid)),'checkMd5',md5(pg_get_expr(p.polwithcheck,p.polrelid))) ORDER BY t.schema,t.name,p.polname)
  FROM project_tables t JOIN pg_policy p ON p.polrelid=t.oid),'[]'::jsonb),
 'triggers',coalesce((SELECT jsonb_agg(jsonb_build_object('key',t.schema||'.'||t.name||'.'||g.tgname,
   'enabled',g.tgenabled,'definitionMd5',md5(pg_get_triggerdef(g.oid,true))) ORDER BY t.schema,t.name,g.tgname)
  FROM project_tables t JOIN pg_trigger g ON g.tgrelid=t.oid WHERE NOT g.tgisinternal),'[]'::jsonb),
 'functions',coalesce((SELECT jsonb_agg(jsonb_build_object('key',p.key,'owner',pg_get_userbyid(p.proowner),
   'argumentsMd5',md5(pg_get_function_arguments(p.oid)),'returns',pg_get_function_result(p.oid),'language',p.language,
   'securityDefiner',p.prosecdef,'strict',p.proisstrict,'leakproof',p.proleakproof,'volatility',p.provolatile,'parallel',p.proparallel,
   'configMd5',md5(coalesce(array_to_string(p.proconfig,E'\n'),'')),'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),'bodyMd5',md5(replace(p.prosrc,E'\r\n',E'\n')),
   'definitionMd5',md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n')),
   'execute',(SELECT jsonb_object_agg(role_name,has_function_privilege(role_name,p.oid,'EXECUTE'))
     FROM unnest(ARRAY['anon','authenticated','service_role']) role_name)) ORDER BY p.key) FROM project_functions p),'[]'::jsonb),
 'schemas',coalesce((SELECT jsonb_agg(jsonb_build_object('key',n.nspname,'owner',pg_get_userbyid(n.nspowner),
   'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x),
   'privileges',(SELECT jsonb_object_agg(role_name,jsonb_build_object('usage',has_schema_privilege(role_name,n.oid,'USAGE'),
     'create',has_schema_privilege(role_name,n.oid,'CREATE'))) FROM unnest(ARRAY['anon','authenticated','service_role']) role_name)) ORDER BY n.nspname)
  FROM pg_namespace n WHERE n.nspname='clubhouse_commentary_private'),'[]'::jsonb),
 'publicationTables',coalesce((SELECT jsonb_agg(jsonb_build_object('key',pubname||'.'||schemaname||'.'||tablename) ORDER BY pubname,schemaname,tablename)
  FROM pg_publication_tables WHERE schemaname='public' AND left(tablename,10)='clubhouse_'),'[]'::jsonb),
 'extensions',coalesce((SELECT jsonb_agg(jsonb_build_object('key',e.extname,'schema',n.nspname,'version',e.extversion) ORDER BY e.extname)
  FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname IN ('pg_cron','pg_net','supabase_vault')),'[]'::jsonb),
 'optionalRelations',jsonb_build_object('cronJob',to_regclass('cron.job') IS NOT NULL,'storageBuckets',to_regclass('storage.buckets') IS NOT NULL,
   'migrationHistory',to_regclass('supabase_migrations.schema_migrations') IS NOT NULL)
) AS schema_audit;
ROLLBACK;
