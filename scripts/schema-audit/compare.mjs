// Compare cumulative catalog effects, never infer schema state from history/function presence.
export const groups=['tables','columns','constraints','indexes','policies','triggers','functions','schemas','publicationTables'];
const canonical=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]))):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function compareCatalog(expected,actual){
 if(expected.auditVersion!==1||actual.auditVersion!==1||actual.readOnly!==true)throw Error('A versioned read-only catalog snapshot is required.');
 const results={match:[],missing:[],drift:[],extra:[],extensions:[]};
 for(const group of groups){
  if(!Array.isArray(expected[group])||!Array.isArray(actual[group]))throw Error('Incomplete catalog group '+group);
  const before=new Map(expected[group].map(v=>[v.key,v])),after=new Map(actual[group].map(v=>[v.key,v]));
  if(before.size!==expected[group].length||after.size!==actual[group].length)throw Error('Duplicate catalog identity');
  for(const [key,value]of before){const live=after.get(key),entry={group,key};if(!live)results.missing.push(entry);else if(same(value,live))results.match.push(entry);else results.drift.push({...entry,fields:Object.keys(value).filter(k=>!same(value[k],live[k]))});}
  for(const key of after.keys())if(!before.has(key))results.extra.push({group,key});
 }
 for(const ext of expected.requiredExtensions||[]){const live=actual.extensions?.find(v=>v.key===ext.key);results.extensions.push({...ext,state:!live?'missing':live.schema===ext.schema?'match':'drift'});}
 return{...results,complete:results.missing.length===0&&results.drift.length===0&&results.extra.length===0&&results.extensions.every(e=>e.state==='match'),scope:'Cumulative final catalog equality. Operational jobs/buckets, migration-specific backfills and history repair approval remain separate.'};
}

export function compareOperations(expected,actual){
 if(expected.auditVersion!==1||actual.auditVersion!==1||actual.readOnly!==true)throw Error('Versioned read-only operations snapshots required.');
 const result={matches:[],drift:[],missing:[],extra:[],unverified:[]};
 for(const group of ['jobs','buckets']){if(!Array.isArray(expected[group])||!Array.isArray(actual[group]))throw Error('Incomplete operations snapshot');const after=new Map(actual[group].map(x=>[x.key,x]));
  for(const value of expected[group]){const key=group+':'+value.key,live=after.get(value.key);if(!live){result.missing.push(key);continue;}const keys=Object.keys(value).filter(k=>!(group==='jobs'&&k==='commandMd5'&&live.commandNotExported===true));if(group==='jobs'&&live.commandNotExported===true)result.unverified.push({key,field:'commandMd5',reason:'Administrator intentionally omitted command text/hashes'});const fields=keys.filter(k=>!same(value[k],live[k]));if(fields.length)result.drift.push({key,fields,expected:Object.fromEntries(fields.map(k=>[k,value[k]])),live:Object.fromEntries(fields.map(k=>[k,live[k]]))});else result.matches.push(key);}
  for(const key of after.keys())if(!expected[group].some(v=>v.key===key))result.extra.push(group+':'+key);
 }
 return result;
}
