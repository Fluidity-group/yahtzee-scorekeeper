// @vitest-environment jsdom
import{it,expect,vi,afterEach}from'vitest';
const mock=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../src/profile/portrait-api.js',()=>({requestPortrait:mock.request,portraitSession:vi.fn()}));
vi.mock('../src/multiplayer/client.js',()=>({configured:false,auth:null}));
import{setAccountAvatar,setPeerAvatars,avatarProfile,currentAvatar,renderAvatar}from'../src/profile/avatar-view.js';
import{refreshTableAvatars}from'../src/profile/avatar-sync.js';
const profile=(patch={})=>({ownerId:'player',kind:'generated',avatarId:'portrait-a',revision:4,preset:'character-1',url:'https://images.example.test/a.jpg?token=first',...patch});
afterEach(()=>{setAccountAvatar(null);mock.request.mockReset();});
it('does not flag unchanged peer reads or renewed signed image tokens as a new graphic',async()=>{
 mock.request.mockResolvedValueOnce({profiles:[profile()]}).mockResolvedValueOnce({profiles:[profile({url:'https://images.example.test/a.jpg?token=renewed'})]});
 expect(await refreshTableAvatars('ABCDEFGH')).toBe(true);expect(await refreshTableAvatars('ABCDEFGH')).toBe(false);expect(avatarProfile('player').url).toContain('token=renewed');
});
it('reports a genuine image change and the recovery of a temporarily unavailable image',()=>{
 expect(setPeerAvatars([profile({url:null})])).toBe(true);expect(setPeerAvatars([profile()])).toBe(true);expect(setPeerAvatars([profile({url:'https://images.example.test/replacement.jpg'})])).toBe(true);expect(setPeerAvatars([profile({avatarId:'portrait-b',revision:5})])).toBe(true);
});
it('advances metadata revisions without replaying the same avatar and rejects stale reads',()=>{
 setPeerAvatars([profile()]);expect(setPeerAvatars([profile({revision:5})])).toBe(false);expect(avatarProfile('player').revision).toBe(5);expect(setPeerAvatars([profile({revision:3,avatarId:'old',url:'https://images.example.test/old.jpg'})])).toBe(false);expect(avatarProfile('player').avatarId).toBe('portrait-a');
});
it('only notifies Home of visible own-avatar changes, retaining refreshed credentials and revision',()=>{
 const changed=vi.fn();globalThis.addEventListener('clubhouse-avatar-changed',changed);
 try{expect(setAccountAvatar(profile())).toBe(true);expect(setAccountAvatar(profile({revision:5,url:'https://images.example.test/a.jpg?token=new'}))).toBe(false);expect(currentAvatar().revision).toBe(5);expect(currentAvatar().url).toContain('token=new');expect(changed).toHaveBeenCalledOnce();expect(setAccountAvatar(profile({revision:6,kind:'preset',preset:'character-2',url:null}))).toBe(true);expect(changed).toHaveBeenCalledTimes(2);}finally{globalThis.removeEventListener('clubhouse-avatar-changed',changed);}
});
it('clears account and peer scope once, including when only peers were loaded',()=>{
 setPeerAvatars([profile()]);expect(setAccountAvatar(null)).toBe(true);expect(avatarProfile('player')).toBeNull();expect(setAccountAvatar(null)).toBe(false);expect(setAccountAvatar(profile({ownerId:'new-account'}))).toBe(true);
});
it('retains the saved graphic on a failed peer read without asking for a redraw',async()=>{
 setPeerAvatars([profile()]);const html=renderAvatar({accountId:'player'});mock.request.mockRejectedValueOnce(Error('offline'));expect(await refreshTableAvatars('ABCDEFGH')).toBe(false);expect(renderAvatar({accountId:'player'})).toBe(html);
});
it('does not let a same-account peer revision regress its selected own avatar',()=>{
 setAccountAvatar(profile({revision:5,avatarId:'new-choice'}));expect(setPeerAvatars([profile({revision:4})])).toBe(false);expect(currentAvatar().avatarId).toBe('new-choice');expect(setPeerAvatars([profile({revision:6,avatarId:'next-choice'})])).toBe(true);expect(currentAvatar().avatarId).toBe('next-choice');
});
