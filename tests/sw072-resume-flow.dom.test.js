// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {createCoreGame} from '../src/game/core.js';
import {setHomeAccountPreview} from '../src/multiplayer/home-account.js';
import {homePreview} from '../lab/home-preview.js';
const state=vi.hoisted(()=>({game:null,save:vi.fn(async()=>{})}));
vi.mock('../src/core-store.js',()=>({saveCore:state.save,loadCore:vi.fn(async()=>state.game),listCore:vi.fn(async()=>[state.game])}));
vi.mock('../src/multiplayer/client.js',()=>({auth:null,configured:false,webUrl:'https://example.test/'}));
it('removes and restores the current Home shortcut without writing scores or deleting history',async()=>{
 localStorage.clear();HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};setHomeAccountPreview(homePreview);
 state.game=createCoreGame({id:'saved-local',names:['McTest'],source:'manual'});const original=JSON.stringify(state.game);
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.ribbon-player-name')?.textContent).toBe('Alex'));
 const click=action=>document.querySelector(`[data-action="${action}"]`).click();
 click('dismiss-resume');expect(document.querySelector('.home-resume')).toBeNull();expect(document.querySelector('[data-action=restore-resume]')).not.toBeNull();
 click('restore-resume');expect(document.querySelector('.home-resume strong').textContent).toContain('McTest');
 const fail=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});click('dismiss-resume');expect(document.querySelector('.home-resume')).not.toBeNull();expect(document.querySelector('#coreNotice').textContent).toContain('still saved');fail.mockRestore();
 click('resume-game');await vi.waitFor(()=>expect(document.querySelector('.phone-scorecard')).not.toBeNull());click('home');await vi.waitFor(()=>expect(document.querySelector('.home-resume')).not.toBeNull());
 expect(JSON.stringify(state.game)).toBe(original);expect(state.save).not.toHaveBeenCalled();setHomeAccountPreview(null);
});
