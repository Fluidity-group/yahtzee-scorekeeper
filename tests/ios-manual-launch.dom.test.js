// @vitest-environment jsdom
import {beforeAll,it,expect,vi} from 'vitest';
import {createCoreGame} from '../src/game/core.js';
import {saveCommentaryPreferences,readCommentaryPreferences} from '../src/commentary/preferences.js';
const mock=vi.hoisted(()=>({saved:null}));
vi.mock('../src/core-store.js',()=>({loadCore:vi.fn(async()=>createCoreGame({id:'existing-local',names:['Alex'],source:'manual'})),saveCore:vi.fn(async g=>{mock.saved=g;}),listCore:vi.fn(async()=>[])}));
let preferences;
beforeAll(async()=>{
 vi.stubEnv('MODE','ios-test');localStorage.clear();
 saveCommentaryPreferences({profile:{...readCommentaryPreferences().profile,enabled:true},listenerMuted:false});
 preferences=localStorage.getItem('dice-clubhouse:commentary-preferences:v1');
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 HTMLDialogElement.prototype.close=function(){this.open=false;};
 await import('../src/prototype.js');
 await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());
});
it('starts manual scoring despite enabled saved voice and preserves that preference',async()=>{
 expect(document.documentElement.dataset.iosTest).toBe('true');
 document.querySelector('[data-action=home-solo]').click();
 document.querySelector('#createCore').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(document.querySelector('.core-score-table')).not.toBeNull());
 expect(mock.saved.players).toHaveLength(1);
 expect(document.querySelector('[data-launch-choice]')).toBeNull();
 expect(document.querySelector('.launch-progress')).toBeNull();
 expect(localStorage.getItem('dice-clubhouse:commentary-preferences:v1')).toBe(preferences);
});
