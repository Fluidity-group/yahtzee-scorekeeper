// Parse a released schema-only pg_dump. Never modify the administrator's export.
export function schemaStatements(text){
 const clean=text.replace(/^\\(?:un)?restrict\b[^\n]*$/gm,'');
 if(/^\\/m.test(clean))throw Error('Unsupported psql meta-command in schema export.');
 const statements=[];let start=0,state='normal',dollar='',depth=0;
 for(let i=0;i<clean.length;i++){
  const c=clean[i],next=clean[i+1];
  if(state==='line'){if(c==='\n')state='normal';continue;}
  if(state==='block'){if(c==='/'&&next==='*'){depth++;i++;}else if(c==='*'&&next==='/'){if(--depth===0)state='normal';i++;}continue;}
  if(state==='single'||state==='double'){const quote=state==='single'?"'":'"';if(c===quote){if(next===quote)i++;else state='normal';}continue;}
  if(state==='dollar'){if(clean.startsWith(dollar,i)){i+=dollar.length-1;state='normal';}continue;}
  if(c==='-'&&next==='-'){state='line';i++;continue;}
  if(c==='/'&&next==='*'){state='block';depth=1;i++;continue;}
  if(c==="'"){state='single';continue;}if(c==='"'){state='double';continue;}
  if(c==='$'){const match=clean.slice(i).match(/^\$(?:[a-zA-Z_][\w]*)?\$/);if(match){dollar=match[0];state='dollar';i+=dollar.length-1;continue;}}
  if(c===';'){statements.push(clean.slice(start,i+1));start=i+1;}
 }
 if(!['normal','line'].includes(state))throw Error('Unterminated schema export token.');
 const content=s=>s.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/,'').trim();
 if(content(clean.slice(start)))throw Error('Trailing unparsed schema content.');
 return statements.filter(s=>content(s)).map(statement=>{
  const command=content(statement);
  if(!/^(?:CREATE\s+(?:SCHEMA|TABLE|INDEX|UNIQUE\s+INDEX|FUNCTION|POLICY|TRIGGER)\b|ALTER\s+(?:SCHEMA|TABLE|FUNCTION|DEFAULT\s+PRIVILEGES)\b|GRANT\b|REVOKE\b|COMMENT\s+ON\s+SCHEMA\b|SET\s+[a-z_]+\s*=)/i.test(command)&&!/^SELECT\s+pg_catalog\.set_config\('search_path',\s*'',\s*false\);$/i.test(command))throw Error('Non-schema statement rejected: '+command.match(/^\w+/)?.[0]);
  return statement.replace(/CREATE SCHEMA public;/i,'CREATE SCHEMA IF NOT EXISTS public;');
 });
}
export function catalogSection(text,heading){
 const start=text.indexOf('== '+heading);if(start<0)throw Error('Missing catalog section '+heading);
 const end=text.indexOf('\n== ',start+3),lines=text.slice(start,end<0?undefined:end).split('\n');
 const headerIndex=lines.findIndex(line=>line.includes('|'));
 if(headerIndex<0)return[];
 const headers=lines[headerIndex].split('|').map(v=>v.trim()),rows=[];
 for(const line of lines.slice(headerIndex+2)){if(/^\s*\(\d+ rows?\)/.test(line))break;if(!line.includes('|'))continue;const cells=line.split('|').map(v=>v.trim());if(cells.length!==headers.length)throw Error('Unsupported catalog row shape');rows.push(Object.fromEntries(headers.map((h,i)=>[h,cells[i]])));}
 return rows;
}
export function releasedCatalogFacts(text){
 const server=catalogSection(text,'server')[0];if(!server)throw Error('Missing server version');
 const extensions=catalogSection(text,'extensions').map(r=>({key:r.extname,schema:r.schema,version:r.extversion}));
 const publications=catalogSection(text,'realtime publication tables').filter(r=>r.schemaname==='public'&&r.tablename.startsWith('clubhouse_')).map(r=>({key:r.pubname+'.'+r.schemaname+'.'+r.tablename})).sort((a,b)=>a.key.localeCompare(b.key));
 const jobs=catalogSection(text,'cron jobs (name, schedule, active only; commands not shown)').filter(r=>['clubhouse-portrait-cleanup-hourly','dice-clubhouse-commentary-retention'].includes(r.jobname)).map(r=>({key:r.jobname,schedule:r.schedule,active:r.active==='t',commandNotExported:true}));
 const buckets=catalogSection(text,'storage buckets (settings only)').filter(r=>['clubhouse-portraits','clubhouse-avatar-animations'].includes(r.id)).map(r=>({key:r.id,public:r.public==='t',fileSizeLimit:Number(r.file_size_limit),mimeTypes:r.allowed_mime_types.replace(/^\{|\}$/g,'').split(',')}));
 return{serverMajor:Number(server.server_version.split('.')[0]),serverVersion:server.server_version,exportSessionReadOnly:server.read_only==='on',extensions,publications,jobs,buckets};
}
export function platformDefaultsFromExport(text){
 return schemaStatements(text).map(s=>s.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/,'').trim()).filter(s=>/^ALTER DEFAULT PRIVILEGES\b/.test(s)).map(s=>{
  if(!/^ALTER DEFAULT PRIVILEGES FOR ROLE (?:postgres|supabase_admin) IN SCHEMA public GRANT ALL ON (?:TABLES|FUNCTIONS|SEQUENCES) TO (?:postgres|anon|authenticated|service_role);$/.test(s))throw Error('Unexpected platform default privilege; review required.');return s;
 });
}
