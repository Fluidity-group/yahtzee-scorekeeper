import {CommentaryError} from './service.js';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-commentary-claim, x-commentary-epoch, x-commentary-device, x-commentary-direct','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const allowed={
 'local-read':['operation','roomId'],
 'local-start':['operation','roomId','commandId','config','settings'],
 'local-command':['operation','roomId','commands','quiet'],
 'playback-start':['operation','roomId','device','jobId'],
 'feedback':['operation','roomId','jobId','value','basis'],
 'forget-history':['operation','roomId'],
 'player-profile-read':['operation','roomId'],
 'player-profile-update':['operation','roomId','expectedVersion','changes'],
 'player-profile-delete':['operation','roomId','expectedVersion'],
 'profile-read':['operation','roomId'],'jobs-read':['operation','roomId'],
 'profile-update':['operation','roomId','expectedVersion','changes'],
 'playback-acquire':['operation','roomId','device'],'playback-heartbeat':['operation','roomId','device','epoch'],
 'playback-claim':['operation','roomId','jobId','device','epoch'],
 'playback-event':['operation','roomId','jobId','device','epoch','claimToken','status','sequence','timing'],
};
// Inject confirmed-user authentication. This route exposes no enqueue/writer/provider endpoint.
export function commentaryHandler({service,authenticate}){
 return async request=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  try{
   const user=await authenticate(request);if(!user)throw new CommentaryError('Sign in to use commentary.',401);
   if(request.method==='GET'){
    const url=new URL(request.url),match=url.pathname.match(/\/commentary\/([0-9a-f-]{36})\/audio\/([0-9a-f-]{36})$/i);
    if(!match||url.search)throw new CommentaryError('Unknown commentary route.',404);
    const body=await service.audio(user,match[1],{jobId:match[2],claimToken:request.headers.get('X-Commentary-Claim'),device:request.headers.get('X-Commentary-Device'),epoch:Number(request.headers.get('X-Commentary-Epoch'))});
    const response=stream=>new Response(stream,{status:200,headers:{...headers,'Content-Type':'audio/mpeg','X-Content-Type-Options':'nosniff'}});return typeof body?.openStream==='function'?()=>response(body.openStream()):response(body);
   }
   if(request.method!=='POST')return reply({error:'Use GET or POST.'},405);
   const raw=await request.text();if(raw.length>4096)throw new CommentaryError('Request too large.',413);
   let body;try{body=JSON.parse(raw);}catch{throw new CommentaryError('Invalid request.');}
   if(!body||typeof body!=='object'||Array.isArray(body)||!allowed[body.operation]||Object.keys(body).some(key=>!allowed[body.operation].includes(key)))throw new CommentaryError('Unsupported commentary request.');
   const args=[user,body.roomId,body];let result;
   switch(body.operation){
    case 'local-read':result=await service.readLocal(...args);break;
    case 'local-start':result=await service.startLocal(...args);break;
    case 'local-command':result=await service.commitLocal(...args);break;
    case 'playback-start':result=await service.acquireAndClaim(...args);break;
    case 'feedback':result=await service.feedback(...args);break;
    case 'forget-history':result=await service.forgetHistory(...args);break;
    case 'player-profile-read':result=await service.getPlayerProfile(...args);break;
    case 'player-profile-update':result=await service.setPlayerProfile(...args);break;
    case 'player-profile-delete':result=await service.deletePlayerProfile(...args);break;
    case 'profile-read':result=await service.getProfile(...args);break;
    case 'profile-update':result=await service.setProfile(...args);break;
    case 'jobs-read':result=await service.list(...args);break;
    case 'playback-acquire':result=await service.acquire(...args);break;
    case 'playback-heartbeat':result=await service.heartbeat(...args);break;
    case 'playback-claim':result=await service.claimPlayback(...args);break;
    case 'playback-event':result=await service.playbackEvent(...args);break;
   }
   return reply({result});
  }catch(error){return error instanceof CommentaryError?reply({error:error.message},error.status):reply({error:'Commentary is unavailable. Scoring can continue.'},500);}
 };
}

