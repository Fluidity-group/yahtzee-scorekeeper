const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function createAuthenticatedCommentaryTransport({auth,serviceBase,anonymousKey='',directReaction=false,fetchImpl=fetch,timeoutMs=12000}={}){
 const base=new URL(serviceBase);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||typeof auth?.getSession!=='function'||typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('Configured authenticated HTTPS commentary transport required.');
 const endpoint=base.href.replace(/\/$/,'');
 async function getAccessToken(){
  let timer;try{
   const lookup=await Promise.race([auth.getSession(),new Promise((_resolve,reject)=>{timer=setTimeout(()=>reject(Error('Sign in to use commentary.')),timeoutMs);})]);
   const session=lookup?.data?.session;
   if(lookup?.error||!uuid.test(session?.user?.id||'')||typeof session?.access_token!=='string'||!session.access_token||session.access_token.length>8192||/[\r\n]/.test(session.access_token))throw Error('Sign in to use commentary.');
   return session.access_token;
  }finally{clearTimeout(timer);}
 }
 async function request(payload,{signal}={}){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||!uuid.test(payload.roomId||'')||typeof payload.operation!=='string'||JSON.stringify(payload).length>4096)throw Error('Invalid commentary request.');
  const abort=new AbortController(),forward=()=>abort.abort();signal?.addEventListener('abort',forward,{once:true});if(signal?.aborted)forward();
  const timer=setTimeout(()=>abort.abort(),payload.operation==='reaction-prepare'?Math.max(timeoutMs,25000):timeoutMs);
  try{
   const token=await getAccessToken();if(abort.signal.aborted)throw Error('Commentary request cancelled.');
   const response=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(directReaction?{'X-Commentary-Direct':'1'}:{}),Authorization:`Bearer ${token}`,...(anonymousKey?{apikey:anonymousKey}:{})},body:JSON.stringify(payload),signal:abort.signal,redirect:'error'});
   if(!response.ok){const error=Error(response.status===409?'Commentary changed. Refresh and try again.':response.status===401?'Sign in to use commentary.':'Commentary unavailable. Scores can continue.');error.status=response.status;throw error;}
   if(!response.body)throw Error('Commentary unavailable.');
   const reader=response.body.getReader(),decoder=new TextDecoder();let body='',bytes=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>262144)throw Error('Commentary response too large.');body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}catch(error){await reader.cancel().catch(()=>{});throw error;}
   let data;try{data=JSON.parse(body);}catch{throw Error('Invalid commentary response.');}
   if(!data||typeof data!=='object'||!Object.hasOwn(data,'result'))throw Error('Invalid commentary response.');return data;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',forward);}
 }
 return {request,getAccessToken};
}
