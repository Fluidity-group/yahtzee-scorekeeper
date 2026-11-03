export function portraitCleanupHandler({token,store,images,clips,now=()=>Date.now()}){
 return async request=>{
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(request.method!=='POST')return reply({error:'Use POST.'},405);
  if(!token||request.headers.get('x-portrait-cleanup-token')!==token)return reply({error:'Unauthorized'},401);
  const deadline=now()+100000;let objects=0,actors=0;
  try{await clips?.cleanup();for(const actor of await store.maintenanceActors()){
   if(now()>=deadline)return reply({actors,objects,morePending:true});
   for(const task of await store.call('cleanup',actor,{})){if(now()>=deadline)return reply({actors,objects,morePending:true});await images.remove(task.paths);await store.call('cleanup-complete',actor,{id:task.id,paths:task.paths});objects+=task.paths.length;}actors++;
  }return reply({actors,objects,morePending:false});}catch{return reply({error:'Cleanup remains queued for retry.'},503);}
 };
}
