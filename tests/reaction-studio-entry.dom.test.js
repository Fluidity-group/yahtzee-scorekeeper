// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({mount:vi.fn(),dispose:vi.fn()}));
vi.mock('../src/studio/controller.js',()=>({mountReactionStudio:mock.mount}));
vi.mock('../src/multiplayer/client.js',()=>({auth:{},configured:false,emailOtpEnabled:false,requestRoom:vi.fn(),watchRoom:vi.fn()}));
it('retires Studio on pagehide and remounts with fresh auth on browser back-cache restore',async()=>{mock.mount.mockReturnValue(mock.dispose);await import('../src/studio/entry.js');expect(mock.mount).toHaveBeenCalledOnce();window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));expect(mock.dispose).toHaveBeenCalledOnce();window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));expect(mock.mount).toHaveBeenCalledTimes(2);window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));expect(mock.mount).toHaveBeenCalledTimes(2);window.dispatchEvent(new PageTransitionEvent('pagehide'));expect(mock.dispose).toHaveBeenCalledTimes(2);});
