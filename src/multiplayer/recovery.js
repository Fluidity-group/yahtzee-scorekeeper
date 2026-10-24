import { waitForOnline } from './connection.js';

export function isRecoveryUrl(url) {
 const hash=new URLSearchParams(url.hash.slice(1));
 return url.searchParams.has('reset')||hash.get('type')==='recovery'||hash.has('access_token')||hash.has('error')||url.searchParams.has('code');
}
export function recoveryRedirect(webUrl) {
 const url=new URL(webUrl);url.search='';url.hash='';url.searchParams.set('reset','1');return url.href;
}
export async function mountRecovery({root,auth,webUrl,url=new URL(location.href),replaceUrl=value=>history.replaceState(null,'',value)}) {
 const hash=new URLSearchParams(url.hash.slice(1));
 const access=hash.get('access_token'),refresh=hash.get('refresh_token'),code=url.searchParams.get('code');
 const invalid=hash.has('error')||url.searchParams.has('error');
 url.hash='';for(const key of ['code','error','error_code','error_description','access_token','refresh_token','token_hash'])url.searchParams.delete(key);
 url.searchParams.set('reset','1');replaceUrl(url.pathname+url.search);
 let ready=false,busy=false;
 const shell=body=>{root.innerHTML=`<header class="compact-header"><span class="compact-logo">yahtzee<span>.</span></span></header><main class="mp-screen"><h1>Reset your password</h1>${body}<p id="recoveryMessage" role="status" aria-live="polite"></p></main>`;};
 const message=text=>{root.querySelector('#recoveryMessage').textContent=text;};
 const requestScreen=()=>shell('<p>Enter your game-account email to request a fresh reset link.</p><form data-recovery="request"><label>Email<input name="email" type="email" autocomplete="email" required></label><button class="bigbtn score core-primary" type="submit">Send reset link</button></form>');
 const passwordScreen=()=>shell('<p>Choose a new password for your game account.</p><form data-recovery="update"><label>New password<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirm new password<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label><button class="bigbtn score core-primary" type="submit">Save new password</button></form>');
 root.addEventListener('submit',async event=>{
  const form=event.target;if(!form.matches('[data-recovery]'))return;event.preventDefault();if(busy)return;
  const data=new FormData(form),kind=form.dataset.recovery;
  if(kind==='update'&&(!ready||data.get('password')!==data.get('confirm')||String(data.get('password')).length<8)){message(ready?'Use at least 8 characters and make both passwords match.':'Open a fresh reset link first.');return;}
  busy=true;const button=form.querySelector('button');button.disabled=true;message('');
  try{
   if(!auth)throw Error('unconfigured');
   if(kind==='request'){
    const {error}=await waitForOnline(auth.resetPasswordForEmail(String(data.get('email')).trim(),{redirectTo:recoveryRedirect(webUrl)}));if(error)throw error;
    message('If that email has a game account, a reset link has been sent. Check your inbox and spam folder.');
   }else{
    const {error}=await waitForOnline(auth.updateUser({password:String(data.get('password'))}));if(error)throw error;
    ready=false;form.reset();shell('<p>Your password has been updated. Use it to sign in on Android or join your game.</p><a class="bigbtn score core-primary" href="./">Continue to the game</a>');
   }
  }catch{message(kind==='request'?'Could not send the reset email. Check your connection and try again.':'Could not update your password. Try again, or open a fresh reset link.');}
  finally{busy=false;button.disabled=false;}
 });
 shell('<p>Checking your reset link…</p>');
 if(!auth||invalid||(!code&&!(hash.get('type')==='recovery'&&access&&refresh))){requestScreen();if(invalid||access||refresh)message('This reset link is invalid or expired. Request a fresh link.');return;}
 try{
  const result=await waitForOnline(code?auth.exchangeCodeForSession(code):auth.setSession({access_token:access,refresh_token:refresh}));
  if(result.error||!result.data?.session?.user)throw Error('invalid recovery');
  ready=true;passwordScreen();
 }catch{requestScreen();message('This reset link is invalid or expired. Request a fresh link.');}
}
