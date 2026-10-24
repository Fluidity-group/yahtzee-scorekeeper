// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
vi.mock('../src/core-store.js',()=>({loadCore:async()=>null,saveCore:vi.fn(),listCore:async()=>[]}));
it('standard native local setup offers manual play rather than unavailable GoDice capture',async()=>{
 vi.stubEnv('MODE','native');
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());(document.querySelector('[data-action=resume-game]')||document.querySelector('[data-action=home-local]')).click();
 await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
 expect([...document.querySelector('[name="source"]').options].map(o=>o.value)).toEqual(['manual']);
 vi.unstubAllEnvs();
});
