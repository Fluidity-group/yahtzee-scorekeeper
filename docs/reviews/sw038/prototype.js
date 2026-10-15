// SW038 is a self-contained visual playtest. No storage, live service or scoring authority.
const $=id=>document.getElementById(id);
const svg=body=>`<svg viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;
const pips={1:[[16,16]],2:[[10,10],[22,22]],3:[[10,10],[16,16],[22,22]],4:[[10,10],[22,10],[10,22],[22,22]],5:[[10,10],[22,10],[16,16],[10,22],[22,22]],6:[[10,9],[22,9],[10,16],[22,16],[10,23],[22,23]]};
const die=n=>svg(`<rect x="3" y="3" width="26" height="26" rx="6"/>${(pips[n]||[]).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.65" fill="currentColor" stroke="none"/>`).join('')}`);
const icons={
 brand:svg('<path d="m16 2 12 7v14l-12 7-12-7V9Z"/><path d="m4 9 12 7 12-7M16 16v14"/><circle cx="16" cy="9" r="1.4" fill="currentColor"/><circle cx="10" cy="20" r="1.3" fill="currentColor"/><circle cx="22" cy="20" r="1.3" fill="currentColor"/>'),
 dice:die(5),people:svg('<circle cx="11" cy="11" r="4"/><path d="M3 27v-3a8 8 0 0 1 16 0v3M22 7a4 4 0 0 1 0 8m2 5a7 7 0 0 1 5 7"/>'),
 globe:svg('<circle cx="16" cy="16" r="12"/><ellipse cx="16" cy="16" rx="5" ry="12"/><path d="M4 16h24M7 8h18M7 24h18"/>'),
 trophy:svg('<path d="M9 4h14v8a7 7 0 0 1-14 0ZM9 7H4v5a5 5 0 0 0 6 5m13-10h5v5a5 5 0 0 1-6 5M16 19v7m-7 2h14m-13-2h12"/>'),
 house:svg('<path d="m3 15 13-11 13 11M7 13v15h18V13M13 28v-9h6v9M23 9V4h3v8"/><circle cx="16" cy="13" r="2"/>'),
 spark:svg('<path d="m16 3 3.2 9.8L29 16l-9.8 3.2L16 29l-3.2-9.8L3 16l9.8-3.2ZM26 3v5m-2.5-2.5h5"/>'),
 sound:svg('<path d="M5 12h5l7-6v20l-7-6H5ZM22 11a8 8 0 0 1 0 10m4-14a14 14 0 0 1 0 18"/>'),
 mute:svg('<path d="M5 12h5l7-6v20l-7-6H5ZM23 12l7 8m0-8-7 8"/>'),
 menu:svg('<path d="M5 10h22M11 16h16M5 22h22"/>'),close:svg('<path d="m8 8 16 16M24 8 8 24"/>'),
 play:svg('<path d="m11 6 15 10-15 10Z"/>'),stop:svg('<rect x="8" y="8" width="16" height="16" rx="2"/>'),
 undo:svg('<path d="m11 7-7 7 7 7M4 14h15a8 8 0 0 1 0 16"/>'),
 like:svg('<path d="M11 14 17 3c5 0 3 7 2 10h8c2 0 3 2 2 4l-3 10H11ZM4 14h7v14H4Z"/>'),
 dislike:svg('<g transform="translate(0 32) scale(1 -1)"><path d="M11 14 17 3c5 0 3 7 2 10h8c2 0 3 2 2 4l-3 10H11ZM4 14h7v14H4Z"/></g>'),
 moon:svg('<path d="M26 21A12 12 0 0 1 11 5a12 12 0 1 0 15 16Z"/><path d="m23 4 1.3 4L28 9.2l-3.7 1.3-1.3 4-1.3-4L18 9.2 21.7 8Z"/>'),
 three:svg('<rect x="2" y="11" width="12" height="12" rx="3"/><rect x="10" y="6" width="12" height="12" rx="3"/><rect x="18" y="11" width="12" height="12" rx="3"/>'),
 four:svg('<path d="M4 5h10v10H4zM18 5h10v10H18zM4 19h10v10H4zM18 19h10v10H18z"/>'),
 straight:svg('<path d="M3 26V15h7v11m2 0V10h7v16m2 0V4h8v22M2 29h28"/>'),
 chance:svg('<path d="m16 3 3 8 9 1-7 6 2 10-7-5-8 5 2-10-7-6 10-1Z"/>')
};
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icons[el.dataset.icon]||icons.dice;});
const categories=[
 {key:'aces',name:'Aces',face:1,note:'Count the ones',peer:3},
 {key:'twos',name:'Twos',face:2,note:'Count the twos',peer:null},
 {key:'threes',name:'Threes',face:3,note:'Count the threes',peer:9},
 {key:'fours',name:'Fours',face:4,note:'Count the fours',peer:null},
 {key:'fives',name:'Fives',face:5,note:'Count the fives',peer:15},
 {key:'sixes',name:'Sixes',face:6,note:'Count the sixes',peer:null},
 {key:'threeKind',name:'Three of a kind',symbol:'three',note:'Total of all five dice',peer:22},
 {key:'fourKind',name:'Four of a kind',symbol:'four',note:'Total of all five dice',peer:null},
 {key:'fullHouse',name:'Full House',symbol:'house',fixed:25,note:'Three of one. Two of another.',peer:25},
 {key:'smallStraight',name:'Small straight',symbol:'straight',fixed:30,note:'Four in a row',peer:null},
 {key:'largeStraight',name:'Large straight',symbol:'straight',fixed:40,note:'Five in a row',peer:null},
 {key:'yahtzee',name:'Yahtzee',symbol:'spark',fixed:50,note:'Five of a kind. One big moment.',peer:null},
 {key:'chance',name:'Chance',symbol:'chance',note:'Make the most of what you have',peer:null}
];
const modes={local:{label:'SHARED PHONE',title:'Set the mood.',description:'A table for Alex and Sam. One phone. Plenty to say.'},solo:{label:'SOLO SESSION',title:'A little me time.',description:'Your scorecard, your pace. Rachel supplies the company.'},online:{label:'ONLINE TABLE · VISUAL PREVIEW',title:'Your people, anywhere.',description:'Preview the online table with fictional Alex and Sam. No connection is made.'},tournament:{label:'TOURNAMENT · VISUAL PREVIEW',title:'Make a night of it.',description:'The After Hours Cup · game one. A fictional table for the visual review.'}};
const welcomeCaption="Welcome to Dice Clubhouse, Alex and Sam. Alex's staplers are alphabetized, which means even the hostile takeover has a filing system.";
let mode='local',scores={},history=[],entry=null,chosen=0,numberString='',masterSound=true,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let tableName='The After Hours Club',voiceAtTable=true,currentRemark={kind:'intro'},rating=null,totalAnimation=0,celebrationTimer=0,toastTimer=0,particleFrame=0,audioGeneration=0;
let currentAudio=null,audioContext=null,masterGain=null,voicePlaying=false,screen='home',waitingRemark=null;
const appDialogs=[...document.querySelectorAll('dialog')];
function closeDialogs(){appDialogs.forEach(d=>{if(d.open)d.close();});}
function openDialog(id){closeDialogs();$(id).showModal();}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
appDialogs.forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2700);}
function setReduced(value){reduced=value||matchMedia('(prefers-reduced-motion: reduce)').matches;value=reduced;document.body.dataset.reduced=String(value);$('reduced-motion').checked=value;if(value)clearCelebration();}
setReduced(reduced);matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>setReduced(e.matches));

function initializeSound(){
 if(!masterSound)return;
 try{if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();masterGain=audioContext.createGain();masterGain.gain.value=.18;masterGain.connect(audioContext.destination);}if(audioContext.state==='suspended')void audioContext.resume();}catch{/* Silent browsers remain fully playable. */}
}
function note(frequency,at,duration,gain=.2,type='sine'){
 if(!masterSound||!audioContext||audioContext.state!=='running')return;
 const now=audioContext.currentTime+at,o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(frequency,now);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(gain,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(masterGain);o.start(now);o.stop(now+duration+.02);
}
function sound(kind='tap'){
 initializeSound();if(!masterSound)return;
 if(masterGain&&audioContext)masterGain.gain.setTargetAtTime(voicePlaying?.055:.18,audioContext.currentTime,.02);
 if(kind==='tap'){note(420,0,.09,.16);note(170,0,.08,.18);return;}
 if(kind==='undo'){note(330,0,.15,.17);note(247,.08,.2,.13);return;}
 if(kind==='zero'){note(196,0,.22,.13);note(147,.08,.25,.1);return;}
 if(kind==='yahtzee'){[392,494,587,784,988].forEach((n,i)=>note(n,i*.075,.6,.19));note(196,0,.8,.12);return;}
 if(kind==='fullHouse'){[349,440,523,698].forEach((n,i)=>note(n,i*.065,.42,.17));return;}
 note(330,0,.22,.15);note(440,.045,.28,.15);note(659,.09,.3,.12);
}
function haptic(){if(!reduced)try{navigator.vibrate?.(8);}catch{}}
function speaking(value){voicePlaying=value;document.body.classList.toggle('speaking',value);$('rachel-status').textContent=value?'Speaking · recorded welcome':'Ready for your next move';$('home-audio-status').textContent=value?'Rachel is speaking…':'';$('home-listen').setAttribute('aria-label',value?'Stop Rachel’s recorded welcome':'Hear Rachel’s recorded welcome');if(masterGain&&audioContext)masterGain.gain.setTargetAtTime(value?.055:.18,audioContext.currentTime,.03);}
function stopVoice(){audioGeneration++;waitingRemark=null;if(currentAudio){currentAudio.pause();currentAudio.removeAttribute('src');currentAudio.load();currentAudio=null;}speaking(false);}
function setMaster(value){masterSound=value;$('settings-sound').checked=value;$('setup-sound').checked=value;$('sound-toggle').innerHTML=icons[value?'sound':'mute'];$('sound-toggle').setAttribute('aria-label',value?'Mute sound':'Enable sound');$('sound-toggle').setAttribute('aria-pressed',String(!value));if(!value){stopVoice();if(audioContext)void audioContext.suspend();if(!$('welcome-screen').hidden)showGame();}else initializeSound();}
function showRemark(remark){currentRemark=remark;rating=null;$('like').setAttribute('aria-pressed','false');$('dislike').setAttribute('aria-pressed','false');$('feedback-label').textContent='How did that land?';renderRemark();}
function writtenQuip(remark){
 if(remark.kind==='intro')return 'Take a seat, Alex. Your dignity can wait outside.';
 const cat=categories.find(c=>c.key===remark.key),value=remark.value,style=$('humor').value,swear=$('profanity').checked;
 if(style==='playful')return value===0?'A zero. Minimalism is having quite a year.':cat.key==='yahtzee'?'Fifty points. A very convincing argument for one more game.':`${value} points. A little luck looks rather good on you, Alex.`;
 if(value===0)return style==='dark'?'Zero. Even your midlife crisis is underperforming.':'Zero. A bold commitment to keeping expectations manageable.';
 if(cat.key==='fullHouse')return style==='dark'?`A full house, Alex. Alphabetize that. It’s the closest you’ll get to getting your ${swear?'shit':'life'} together.`:'A full house. Finally, a household where everyone agrees with you.';
 if(cat.key==='yahtzee')return style==='dark'?(swear?'Fifty. Finally, five things agree you’re not completely fucked.':'Fifty. Finally, five things in your life agree on something.'):'Yahtzee. Enjoy the applause; it gets quieter when you talk.';
 if(cat.key==='largeStraight')return 'Forty points. Something in this room finally has a direction.';
 if(cat.key==='smallStraight')return 'Thirty. A promising start to the personality you keep threatening to develop.';
 if(cat.key==='threeKind'||cat.key==='fourKind')return `${value} points. More commitment than your last relationship.`;
 if(cat.key==='chance')return `${value} points. Try not to make it your entire personality.`;
 return style==='dark'?`${value} points, Alex. Put it in a spreadsheet. Somewhere between “regrets” and “things that almost worked”.`:`${value} points. A respectable number. The confidence is still wildly disproportionate.`;
}
function renderRemark(){
 const recorded=currentRemark.kind==='welcome';$('quip-kind').textContent=recorded?'RACHEL · RECORDED WELCOME':currentRemark.kind==='score'?'RACHEL · QUIP PREVIEW':'FROM YOUR HOST';
 $('quip-text').textContent=`“${recorded?welcomeCaption:writtenQuip(currentRemark)}”`;
 $('quip-footnote').textContent=recorded?'Actual Rachel audio · ratings stay in this visit':'Caption sketch · tap play for the recorded welcome';
}
async function playWelcome({gate=false}={}){
 if(!masterSound){if(gate)showGame();else toast('Enable sound to hear Rachel.');return;}
 stopVoice();const ticket=audioGeneration;const audio=new Audio('./assets/rachel-welcome.mp3');currentAudio=audio;audio.volume=.9;audio.preload='auto';
 showRemark({kind:'welcome'});
 const finish=()=>{if(ticket!==audioGeneration)return;const next=waitingRemark;waitingRemark=null;currentAudio=null;speaking(false);if(gate)showGame();if(next)showRemark(next);};
 audio.addEventListener('playing',()=>{if(ticket!==audioGeneration)return;speaking(true);if(gate)$('welcome-state').textContent='Rachel is welcoming Alex and Sam…';});
 audio.addEventListener('ended',finish,{once:true});audio.addEventListener('error',()=>{if(ticket!==audioGeneration)return;finish();toast('Voice sample could not play. You can keep scoring.');},{once:true});
 try{await audio.play();}catch{if(ticket!==audioGeneration)return;currentAudio=null;speaking(false);if(gate){$('welcome-state').textContent='Voice playback needs another tap. Continue to the table anytime.';}else toast('Tap the play button again to enable this browser’s audio.');}
}
$('sound-toggle').addEventListener('click',()=>{setMaster(!masterSound);if(masterSound)sound('tap');});
$('settings-sound').addEventListener('change',e=>setMaster(e.target.checked));
$('home-listen').addEventListener('click',()=>{if(voicePlaying){stopVoice();return;}if(!masterSound)setMaster(true);void playWelcome();});
$('replay-welcome').addEventListener('click',()=>{if(voicePlaying)stopVoice();else void playWelcome();});
$('settings-open').addEventListener('click',()=>{sound('tap');openDialog('settings-dialog');});
$('settings-done').addEventListener('click',()=>{$('settings-dialog').close();sound('tap');toast('Your kind of evening.');});
$('review-open').addEventListener('click',()=>openDialog('about-dialog'));
$('reduced-motion').addEventListener('change',e=>setReduced(e.target.checked));
for(const id of ['humor','profanity'])$(id).addEventListener('change',()=>{renderRemark();sound('tap');});
for(const [id,value]of [['like','like'],['dislike','dislike']])$(id).addEventListener('click',()=>{rating=rating===value?null:value;$('like').setAttribute('aria-pressed',String(rating==='like'));$('dislike').setAttribute('aria-pressed',String(rating==='dislike'));$('feedback-label').textContent=rating?'Noted for this playtest.':'How did that land?';sound('tap');});

function clearCelebration(){clearTimeout(celebrationTimer);$('celebration').hidden=true;cancelAnimationFrame(particleFrame);particleFrame=0;const ctx=$('particles').getContext('2d');if(ctx)ctx.clearRect(0,0,$('particles').width,$('particles').height);}
function showHome(){stopVoice();clearCelebration();closeDialogs();$('welcome-screen').hidden=true;screen='home';$('game-screen').hidden=true;$('home-screen').hidden=false;scrollTo({top:0,behavior:'instant'});}
$('brand-home').addEventListener('click',showHome);document.querySelectorAll('[data-home]').forEach(b=>b.addEventListener('click',showHome));
function openSetup(nextMode){mode=nextMode;const m=modes[mode];$('setup-mode').textContent=m.label;$('setup-title').textContent=m.title;$('setup-description').textContent=m.description;$('setup-voice').checked=voiceAtTable;$('setup-sound').checked=masterSound;$('start-table').firstChild.textContent=mode==='online'||mode==='tournament'?'Preview this table ':'Take a seat ';sound('tap');openDialog('setup-dialog');}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>openSetup(b.dataset.mode)));
function showGame(){stopVoice();$('welcome-screen').hidden=true;screen='game';$('home-screen').hidden=true;$('game-screen').hidden=false;$('table-title').textContent=tableName;$('mode-label').textContent=modes[mode].label+' · '+(mode==='tournament'?'GAME 1 OF 3':'PLAYTEST');$('peer-head').hidden=mode==='solo';$('peer-total').hidden=mode==='solo';document.querySelectorAll('.peer-score').forEach(el=>el.hidden=mode==='solo');if(currentRemark.kind!=='welcome')showRemark({kind:'intro'});scrollTo({top:0,behavior:'instant'});}
$('start-table').addEventListener('click',()=>{
 tableName=$('table-name').value.trim()||'The After Hours Club';voiceAtTable=$('setup-voice').checked;setMaster($('setup-sound').checked);initializeSound();scores={};history=[];renderScores(true);showRemark({kind:'intro'});closeDialogs();sound('tap');
 if(voiceAtTable&&masterSound){screen='welcome';$('home-screen').hidden=true;$('game-screen').hidden=true;$('welcome-screen').hidden=false;$('welcome-state').textContent='Your host has a few opening remarks.';$('continue-table').focus();void playWelcome({gate:true});}else showGame();
});
$('continue-table').addEventListener('click',showGame);
$('table-info').addEventListener('click',()=>{toast(mode==='solo'?'Alex · solo preview. Scores stay in this visit.':'Alex · your frames. Sam · illustrative opponent scores.');});

function totals(){const upper=categories.filter(c=>c.face).reduce((s,c)=>s+(scores[c.key]??0),0);return {upper,bonus:upper>=63?35:0,total:Object.values(scores).reduce((s,n)=>s+n,0)+(upper>=63?35:0)};}
function animateTotal(value,instant=false){cancelAnimationFrame(totalAnimation);const el=$('total'),from=Number(el.textContent)||0;if(instant||reduced){el.textContent=String(value).padStart(2,'0');return;}const start=performance.now();const frame=now=>{const p=Math.min(1,(now-start)/500);el.textContent=String(Math.round(from+(value-from)*(1-(1-p)**3))).padStart(2,'0');if(p<1)totalAnimation=requestAnimationFrame(frame);};totalAnimation=requestAnimationFrame(frame);}
function renderScores(instant=false){
 $('score-rows').innerHTML=categories.map(c=>`<div class="score-row${c.key==='threeKind'?' section-start':''}" data-row="${c.key}"><span class="category-label"><span class="category-symbol">${c.face?die(c.face):icons[c.symbol]}</span><span><b>${c.name}</b><small>${c.note}</small></span></span><button class="score-frame${scores[c.key]!==undefined?' filled':''}${['fullHouse','yahtzee'].includes(c.key)?' featured-frame':''}" data-category="${c.key}" aria-label="${scores[c.key]!==undefined?'Edit':'Score'} ${c.name}${scores[c.key]!==undefined?`, ${scores[c.key]} points`:''}">${scores[c.key]??'+'}</button><span class="peer-score"${mode==='solo'?' hidden':''} aria-label="Sam ${c.name}: ${c.peer??'not scored'}">${c.peer??'—'}</span></div>`).join('');
 const sum=totals();animateTotal(sum.total,instant);const used=Object.keys(scores).length;$('frames-used').textContent=used;$('progress-arc').style.strokeDashoffset=String(169.65*(1-used/13));$('bonus-progress').textContent=sum.bonus?'Unlocked · a little extra class':`${sum.upper} / 63 to unlock`;$('bonus-value').classList.toggle('unlocked',!!sum.bonus);$('undo').disabled=!history.length;
 document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>openEntry(b.dataset.category)));
}
function updateChosen(value){chosen=Math.min(30,Math.max(0,Number(value)||0));if(entry?.face)chosen=Math.min(5*entry.face,Math.max(0,Number(value)||0));if(entry?.fixed)chosen=Number(value)===entry.fixed?entry.fixed:0;$('entry-value').textContent=chosen;document.querySelectorAll('.pick[data-value]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.value)===chosen)));}
function openEntry(key){
 entry=categories.find(c=>c.key===key);if(!entry)return;$('entry-error').textContent='';if(!$('welcome-screen').hidden)showGame();clearCelebration();const editing=scores[key]!==undefined;
 $('entry-title').textContent=entry.name;$('entry-icon').innerHTML=entry.face?die(entry.face):icons[entry.symbol];$('entry-hint').textContent=entry.face?`How many ${entry.name.toLowerCase()} did you keep?`:entry.fixed?'Choose the combination, or take a zero.':'Add the total of all five dice. Use 0–30.';$('save-score').firstChild.textContent=editing?'Update this frame ':'Make it count ';$('entry-note').textContent=editing?'An edit stays quiet. Your latest change can be undone.':'A little ceremony. Your next move is always yours.';
 if(entry.face){$('entry-controls').innerHTML=`<div class="count-picker" aria-label="Number of matching dice">${Array.from({length:6},(_,n)=>`<button class="pick" data-value="${n*entry.face}" aria-label="${n} matching dice, ${n*entry.face} points" aria-pressed="false">${n?die(entry.face):'<span>0</span>'}<small>${n} ${n===1?'die':'dice'} · ${n*entry.face} pts</small></button>`).join('')}</div>`;}
 else if(entry.fixed){$('entry-controls').innerHTML=`<div class="fixed-picker"><button class="pick" data-value="0" aria-pressed="false">0<small>NO COMBINATION</small></button><button class="pick" data-value="${entry.fixed}" aria-pressed="false">${entry.fixed}<small>THAT’S THE ONE</small></button></div>`;}
 else{$('entry-controls').innerHTML=`<div class="number-pad" aria-label="Score keypad">${[1,2,3,4,5,6,7,8,9,'clear',0,'back'].map(n=>`<button data-number="${n}" aria-label="${n==='back'?'Delete last digit':n==='clear'?'Clear entered total':`Digit ${n}`}">${n==='back'?'⌫':n==='clear'?'C':n}</button>`).join('')}</div>`;}
 document.querySelectorAll('.pick[data-value]').forEach(b=>b.addEventListener('click',()=>{updateChosen(b.dataset.value);sound('tap');}));
 document.querySelectorAll('[data-number]').forEach(b=>b.addEventListener('click',()=>{const n=b.dataset.number;$('entry-error').textContent='';if(n==='clear')numberString='';else if(n==='back')numberString=numberString.slice(0,-1);else{const candidate=(numberString==='0'?'':numberString)+n;if(Number(candidate)>30||candidate.length>2){$('entry-error').textContent='Five dice. Thirty points maximum.';return;}numberString=candidate;}updateChosen(numberString);sound('tap');}));
 numberString=editing?String(scores[key]):'';updateChosen(editing?scores[key]:entry.fixed||0);sound('tap');openDialog('score-dialog');
}
document.querySelectorAll('[data-try]').forEach(b=>b.addEventListener('click',()=>openEntry(b.dataset.try)));
function particles(kind){
 if(reduced)return;cancelAnimationFrame(particleFrame);const canvas=$('particles'),ctx=canvas.getContext('2d');if(!ctx)return;const dpr=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);const start=performance.now(),colors=['#e3c38b','#f9e4b9','#a2e6c5','#b49bc7'];const count=kind==='yahtzee'?85:48;
 const bits=Array.from({length:count},(_,i)=>{const angle=Math.random()*Math.PI*2,speed=2+Math.random()*7;return {x:w*.5,y:h*.47,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-3,size:2+Math.random()*4,color:colors[i%4],rotation:Math.random()*Math.PI};});
 let last=start;function frame(now){const elapsed=now-start,step=Math.min(2,(now-last)/16.67);last=now;ctx.clearRect(0,0,w,h);for(const p of bits){p.x+=p.vx*step;p.y+=p.vy*step;p.vy+=.11*step;p.rotation+=.035*step;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.globalAlpha=Math.max(0,1-elapsed/1500);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.5);ctx.restore();}if(elapsed<1500)particleFrame=requestAnimationFrame(frame);else{ctx.clearRect(0,0,w,h);particleFrame=0;}}particleFrame=requestAnimationFrame(frame);
}
function celebrate(cat,value){
 if(value===0||!['fullHouse','yahtzee','largeStraight'].includes(cat.key)||reduced)return;
 clearCelebration();$('celebration-icon').innerHTML=icons[cat.symbol];$('celebration-kicker').textContent=cat.key==='yahtzee'?'FIVE OF A KIND. ONE BEAUTIFUL MOMENT.':cat.key==='fullHouse'?'A LITTLE HOUSE MAGIC':'A VERY GOOD DIRECTION';$('celebration-title').textContent=cat.name;$('celebration-points').textContent=`+${value}`;$('celebration').hidden=false;particles(cat.key);celebrationTimer=setTimeout(()=>{$('celebration').hidden=true;},1900);
}
function saveScore(value){
 if(!entry)return;const cat=entry,editing=scores[cat.key]!==undefined;
 history.push({scores:{...scores},remark:{...currentRemark},rating});scores[cat.key]=value;$('score-dialog').close();renderScores();const remark={kind:'score',key:cat.key,value};if(voicePlaying){waitingRemark=remark;$('quip-footnote').textContent='Rachel’s recorded welcome is speaking · next caption preview ready';}else showRemark(remark);
 const frame=document.querySelector(`[data-category="${cat.key}"]`),row=frame.closest('.score-row');row.classList.add('just-scored');setTimeout(()=>row.classList.remove('just-scored'),1100);
 if(!reduced)frame.animate([{transform:'scale(.86)'},{transform:'scale(1.12)',offset:.6},{transform:'scale(1)'}],{duration:440,easing:'cubic-bezier(.2,.8,.25,1)'});
 if(!editing){celebrate(cat,value);sound(value===0?'zero':cat.key==='fullHouse'?'fullHouse':cat.key==='yahtzee'?'yahtzee':'score');}else sound('tap');
 haptic();const sum=totals();$('score-announcement').textContent=`${cat.name}: ${value} points ${editing?'updated':'saved'}. Alex’s total is ${sum.total}.`;toast(`${cat.name} · ${value} points${editing?' updated':''}`);frame.focus({preventScroll:true});entry=null;
}
$('save-score').addEventListener('click',()=>saveScore(chosen));$('score-zero').addEventListener('click',()=>saveScore(0));
$('undo').addEventListener('click',()=>{const previous=history.pop();if(!previous)return;stopVoice();clearCelebration();scores=previous.scores;renderScores();showRemark(previous.remark);rating=previous.rating;$('like').setAttribute('aria-pressed',String(rating==='like'));$('dislike').setAttribute('aria-pressed',String(rating==='dislike'));sound('undo');$('score-announcement').textContent=`Last score undone. Alex’s total is ${totals().total}.`;toast('Last score undone. Back to your next move.');});
$('reset-demo').addEventListener('click',()=>{stopVoice();clearCelebration();scores={};history=[];renderScores(true);showRemark({kind:'intro'});toast('A fresh table. Same questionable company.');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopVoice();clearCelebration();if(!$('welcome-screen').hidden)showGame();}});
window.addEventListener('pagehide',stopVoice);
renderScores(true);renderRemark();


