import{it,expect,vi,afterEach}from'vitest';
import{socialDestination,notificationDestination,rememberSocialDestination,readSocialDestination,socialLandingView}from'../src/multiplayer/social-links.js';
afterEach(()=>vi.useRealTimers());
it('routes native and trusted web links as navigation hints only',()=>{
 expect(socialDestination('diceclubhouse://table/ABCDEFGH')).toEqual({code:'ABCDEFGH',kind:'join'});
 expect(socialDestination('https://example.com/game?join=ABCDEFGH',{webOrigin:'https://example.com'})).toEqual({code:'ABCDEFGH',kind:'join'});
 expect(socialDestination('https://phishing.invalid/?join=ABCDEFGH',{webOrigin:'https://example.com'})).toBeNull();
 expect(socialDestination('javascript:alert(1)')).toBeNull();
 expect(notificationDestination({kind:'command',code:'ABCDEFGH',action:'resume'})).toBeNull();
 expect(notificationDestination({kind:'play',code:'ABCDEFGH',action:'resume'})).toEqual({code:'ABCDEFGH',kind:'play'});
 expect(socialLandingView(socialDestination('diceclubhouse://table/ABCDEFGH'))).toBe('home');
 expect(socialLandingView(notificationDestination({kind:'invite',code:'ABCDEFGH'}))).toBe('invitations');
 expect(socialLandingView(notificationDestination({kind:'play',code:'ABCDEFGH'}))).toBe('return-table');
 expect(socialLandingView({code:'ABCDEFGH'})).toBe('return-table');
});
it('preserves invitation intent through sign-in but expires old destinations',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
 rememberSocialDestination({code:'ABCDEFGH',kind:'invite',session:'never persist'},storage);
 expect(readSocialDestination(storage)).toEqual({code:'ABCDEFGH',kind:'invite'});
 rememberSocialDestination({code:'ABCDEFGH',kind:'join'},storage);
 expect(readSocialDestination(storage)).toEqual({code:'ABCDEFGH',kind:'join'});
 expect([...values.values()].join('')).not.toContain('session');
 vi.advanceTimersByTime(24*60*60*1000+1);expect(readSocialDestination(storage)).toBeNull();
});
