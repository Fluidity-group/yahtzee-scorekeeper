/* Standalone design lab. Fictional state only: no storage, accounts or network calls. */
const names={rally:'Rally',night:'Night Match',playform:'Playform'};
const states=Object.fromEntries(Object.keys(names).map(id=>[id,{score:null,generation:0,race:[]}])) ;
const $=id=>document.getElementById(id);
let selected=null,raceSelected='rally',audio=null;
const systemQuiet=matchMedia('(prefers-reduced-motion: reduce)');
const quiet=()=>systemQuiet.matches||$('quiet').checked||$('phoneQuiet').checked;
function applyQuiet(source){$('quiet').checked=source.checked;$('phoneQuiet').checked=source.checked;document.documentElement.dataset.quiet=String(source.checked);if(source.checked){document.getAnimations().forEach(a=>a.cancel());document.querySelectorAll('.floating-points,.point-burst').forEach(e=>e.remove());Object.keys(states).forEach(id=>{states[id].generation++;document.querySelector(`[data-total="${id}"]`).textContent=totals(states[id]).total;});}}
$('quiet').onchange=e=>applyQuiet(e.target);$('phoneQuiet').onchange=e=>applyQuiet(e.target);
const phone=new URLSearchParams(location.search).get('phone');
if(phone&&names[phone]){document.documentElement.dataset.phone=phone;$('previewName').textContent=names[phone];}
function totals(state){const upper=39+(state.score??0),bonus=upper>=63?35:0;return{upper,bonus,total:121+upper+bonus};}
function ticks(n){return `<span class="dice-ticks" role="img" aria-label="${n===null?'Open':n+' matching dice'}; three is the pace benchmark">${[1,2,3,4].map(j=>`<i class="${n!==null&&n>=j?'filled'+(j===4?' surplus':''):''}"></i>`).join('')}</span>`;}
function update(id){
 const state=states[id],p=$(id),t=totals(state),gap=t.total-208;
 document.querySelector(`[data-rows="${id}"]`).innerHTML=[['Threes',3,9,1],['Fours',12,12,3],['Fives',15,15,3],['Sixes',state.score,null,state.score===null?null:state.score/6]].map(([label,value,peer,count])=>`<div class="score-row" data-key="${label.toLowerCase()}"><span class="row-label">${label}${ticks(count)}</span>${label==='Sixes'?`<button type="button" class="value ${value===null?'open':value===0?'scratch':''}" data-enter="${id}" aria-label="${value===null?'Score':'Change last score in'} Sixes in ${names[id]}">${value===null?'+':value===0?'<span><b>0</b><small>SCRATCH</small></span>':value}</button>`:`<span class="value">${value}</span>`}<span class="peer-value">${peer??'—'}</span></div>`).join('');
 document.querySelector(`[data-enter="${id}"]`).onclick=()=>openScore(id);
 document.querySelector(`[data-total="${id}"]`).textContent=t.total;
 document.querySelector(`[data-upper="${id}"]`).textContent=t.upper+' / 63';
 document.querySelector(`[data-gap="${id}"]`).textContent=gap===0?'Level':Math.abs(gap)+(gap>0?' ahead':' behind');
 document.querySelector(`[data-bonus="${id}"]`).textContent=t.bonus?'Bonus secured +35':id==='rally'?'+35 at 63':Math.max(0,63-t.upper)+' more to secure +35';
 const fill=p.querySelector('[data-fill]');if(fill)fill.style.width=Math.min(100,t.upper/63*100)+'%';
 const ring=p.querySelector('[data-ring]');if(ring)ring.style.strokeDasharray=Math.min(100,t.upper/63*100)+' 100';
 const lane=p.querySelector('[data-lane]');if(lane){const ceiling=Math.max(t.total,208);lane.style.width=t.total/ceiling*100+'%';p.querySelector('.gap-lanes>div:last-child i').style.width=208/ceiling*100+'%';}
 if(id==='playform'){p.querySelector('.geo.tile').textContent=state.score===null?'•••':state.score;p.querySelector('.geo.disc').textContent=t.bonus?'+35':'+';}
 p.classList.toggle('bonus-secured',!!t.bonus);p.classList.toggle('leader',gap>0);
 const banner=document.querySelector(`[data-banner="${id}"]`);
 banner.textContent=state.score===null?(id==='rally'?'Your move. Make it count.':id==='night'?'Every frame can change the chase.':'A little extra changes everything.'):state.score===0?'Scratch recorded. The next frame is a fresh chance.':gap>0?'Keith takes the lead.':gap===0?'All square. The next score matters.':'Keep the chase moving.';
 updateRaceChip(id);
}
function openScore(id){selected=id;$('scoreConcept').textContent=names[id];$('undoScore').hidden=states[id].score===null;$('scoreDialog').showModal();}
$('closeScore').onclick=()=>$('scoreDialog').close();
// Keep accepted numbers exact throughout motion: interpolation must not show a
// losing total alongside a newly accepted lead label. The number lands via CSS.
function settleTotal(id,to){document.querySelector(`[data-total="${id}"]`).textContent=to;}
function pointsFlight(id,points){
 if(quiet()||!Element.prototype.animate)return;
 const p=$(id),source=p.querySelector('[data-key="sixes"] .value').getBoundingClientRect(),target=p.querySelector('[data-total]').getBoundingClientRect();
 if(source.top>innerHeight||source.bottom<0||target.top>innerHeight||target.bottom<0)return;
 const e=document.createElement('span');e.className='floating-points';e.textContent='+'+points;e.style.left=source.left+source.width/2-24+'px';e.style.top=source.top+'px';e.style.color=getComputedStyle(p).getPropertyValue('--own-ink');document.body.append(e);
 const a=e.animate([{transform:'translate(0,0) scale(.9)',opacity:0},{offset:.2,opacity:1},{transform:`translate(${target.left+target.width/2-source.left-source.width/2}px,${target.top-source.top}px) scale(.65)`,opacity:0}],{duration:560,easing:'cubic-bezier(.2,.7,.3,1)'});a.finished.catch(()=>{}).finally(()=>e.remove());
}
function burst(id){
 if(quiet()||!Element.prototype.animate)return;
 const p=$(id),el=document.createElement('span');el.className='point-burst';el.setAttribute('aria-hidden','true');
 for(let i=0;i<10;i++){const shard=document.createElement('i');el.append(shard);const angle=(i/10)*Math.PI*2,dx=Math.cos(angle)*100,dy=Math.sin(angle)*62;shard.animate([{transform:'translate(0,0) rotate(0deg)',opacity:0},{offset:.1,opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${i*35}deg)`,opacity:0}],{duration:760,delay:120,easing:'cubic-bezier(.15,.6,.4,1)'});}
 p.append(el);setTimeout(()=>el.remove(),1000);
}
function tone(bonus){
 if(!$('sound').checked)return;
 try{audio??=new(window.AudioContext||window.webkitAudioContext)();void audio.resume();[440,bonus?660:540,...(bonus?[880]:[])].forEach((freq,i)=>{const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+i*.085;o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.025,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+.12);o.connect(g);g.connect(audio.destination);o.start(at);o.stop(at+.13);});}catch{/* Visual play remains available when audio is unavailable. */}
}
function saveScore(id,value,{sound=true}={}){
 const state=states[id];state.score=value;state.generation++;const p=$(id);p.classList.remove('scored');update(id);void p.offsetWidth;p.classList.add('scored');const t=totals(state);p.querySelector('[data-total]').classList.remove('score-land');void p.offsetWidth;p.querySelector('[data-total]').classList.add('score-land');settleTotal(id,t.total);pointsFlight(id,value);if(t.bonus)burst(id);if(sound)tone(!!t.bonus);
 document.querySelector(`[data-caption="${id}"]`).textContent=value===0?'0 / Scratch. Tap the filled frame to Undo.':t.bonus?'24 scored + 35 bonus = 219. Keith now leads by 11.':'18 scored. Upper 57 / 63. Keith trails by 30.';
}
document.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>{const id=selected;$('scoreDialog').close();if(id)saveScore(id,Number(b.dataset.score));});
$('undoScore').onclick=()=>{if(!selected)return;const id=selected;states[id].score=null;states[id].generation++;$(id).classList.remove('scored');update(id);document.querySelector(`[data-caption="${id}"]`).textContent='Last score undone. Sixes is open again; bonus and lead reverted.';$('scoreDialog').close();};
$('playMoment').onclick=()=>{$('concepts').scrollIntoView({block:'start',behavior:'auto'});Object.keys(states).forEach((id,i)=>saveScore(id,24,{sound:i===0}));};
$('resetAll').onclick=()=>Object.keys(states).forEach(id=>{states[id].score=null;states[id].generation++;states[id].race=[];$(id).classList.remove('scored');update(id);document.querySelector(`[data-caption="${id}"]`).textContent='Tap Sixes. Four matching dice secures the bonus.';});
document.querySelectorAll('[data-facts]').forEach(b=>b.onclick=()=>{const state=states[b.dataset.facts],t=totals(state);$('factsText').textContent=`Fictional upper section: Aces 3, Twos 6, Threes 3, Fours 12, Fives 15${state.score===null?', Sixes open':', Sixes '+state.score}. Upper subtotal ${t.upper}; bonus ${t.bonus}; lower subtotal 121; total ${t.total}. Amber has 208. Threes is 6 points below the three-of-each benchmark; four Sixes supplies the missing 6. No dice probability or live game result is inferred.`;$('factsDialog').showModal();});
$('closeFacts').onclick=()=>$('factsDialog').close();
function updateRaceChip(id){
 const outcomes=states[id].race,k=6+outcomes.filter(x=>x==='k'||x==='t').length,a=3+outcomes.filter(x=>x==='a'||x==='t').length,r=3-outcomes.length,button=$(id).querySelector('[data-race]');
 const story=!r?(k===a?'Shared wins title.':'Keith wins the series.'):k>a+r?'Keith has secured the wins title.':'Amber needs '+r+' outright '+(r===1?'win':'wins')+' to draw.';
 if(id==='rally'){button.querySelector('b').textContent=outcomes.length?k+'–'+a+' · '+r+' games remaining':'Three games. One way back.';button.querySelector('small').textContent=story;}
 else if(id==='night'){button.querySelector('b').textContent=k+' — '+a;button.querySelector('small').textContent=story;}
 else{button.querySelector('.series-numbers').innerHTML=k+'<span>:</span>'+a;button.querySelector('b').textContent=outcomes.length?story:'Keep the comeback alive.';button.querySelector('small').textContent=r+' games to go ↗';}
}
function race(){
 const history=['k','a','k','k','a','k','k','a','k'],outcomes=states[raceSelected].race,all=[...history,...outcomes];const k=6+outcomes.filter(x=>x==='k'||x==='t').length,a=3+outcomes.filter(x=>x==='a'||x==='t').length,r=12-all.length;
 $('raceK').textContent=k;$('raceA').textContent=a;$('raceKTrack').style.width=k/12*100+'%';$('raceATrack').style.width=a/12*100+'%';$('raceDialog').classList.toggle('race-clinched',k>a+r||!r);updateRaceChip(raceSelected);
 $('raceStatement').textContent=!r?(k===a?'6–6. A shared wins title.':'Keith takes the wins title.'):k>a+r?'Keith has secured the wins title.':r===1?'Amber needs the final win to draw.':'Amber needs all '+r+' remaining wins to draw.';
 $('raceDetail').textContent=all.length+' of 12 games complete. '+r+' remaining. '+(k>a+r?'The scheduled games still continue for points and personal records.':r?'A tied game awards a win to both players and secures Keith’s wins title.':'Final wins standings. Points standings are independent.');
 $('gameDots').innerHTML=Array.from({length:12},(_,i)=>`<span class="${all[i]||''}" aria-label="Game ${i+1}: ${all[i]==='k'?'Keith':all[i]==='a'?'Amber':all[i]==='t'?'shared win':'not finished'}">${all[i]==='k'?'K':all[i]==='a'?'A':all[i]==='t'?'=':i+1}</span>`).join('');document.querySelectorAll('[data-result]').forEach(b=>b.disabled=!r);
}
document.querySelectorAll('[data-race]').forEach(b=>b.onclick=()=>{raceSelected=b.dataset.race;race();$('raceDialog').showModal();});
document.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{if(states[raceSelected].race.length<3){states[raceSelected].race.push(b.dataset.result);race();}});
$('resetRace').onclick=()=>{states[raceSelected].race=[];race();};$('closeRace').onclick=()=>$('raceDialog').close();
Object.keys(states).forEach(update);
