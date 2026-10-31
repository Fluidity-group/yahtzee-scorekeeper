// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {renderBuildInfo} from '../src/ui/build-info.js';
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(),loadCore:async()=>null,listCore:async()=>[]}));
vi.mock('../src/multiplayer/client.js',()=>({auth:null,configured:false,webUrl:'https://example.test/'}));
it('shows the bundled source separately from native build number and current game rules',()=>{
 const identity={commit:'a'.repeat(40),sourceState:'modified',sourceSha256:'b'.repeat(64),profile:'ios-test'};
 document.body.innerHTML=renderBuildInfo({identity,nativeInfo:{version:'1.0',build:'71'},game:{mode:'competition',rules:{version:2}}});
 expect(document.body.textContent).toContain(identity.commit);expect(document.body.textContent).toContain(identity.sourceSha256);expect(document.body.textContent).toContain('modified');expect(document.body.textContent).toContain('1.0 · build 71');expect(document.body.textContent).toContain('competition · version 2');
 document.body.innerHTML=renderBuildInfo({identity:{...identity,profile:'<img src=x onerror=alert(1)>'}});expect(document.querySelector('img')).toBeNull();
});
it('opens build details from the actual Home menu without creating or modifying a game',async()=>{
 vi.stubEnv('MODE','ios-test');localStorage.clear();
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 try{
  await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.yahtz-home')).not.toBeNull());
  document.querySelector('[data-action="game-menu"]').click();document.querySelector('[data-action="build-info"]').click();
  expect(document.querySelector('#coreDialog').textContent).toContain('About this build');expect(document.querySelector('#coreDialog').textContent).toContain('Development preview');
  const {saveCore}=await import('../src/core-store.js');expect(saveCore).not.toHaveBeenCalled();
 }finally{vi.unstubAllEnvs();}
});
