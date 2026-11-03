import{verifyManifest,validateUpdateConfig}from'./policy.js';
export const UPDATE_STORAGE='dice-clubhouse:local-updates:v1';
export function createUpdateController({config,bridge,getInfo,storage,fetcher=fetch,cryptoApi=globalThis.crypto,now=Date.now,canActivate=()=>false,identity=null}){
 config=validateUpdateConfig(config);let candidate=null,operation=false;
 function read(){let s;try{const raw=storage.getItem(UPDATE_STORAGE);if(raw&&raw.length>48000)throw Error();s=raw?JSON.parse(raw):{schema:1,highest:0};if(s.schema!==1||!Number.isSafeInteger(s.highest)||s.highest<0)throw Error();}catch{throw Error('Update history is unavailable. Keep the current version.');}return s;}
 const write=s=>{try{storage.setItem(UPDATE_STORAGE,JSON.stringify(s));}catch{throw Error('Could not save update history. The running version is unchanged.');}};
 const exclusive=fn=>async(...args)=>{if(operation)throw Error('An update operation is already running.');operation=true;try{return await fn(...args);}finally{operation=false;}};
 const verify=async(e,info,highest)=>verifyManifest(e,config,{nativeInfo:info,highest,now:now(),cryptoApi,runningVersion:(await bridge.current()).bundle.version});
 const safe=()=>{if(!canActivate())throw Error('Return to Home and finish any pending score or save before switching versions.');};
 async function status(){const s=read(),current=await bridge.current(),info=await getInfo();return{current:current.bundle,native:info,staged:s.staged?.manifest?.version||null,previous:s.previous?.version||null,failure:s.failure||null,configured:!!config};}
 const check=exclusive(async()=>{
  candidate=null;if(!config)throw Error('Local updates are not configured for this build.');
  let response,text;try{response=await fetcher(config.manifestUrl,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok||Number(response.headers.get('Content-Length'))>24000)throw Error();const reader=response.body.getReader(),chunks=[];let length=0;while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>24000){await reader.cancel();throw Error();}chunks.push(part.value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}text=new TextDecoder().decode(bytes);}catch{throw Error('The local update server is unavailable. Keep playing on this version.');}
  let envelope;try{envelope=JSON.parse(text);}catch{throw Error('Unreadable update manifest.');}
  const manifest=await verify(envelope,await getInfo(),read().highest);
  candidate={envelope,manifest};return manifest;
 });
 const download=exclusive(async()=>{
  if(!candidate)throw Error('Check for an approved update first.');
  const envelope=candidate.envelope,manifest=await verify(envelope,await getInfo(),read().highest);
  let bundle;try{bundle=await bridge.download({url:manifest.url,version:manifest.version,checksum:manifest.sha256});}catch{throw Error('Update download failed. Your running version is unchanged.');}
  if(!bundle?.id||bundle.id==='builtin'||bundle.version!==manifest.version||bundle.checksum!==manifest.sha256||['error','deleted'].includes(bundle.status))throw Error('Downloaded update failed verification.');
  // Recheck after the download: an expired response must never become activatable.
  await verify(envelope,await getInfo(),read().highest);
  const s=read();s.staged={envelope,manifest,bundleId:bundle.id};write(s);candidate=null;return manifest;
 });
 const activate=exclusive(async()=>{
  safe();const s=read(),stage=s.staged;if(!stage)throw Error('Download an approved update first.');
  const manifest=await verify(stage.envelope,await getInfo(),s.highest),{bundles}=await bridge.list(),target=bundles.find(b=>b.id===stage.bundleId);
  if(!target||target.checksum!==manifest.sha256||target.version!==manifest.version||['error','deleted'].includes(target.status))throw Error('Staged update is no longer available.');
  const current=(await bridge.current()).bundle;
  safe();s.highest=manifest.sequence;s.previous={id:current.id,checksum:current.checksum,version:current.version,sourceCommit:identity?.commit||null};s.transition={id:target.id,checksum:manifest.sha256,sourceCommit:manifest.sourceCommit,kind:'install'};s.failure=null;write(s);
  // Native set reloads the WebView. There must be no post-set confirmation logic.
  try{return await bridge.set({id:target.id});}catch{const failed=read();failed.failure='Update could not start; previous version retained.';delete failed.transition;write(failed);throw Error(failed.failure);}
 });
 const rollback=exclusive(async()=>{
  safe();const s=read(),previous=s.previous;if(!previous)throw Error('No previous installed version is available.');
  if(previous.id!=='builtin'){const{bundles}=await bridge.list();const target=bundles.find(b=>b.id===previous.id);if(!target||target.status!=='success'||target.checksum!==previous.checksum)throw Error('Previous version is unavailable. Use the packaged version instead.');}
  safe();s.transition={...previous,kind:'rollback'};delete s.staged;write(s);
  return previous.id==='builtin'?bridge.reset():bridge.set({id:previous.id});
 });
 const restorePackaged=exclusive(async()=>{safe();const s=read();s.transition={id:'builtin',kind:'rollback'};delete s.staged;write(s);return bridge.reset();});
 const ready=exclusive(async()=>{
  const s=read(),current=(await bridge.current()).bundle,t=s.transition;
  if(t){
   if(current.id===t.id){if(t.checksum&&t.checksum!==current.checksum||t.sourceCommit&&t.sourceCommit!==identity?.commit)throw Error('Update startup identity does not match. Native rollback will restore the previous version.');delete s.staged;delete s.transition;if(t.kind==='rollback')delete s.previous;s.failure=null;write(s);}
   else if(current.id===s.previous?.id||current.id==='builtin'){s.failure='The last update failed to start. The previous working version was restored.';delete s.staged;delete s.transition;write(s);}
   else throw Error('Unexpected update startup. Native rollback remains armed.');
  }
  return bridge.notifyAppReady();
 });
 return{status,check,download,activate,rollback,restorePackaged,ready};
}
