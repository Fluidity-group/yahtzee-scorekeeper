// Bounded numeric diagnostics only: no URL, token, body, names or captions.
const operations=new Set(['clubhouse_commentary_load','clubhouse_commentary_load_changed','clubhouse_commentary_patch','clubhouse_commentary_commit','clubhouse_commentary_set_limit','clubhouse_commentary_ack_outbox','clubhouse_commentary_expire','clubhouse_commentary_forget']);
export function createRequestTrace({fetchImpl=fetch,emit=()=>{},now=()=>performance.now(),region}={}){
 const start=now(),counts={},milliseconds={};let submittedBytes=0;
 const label=input=>{try{const url=new URL(input);const name=url.pathname.split('/').at(-1);if(operations.has(name))return name;if(url.pathname==='/auth/v1/user')return 'auth';if(url.hostname==='api.anthropic.com')return 'writer';if(url.hostname==='api.elevenlabs.io')return 'voice';return 'database-resource';}catch{return 'other';}};
 const elapsed=()=>Math.round((now()-start)*100)/100;
 return {async fetch(input,options={}){const operation=label(input),began=now();counts[operation]=(counts[operation]||0)+1;if(typeof options.body==='string')submittedBytes+=new TextEncoder().encode(options.body).length;try{return await fetchImpl(input,options);}finally{milliseconds[operation]=Math.round(((milliseconds[operation]||0)+now()-began)*100)/100;}},
 report(stage,operation,status){try{emit({stage,operation,status,elapsedMs:elapsed(),upstreamCounts:{...counts},upstreamHeadersMs:{...milliseconds},submittedBytes,...(typeof region==='string'&&/^[a-z0-9-]{1,30}$/.test(region)?{region}:{})});}catch{}},serverTiming:()=> 'commentary;dur='+elapsed()};
}
