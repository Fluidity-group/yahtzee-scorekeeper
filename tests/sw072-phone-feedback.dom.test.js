// @vitest-environment jsdom
import {beforeEach,it,expect,vi} from 'vitest';
import {bindResumeSwipe,resumeDismissed,setResumeDismissed} from '../src/ui/resume-queue.js';
import {renderYahtzHome} from '../src/ui/yahtz-home.js';
import {bonusCount,renderBonusChecks} from '../src/ui/bonus-checks.js';
import {renderPhoneScorecard} from '../src/ui/phone-scorecard.js';
import {createCoreGame,command} from '../src/game/core.js';
beforeEach(()=>{localStorage.clear();document.body.innerHTML='';});
const touch=(card,type,x,y=20,count=1)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'touches',{value:Array.from({length:count},()=>({clientX:x,clientY:y}))});card.dispatchEvent(event);return event;};
const mount=()=>{document.body.innerHTML=renderYahtzHome({savedGame:{id:'g',players:[{name:'McTest <b>'}]}});return document.querySelector('.home-resume');};
it('swipes right to remove only a queue shortcut; Undo and reload preserve the saved record',()=>{
 const card=mount(),saved={id:'g',revision:12,sheets:[{yahtzee:50}]};localStorage.setItem('yz_core_journal:g',JSON.stringify(saved));
 const remove=vi.fn(()=>setResumeDismissed('g',true)),resume=vi.fn();card.addEventListener('click',resume);const cleanup=bindResumeSwipe(document.body,remove);
 touch(card,'touchstart',70);expect(touch(card,'touchmove',175).defaultPrevented).toBe(true);touch(card,'touchend',175,20,0);card.click();expect(remove).toHaveBeenCalledOnce();expect(resume).not.toHaveBeenCalled();expect(resumeDismissed('g')).toBe(true);
 expect(JSON.parse(localStorage.getItem('yz_core_journal:g'))).toEqual(saved);
 document.body.innerHTML=renderYahtzHome({savedGame:{players:[{name:'McTest'}]},resumeHidden:true});expect(document.querySelector('.home-resume')).toBeNull();expect(document.querySelector('[data-action=restore-resume]')).not.toBeNull();setResumeDismissed('g',false);expect(resumeDismissed('g')).toBe(false);cleanup();
});
it.each(['vertical','short','cancel','multitouch','left'])('%s gestures leave Resume intact',kind=>{
 const card=mount(),remove=vi.fn();bindResumeSwipe(document.body,remove);touch(card,'touchstart',100);
 if(kind==='vertical'){touch(card,'touchmove',105,80);touch(card,'touchmove',220,85);}
 if(kind==='short')touch(card,'touchmove',135);
 if(kind==='left')touch(card,'touchmove',0);
 if(kind==='multitouch')touch(card,'touchmove',220,20,2);
 if(kind==='cancel'){touch(card,'touchmove',220);touch(card,'touchcancel',220);}
 touch(card,'touchend',220,20,0);expect(remove).not.toHaveBeenCalled();
});
it('keeps full names accessible, uses title case mode labels and a concise default account label',()=>{
 document.body.innerHTML=renderYahtzHome({account:{status:'ready',user:{name:'Your account'},people:[],trophies:{total:0,points:0,wins:0,completed:0}}});
 expect(document.querySelector('.ribbon-player-name').textContent).toBe('Account');expect(document.querySelector('.ribbon-player-name').title).toBe('Your account');
 expect([...document.querySelectorAll('.home-game-card strong')].map(n=>n.textContent)).toEqual(['Play Alone','Local Multiplayer','Online Multiplayer','Tournament']);
 mount();expect(document.querySelector('.home-resume strong').textContent).toContain('McTest <b>');expect(document.querySelector('b')).toBeNull();expect(document.querySelector('[data-action=dismiss-resume]')).not.toBeNull();
});
it('checkboxes count accepted weighted/attached bonuses and exclude undone events',()=>{
 const game={sheets:[{yahtzee:100,yahtzeeBonus:180}],turns:[{id:'excluded',excluded:true}],events:[{id:'a',seat:0,type:'bonus',turnId:'one',value:90},{id:'b',seat:0,type:'score',turnId:'two',bonus:90},{id:'c',seat:0,type:'final-chain-roll',turnId:'three',value:100},{id:'u',seat:0,type:'score-undo',target:'c'},{id:'d',seat:0,type:'bonus',turnId:'excluded',value:100}]};
 expect(bonusCount(game,0)).toBe(2);document.body.innerHTML=renderBonusChecks(game,0);expect(document.querySelectorAll('.checked')).toHaveLength(2);expect(document.querySelector('.bonus-total').textContent).toBe('180');
 document.body.innerHTML=renderBonusChecks(game,0,{hidden:true});expect(document.querySelectorAll('.checked,.bonus-total')).toHaveLength(0);expect(document.body.textContent).not.toContain('180');
});
it('places accepted checks directly under Yahtzee without spectator edit controls',()=>{
 let game=createCoreGame({id:'g',names:['McTest'],mode:'competition',source:'manual'});let i=0;const act=(type,extra={})=>game=command(game,{type,seat:0,...extra},{id:'event-'+i++,time:'2026-10-26T12:00:00Z'});
 act('start');act('score',{category:'yahtzee',value:50});act('start');act('bonus',{yahtzeeFace:2});
 document.body.innerHTML=renderPhoneScorecard(game);const row=[...document.querySelectorAll('tr')].find(row=>row.querySelector('[data-score-key=yahtzee]'));
 expect(row.querySelector('.checked')).not.toBeNull();expect(row.textContent).toContain('100');expect(document.querySelector('[data-action=another-yahtzee]')).toBeNull();expect(document.querySelectorAll('tbody tr')).toHaveLength(15);
});
