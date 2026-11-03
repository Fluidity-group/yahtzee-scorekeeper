import {waitForOnline,onlineErrorMessage} from '../multiplayer/connection.js';
import {loadReportTables,ReportsRetired} from './load.js';
import {reportFacts,overallResults,playerPatterns} from './model.js';
import {reportGate,reportPage,drawReportChart} from './view.js';

export function mountReports(root,{auth,configured,request,emailOtpEnabled=false,homeUrl='/',studioUrl='/?studio=1',recoveryUrl='/?reset=1',load=loadReportTables}={}){
 let resizeWidth=null,signingOut=false;
 let disposed=false,generation=0,accountEvents=0,accountTimer=null,authMode='password',email='',authBusy=false;
 const state={user:null,facts:null,loading:false,status:'',loadedAt:'',page:'overall',scope:'all',contract:'all',player:'',tournament:null};
 const current=t=>!disposed&&t===generation;
 function status(text){state.status=text;const box=root.querySelector('[data-report-status]');if(box)box.textContent=text;}
 function selection(){
  if(!state.facts)return;
  if(state.contract!=='all'&&!state.facts.contracts.some(c=>c.id===state.contract))state.contract='all';
  if(state.page==='patterns'&&state.contract==='all'){
   const scoped=overallResults(state.facts,{scope:state.scope}).games;
   const own=scoped.filter(r=>r.game.players.some(p=>p.id===state.player));
   const counts=new Map();for(const r of own.length?own:scoped)counts.set(r.contract,(counts.get(r.contract)||0)+1);
   state.contract=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||state.facts.contracts[0]?.id||'all';
  }
  const players=overallResults(state.facts,state).players;
  if(!players.some(p=>p.id===state.player))state.player=players.find(p=>p.id===state.user.id)?.id||players[0]?.id||'';
 }
 function chart(){if(state.facts&&state.page==='patterns'&&state.contract!=='all')drawReportChart(root.querySelector('[data-report-chart]'),playerPatterns(state.facts,state.player,state));}
 function draw(){selection();root.innerHTML=state.user?reportPage(state,{homeUrl,studioUrl}):reportGate({configured,emailOtpEnabled,authMode,homeUrl,recoveryUrl,status:state.status});chart();}
 async function refresh(){
  if(!state.user||disposed)return;
  const t=++generation,userId=state.user.id;state.facts=null;state.loading=true;state.status='Reading your accessible saved tables…';draw();
  try{
   const tables=await load({auth,request,userId,isCurrent:()=>current(t)&&state.user?.id===userId});
   if(!current(t))return;
   const facts=reportFacts(userId,tables);state.facts=facts;state.loadedAt=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date());state.status=facts.games.length?'Read-only snapshot loaded. Refresh to include later changes.':'No complete online scorecards were found for your account.';
  }catch(error){if(!current(t))return;if(error instanceof ReportsRetired){account(null);status(error.message);return;}state.status=onlineErrorMessage(error);}
  finally{if(current(t)){state.loading=false;draw();}}
 }
 function account(user,force=false){
  if(disposed)return;
  if(!force&&state.user?.id===user?.id){if(user)state.user=user;return;}
  generation++;clearTimeout(accountTimer);authBusy=false;signingOut=false;state.user=user||null;state.facts=null;state.loading=false;state.status='';state.page='overall';state.scope='all';state.contract='all';state.player=user?.id||'';state.tournament=null;authMode='password';email='';draw();
  if(user){const t=generation;accountTimer=setTimeout(()=>{if(current(t))void refresh();},0);}
 }
 async function signin(form){
  if(authBusy)return;authBusy=true;const mode=authMode;
  const t=generation,fields=new FormData(form);email=String(fields.get('email')||'').trim();
  const password=String(fields.get('password')||''),token=String(fields.get('token')||'');
  form.querySelectorAll('button,input').forEach(e=>e.disabled=true);const privateInput=form.querySelector('[name=password],[name=token]');if(privateInput)privateInput.value='';
  status(authMode==='otp'?'Sending your sign-in code…':'Signing in…');
  try{
   const result=await waitForOnline(mode==='password'?auth.signInWithPassword({email,password}):mode==='verify'?auth.verifyOtp({email,token,type:'email'}):auth.signInWithOtp({email,options:{shouldCreateUser:false}}));
   if(!current(t))return;if(result.error)throw result.error;
   if(mode==='otp'){authMode='verify';state.status='Check your email for the sign-in code.';draw();root.querySelector('[name=email]').value=email;return;}
   const user=result.data?.user||result.data?.session?.user;
   if(!user)throw Error('Sign-in did not return your account. Try again.');account(user);
  }catch(error){if(current(t))status(onlineErrorMessage(error));}
  finally{if(current(t)){authBusy=false;form.querySelectorAll('button,input').forEach(e=>e.disabled=false);}}
 }
 async function signout(){
  if(signingOut||disposed)return;signingOut=true;
  const t=++generation;clearTimeout(accountTimer);state.facts=null;state.loading=true;state.status='Signing out…';draw();
  try{const result=await waitForOnline(auth.signOut());if(!current(t))return;if(result.error)throw result.error;account(null);}
  catch(error){if(current(t)){state.loading=false;state.status=onlineErrorMessage(error);draw();}}
  finally{if(current(t))signingOut=false;}
 }
 function click(event){
  const button=event.target.closest('button');if(!button||disposed||button.disabled)return;
  if(button.dataset.reportAction==='signout'){void signout();return;}
  if(button.dataset.reportAction==='auth-mode'&&emailOtpEnabled&&!authBusy){authMode=authMode==='password'?'otp':'password';state.status='';draw();return;}
  if(button.dataset.reportAction==='refresh'){void refresh();return;}
  if(state.loading||!state.facts)return;
  if(button.dataset.reportPage){state.page=button.dataset.reportPage==='patterns'?'patterns':'overall';draw();root.querySelector(`[data-report-page="${state.page}"]`)?.focus();}
  if(button.dataset.reportPlayer){state.player=button.dataset.reportPlayer;state.page='patterns';draw();root.querySelector('[data-report-filter=player]')?.focus();}
  if(button.dataset.reportTournament){state.tournament=state.tournament===button.dataset.reportTournament?null:button.dataset.reportTournament;draw();[...root.querySelectorAll('[data-report-tournament]')].find(e=>e.dataset.reportTournament===button.dataset.reportTournament)?.focus();}
 }
 function change(event){
  const key=event.target.dataset.reportFilter;
  if(!state.facts||state.loading||!['contract','scope','player'].includes(key))return;
  const value=event.target.value;
  if(key==='scope'&&!['all','tournaments'].includes(value)||key==='contract'&&value!=='all'&&!state.facts.contracts.some(c=>c.id===value)||key==='player'&&!overallResults(state.facts,state).players.some(p=>p.id===value))return;
  state[key]=value;state.tournament=null;draw();root.querySelector(`[data-report-filter="${key}"]`)?.focus();
 }
 function submit(event){if(event.target.dataset.reportForm!=='signin'||disposed)return;event.preventDefault();void signin(event.target);}
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('submit',submit);
 const resize=globalThis.ResizeObserver?new ResizeObserver(entries=>{const width=entries[0]?.contentRect.width;if(width===resizeWidth)return;resizeWidth=width;chart();}):null;resize?.observe(root);
 draw();
 const subscription=configured&&auth?.onAuthStateChange?.((event,session)=>{accountEvents++;account(event==='SIGNED_OUT'?null:session?.user||null,event==='SIGNED_OUT');});
 if(configured&&auth){const initial=accountEvents;void waitForOnline(auth.getSession()).then(result=>{if(disposed||initial!==accountEvents)return;if(result.error)throw result.error;account(result.data?.session?.user||null);}).catch(error=>{if(!disposed&&initial===accountEvents)status(onlineErrorMessage(error));});}
 return()=>{disposed=true;generation++;clearTimeout(accountTimer);resize?.disconnect();state.user=null;state.facts=null;state.status='';email='';subscription?.data?.subscription?.unsubscribe();root.replaceChildren();root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('submit',submit);};
}
