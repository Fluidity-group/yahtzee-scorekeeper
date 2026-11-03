import{PortraitError,UUID,portraitStyle,PORTRAIT_PRESETS,validatePortraitImage}from'../../src/profile/portrait-contract.js';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
async function boundedBody(request){if(!request.body)return'';const reader=request.body.getReader(),decoder=new TextDecoder();let total=0,text='';try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>7200000){await reader.cancel();throw new PortraitError('Choose a photo up to 5 MB.',413);}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}}
export function portraitHandler({authenticate,store,images,generate,clips,cleanupTimeoutMs=1000}){
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
 const validId=id=>{if(!UUID.test(id||''))throw new PortraitError('Invalid portrait request.');return id;};
 async function cleanupOwner(actor){
  const controller=new AbortController();let timer;
  const work=(async()=>{for(const task of await store.call('cleanup',actor,{}, {signal:controller.signal})){controller.signal.throwIfAborted();await images.remove(task.paths,{signal:controller.signal});controller.signal.throwIfAborted();await store.call('cleanup-complete',actor,{id:task.id,paths:task.paths},{signal:controller.signal});}})();
  try{await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Cleanup deferred'));},cleanupTimeoutMs);})]);}finally{clearTimeout(timer);}
 }
 async function profileView(profile){
  const view={ownerId:profile.owner_id,avatarId:profile.job_id||null,revision:profile.revision,kind:profile.kind,preset:profile.preset,style:profile.style,hasOriginal:!!profile.original_path};
  if(profile.image_path)try{view.url=await images.sign(profile.image_path);view.imageStatus='ready';}catch{view.imageStatus='unavailable';}
  return view;
 }
 async function jobView(job){return{id:job.id,status:job.status,style:job.style,error:job.status==='failed'?'This draft expired, failed or was replaced. Reopen Your avatar or generate a new draft.':null,...(job.status==='ready'||job.status==='confirmed'?{url:await images.sign(job.image_path)}:{})};}
 return async request=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Use POST.'},405);
  try{
   const actor=await authenticate(request);if(!actor)throw new PortraitError('Sign in to save your avatar across phones.',401);
   const length=Number(request.headers.get('Content-Length'));if(length>7200000)throw new PortraitError('Choose a photo up to 5 MB.',413);
   const raw=await boundedBody(request);
   let body;try{body=JSON.parse(raw);}catch{throw new PortraitError('Invalid portrait request.');}if(!body||Array.isArray(body)||typeof body!=='object')throw new PortraitError('Invalid portrait request.');
   // Metadata recovery never waits for unrelated storage cleanup. Durable tasks are retained.
   if(!['profile','status','peers','animation'].includes(body.operation))try{await cleanupOwner(actor);}catch{/* Later mutation or cleanup worker retries the durable queue. */}
   if(body.operation==='profile')return reply({profile:await profileView(await store.call('profile',actor,{}))});
   if(body.operation==='animation'){if(!clips)throw new PortraitError('Avatar animations are not configured yet.',503);return reply({animation:await clips.read(actor,body)});}
   if(body.operation==='peers'){
    if(!/^[A-Z2-9]{8}$/.test(body.code||''))throw new PortraitError('Choose your current table.');
    const profiles=await store.call('peers',actor,{code:body.code});return reply({profiles:await Promise.all(profiles.map(profileView))});
   }
   if(body.operation==='generate'){
    const id=validId(body.id);portraitStyle(body.style);
    if(typeof body.photo!=='string'||body.photo.length>7000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.photo))throw new PortraitError('Choose a valid photo up to 5 MB.');
    let bytes;try{bytes=Uint8Array.from(atob(body.photo),c=>c.charCodeAt(0));}catch{throw new PortraitError('Invalid image.');}validatePortraitImage(bytes,body.mime);
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    const reservation=await store.call('reserve',actor,{id,style:body.style,fingerprint:digest});
    if(!reservation.fresh)return reply({job:await jobView(reservation.job)});
    let job;try{
     await images.put(reservation.job.original_path,bytes,body.mime);
     const generated=await generate({bytes,mime:body.mime,style:body.style});validatePortraitImage(generated.bytes,generated.mime);
     await images.put(reservation.job.image_path,generated.bytes,generated.mime);
     job=await store.call('complete',actor,{id,usage:generated.usage});
    }catch(error){await store.call('fail',actor,{id}).catch(()=>{});throw error;}
    // A signing/transport failure after completion must not delete the ready draft
    // or turn a retry into another paid generation.
    return reply({job:await jobView(job)});
   }
   if(body.operation==='status')return reply({job:await jobView(await store.call('status',actor,{id:validId(body.id)}))});
   if(body.operation==='confirm'){
    const id=validId(body.id);if(typeof body.retainOriginal!=='boolean'||!Number.isInteger(body.revision)||body.revision<0)throw new PortraitError('Review the portrait and photo-retention choice.');
    const job=await store.call('status',actor,{id});if(job.status==='failed')throw new PortraitError('This draft expired or was replaced. Reopen Your avatar before confirming.',409);if(!['ready','confirmed'].includes(job.status))throw new PortraitError('Wait for a finished portrait before confirming.');
    const result=await store.call('confirm',actor,{id,revision:body.revision,retainOriginal:body.retainOriginal});
    let cleanupPending=false;try{await images.remove(result.cleanup||[]);await store.call('cleanup-complete',actor,{id,paths:result.cleanup||[]});await cleanupOwner(actor);}catch{cleanupPending=true;}
    return reply({profile:await profileView(result.profile),cleanupPending});
   }
   if(body.operation==='preset'){
    if(!PORTRAIT_PRESETS.includes(body.preset)||!Number.isInteger(body.revision)||body.revision<0)throw new PortraitError('Choose one of the preset avatars.');
    const result=await store.call('preset',actor,{preset:body.preset,revision:body.revision});await images.remove(result.cleanup||[]).catch(()=>{});return reply({profile:await profileView(result.profile)});
   }
   if(body.operation==='original'){
    const p=await store.call('profile',actor,{});return reply({url:p.original_path?await images.sign(p.original_path):null});
   }
   if(body.operation==='delete-original'){
    const p=await store.call('profile',actor,{});if(p.original_path)await images.remove([p.original_path]);
    return reply({profile:await profileView(await store.call('delete-original',actor,{revision:p.revision}))});
   }
   throw new PortraitError('Unknown portrait action.');
  }catch(error){return reply({error:error instanceof PortraitError?error.message:'The portrait result could not be checked. Reopen Your avatar before trying again.'},error instanceof PortraitError?error.status:500);}
 };
}
