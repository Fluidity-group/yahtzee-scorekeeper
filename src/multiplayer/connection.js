const networkMessage='Could not reach the multiplayer server. Check your internet connection and try again, or use Local games.';
const networkNames=new Set(['TypeError','AbortError','TimeoutError','AuthRetryableFetchError']);
const networkFailure=error=>networkNames.has(error?.name)||typeof error?.message==='string'&&/failed to fetch|fetch failed|network request failed|load failed/i.test(error.message);
export function onlineErrorMessage(error){
 if(networkFailure(error))return networkMessage;
 return typeof error?.message==='string'&&error.message.trim()?error.message:'Could not connect to multiplayer. Try again or use Local games.';
}
const deadlineError=name=>Object.assign(new Error(networkMessage),{name});

// Racing attaches rejection handlers to the original operation, so a late
// rejection after timeout is consumed rather than becoming unhandled.
export function waitForOnline(promise){
 let timer;
 return Promise.race([Promise.resolve(promise),new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(deadlineError('TimeoutError')),15000);})])
  .finally(()=>clearTimeout(timer));
}

// Own the deadline as well as AbortSignal: custom transports can ignore abort.
// Caller cancellation is separate from the retryable internal timeout.
export function fetchWithTimeout(input,options={},fetchImplementation=(...args)=>globalThis.fetch(...args)){
 const caller=options.signal??input?.signal,controller=new AbortController();let timer,abort;
 return new Promise((resolve,reject)=>{
  abort=()=>{controller.abort();reject(deadlineError('AbortError'));};
  if(caller?.aborted){abort();return;}
  caller?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>{controller.abort();reject(deadlineError('TimeoutError'));},12000);
  Promise.resolve().then(()=>fetchImplementation(input,{...options,signal:controller.signal})).then(resolve,error=>{
   // Errors originating in fetch are transport failures, not trusted rule text.
   reject(deadlineError(networkNames.has(error?.name)?error.name:'TypeError'));
  });
 }).finally(()=>{clearTimeout(timer);caller?.removeEventListener('abort',abort);});
}
