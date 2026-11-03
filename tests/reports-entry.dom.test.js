// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({mount:vi.fn(),dispose:vi.fn()}));
vi.mock('../src/reports/controller.js',()=>({mountReports:mock.mount}));
vi.mock('../src/multiplayer/client.js',()=>({auth:{},configured:true,emailOtpEnabled:false,requestRoom:vi.fn(),webUrl:'https://game.example.test/yahtzee/'}));
it('mounts with existing account transport/canonical recovery and retires private reports on browser back-cache transitions',async()=>{
 mock.mount.mockReturnValue(mock.dispose);await import('../src/reports/entry.js');expect(mock.mount).toHaveBeenCalledOnce();expect(mock.mount.mock.calls[0][1]).toMatchObject({configured:true,recoveryUrl:'https://game.example.test/yahtzee/?reset=1'});expect(document.title).toContain('Clubhouse Reports');
 window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));expect(mock.dispose).toHaveBeenCalledOnce();window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));expect(mock.mount).toHaveBeenCalledTimes(2);window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));expect(mock.mount).toHaveBeenCalledTimes(2);window.dispatchEvent(new PageTransitionEvent('pagehide'));expect(mock.dispose).toHaveBeenCalledTimes(2);
});
