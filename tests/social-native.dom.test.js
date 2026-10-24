// @vitest-environment jsdom
import{it,expect,vi}from'vitest';
const mock=vi.hoisted(()=>({listeners:{},app:{},rpc:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios'}}));
vi.mock('@capacitor/app',()=>({App:{addListener:async(name,fn)=>{mock.app[name]=fn;},getLaunchUrl:async()=>undefined}}));
vi.mock('@capacitor/push-notifications',()=>({PushNotifications:{addListener:async(name,fn)=>{mock.listeners[name]=fn;}}}));
vi.mock('../src/multiplayer/client.js',()=>({auth:{getSession:async()=>({data:{session:{user:{id:'sam'}}}})},requestSocial:mock.rpc,webUrl:'https://example.com'}));
it('turns a cold notification or app link into a pending destination without accepting membership or readiness',async()=>{
 const navigate=vi.fn();document.addEventListener('clubhouse-open-tournament',navigate);
 const{initialiseNativeSocial,enablePhoneNotifications}=await import('../src/multiplayer/social-native.js');
 await initialiseNativeSocial();mock.listeners.pushNotificationActionPerformed({notification:{data:{code:'ABCDEFGH',kind:'invite',action:'resume'}}});
 expect(navigate.mock.calls[0][0].detail).toEqual({code:'ABCDEFGH',kind:'invite'});
 const{readSocialDestination}=await import('../src/multiplayer/social-links.js');expect(readSocialDestination()).toEqual({code:'ABCDEFGH',kind:'invite'});
 mock.app.appUrlOpen({url:'diceclubhouse://table/ABCDEFGH'});expect(navigate).toHaveBeenCalledTimes(2);
 mock.app.appUrlOpen({url:'https://untrusted.invalid/?join=ABCDEFGH'});expect(navigate).toHaveBeenCalledTimes(2);
 vi.stubEnv('VITE_PUSH_ENABLED','false');await expect(enablePhoneNotifications()).rejects.toThrow('awaiting Apple/Firebase');
 expect(mock.rpc).not.toHaveBeenCalled();document.removeEventListener('clubhouse-open-tournament',navigate);
});
