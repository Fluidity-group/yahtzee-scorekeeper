// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {createCoreGame} from '../src/game/core.js';
import {setHomeAccountPreview} from '../src/multiplayer/home-account.js';
import {homePreview} from '../lab/home-preview.js';
const state=vi.hoisted(()=>({game:null,save:vi.fn(async()=>{})}));
vi.mock('../src/core-store.js',()=>({saveCore:state.save,loadCore:vi.fn(async()=>state.game),listCore:vi.fn(async()=>[state.game])}));
vi.mock('../src/multiplayer/client.js',()=>({auth:null,configured:false,webUrl:'https://example.test/'}));
it('wires lever and category preferences through the actual app without recording scores',async()=>{
 localStorage.clear();HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};setHomeAccountPreview(homePreview);
 state.game=createCoreGame({id:'saved',names:['McTest'],source:'manual'});const before=JSON.stringify(state.game);await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.ribbon-player-name')?.textContent).toBe('Alex'));
 const click=a=>{const el=document.querySelector(`[data-action="${a}"]`);expect(el,a).not.toBeNull();el.click();};
 for(let i=0;i<5;i++)click('slot-lever');expect(document.querySelector('.slot-secret').textContent).toBe('AMBER > DAN');click('home-solo');expect(document.querySelector('.slot-dice-rain')).toBeNull();click('home');await vi.waitFor(()=>expect(document.querySelector('.home-resume')).not.toBeNull());click('resume-game');
 click('game-menu');click('scorecard-display');const select=document.querySelector('[name=upper-label-style]');select.value='dice';select.dispatchEvent(new Event('change',{bubbles:true}));expect(document.querySelectorAll('.upper-category-title svg')).toHaveLength(6);
 select.value='custom';select.dispatchEvent(new Event('change',{bubbles:true}));const field=document.querySelector('[data-category-label=aces]');field.value='Lucky Ones';field.dispatchEvent(new Event('change',{bubbles:true}));expect(document.querySelector('.upper-category-title').textContent).toBe('Lucky Ones');expect(document.querySelector('[data-key=aces]')).not.toBeNull();expect(JSON.stringify(state.game)).toBe(before);expect(state.save).not.toHaveBeenCalled();setHomeAccountPreview(null);
});
