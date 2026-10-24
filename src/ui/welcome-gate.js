export async function askGameCommentary(dialog,preferences){
 if(!preferences.profile.enabled)return false;
 return new Promise(resolve=>{dialog.innerHTML='<h2>Commentary for this game?</h2><p>Your saved voice and humor settings are ready. Player details shared for this game can be used in the jokes.</p><button class="bigbtn score core-primary" type="button" data-launch-choice="yes">'+(preferences.listenerMuted?'Yes · unmute for this game':'Yes · bring the commentator')+'</button><button class="all-scores" type="button" data-launch-choice="no">No · just the game</button>';
  let done=false;const finish=value=>{if(done)return;done=true;dialog.removeEventListener('click',click);dialog.removeEventListener('cancel',cancel);dialog.close();resolve(value);};const click=e=>{const button=e.target.closest('[data-launch-choice]');if(button)finish(button.dataset.launchChoice==='yes');},cancel=e=>{e.preventDefault();finish(false);};dialog.addEventListener('click',click);dialog.addEventListener('cancel',cancel);dialog.showModal();});
}
export function showWelcomeGate({root,session,metadata,onDone,onSkip,timeoutMs=45000}={}){
 root.innerHTML='<main class="launch-progress"><p class="intro-kicker">YOUR TABLE IS COMING ALIVE</p><div class="launch-pulse" aria-hidden="true">⚄</div><h1>Meet your commentator.</h1><p data-launch-state role="status" aria-live="polite">Connecting your saved voice…</p><p data-launch-caption></p><button class="all-scores" type="button" data-launch-skip>Continue without commentary</button></main>';
 let done=false,unsubscribe=()=>{};const status=root.querySelector('[data-launch-state]'),caption=root.querySelector('[data-launch-caption]');
 const finish=(completed,reason='skipped')=>{if(done)return;done=true;clearTimeout(timer);unsubscribe();completed?onDone?.():onSkip?.(reason);};
 const timer=setTimeout(()=>finish(false,'timeout'),timeoutMs);
 root.querySelector('[data-launch-skip]').addEventListener('click',()=>finish(false));
 unsubscribe=session.subscribe(state=>{if(done)return;const value=state.measurement;if(state.playing?.jobId===metadata.jobId||!metadata.jobId&&state.playing){metadata.jobId=state.playing.jobId;caption.textContent=state.playing.caption;status.textContent='Your commentator is getting the microphone ready…';}if(value?.jobId===metadata.jobId){if(value.status==='started')status.textContent='A welcome for your table…';if(value.status==='completed')finish(true);if(['failed','interrupted'].includes(value.status))finish(false,'unavailable');}if(state.error)finish(false,'unavailable');});
 void Promise.resolve().then(()=>done?undefined:session.allowGreeting(metadata)).then(allowed=>{if(allowed===false)finish(false,'unavailable');}).catch(()=>finish(false,'unavailable'));
 return {cancel:()=>finish(false,'cancelled')};
}
