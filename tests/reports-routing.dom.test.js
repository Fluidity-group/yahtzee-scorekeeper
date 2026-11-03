// @vitest-environment jsdom
import {it,expect,vi,beforeEach} from 'vitest';
import {renderYahtzHome} from '../src/ui/yahtz-home.js';
const mock=vi.hoisted(()=>({native:false,reports:vi.fn(),game:vi.fn(),studio:vi.fn(),recovery:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>mock.native}}));
vi.mock('../src/reports/entry.js',()=>{mock.reports();return{};});
vi.mock('../src/studio/entry.js',()=>{mock.studio();return{};});
vi.mock('../src/prototype.js',()=>{mock.game();return{};});
vi.mock('../src/multiplayer/recovery-page.js',()=>{mock.recovery();return{};});
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();mock.native=false;history.replaceState(null,'','/?reports=1');});
it('routes the browser to Reports while preserving recovery precedence',async()=>{
 await import('../src/bootstrap.js');await vi.waitFor(()=>expect(mock.reports).toHaveBeenCalledOnce());expect(mock.game).not.toHaveBeenCalled();expect(mock.studio).not.toHaveBeenCalled();
});
it('opens password recovery before Reports when a recovery link is supplied',async()=>{
 history.replaceState(null,'','/?reports=1&reset=1');await import('../src/bootstrap.js');await vi.waitFor(()=>expect(mock.recovery).toHaveBeenCalledOnce());expect(mock.reports).not.toHaveBeenCalled();
});
it('keeps native scoring as the entry point instead of activating the browser Reports route',async()=>{
 mock.native=true;await import('../src/bootstrap.js');await vi.waitFor(()=>expect(mock.game).toHaveBeenCalledOnce());expect(mock.reports).not.toHaveBeenCalled();
});
it('makes Reports discoverable only when the caller supplies a browser report URL',()=>{
 const root=document.createElement('div');root.innerHTML=renderYahtzHome({reportsUrl:'https://game.example.test/?reports=1'});expect(root.querySelector('a[href*="reports=1"]').textContent).toBe('Clubhouse Reports');root.innerHTML=renderYahtzHome();expect(root.querySelector('a[href*="reports=1"]')).toBeNull();
});
