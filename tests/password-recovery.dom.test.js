// @vitest-environment jsdom
import {beforeEach,it,expect,vi} from 'vitest';
import {mountRecovery,isRecoveryUrl,recoveryRedirect} from '../src/multiplayer/recovery.js';
let root,auth,replace;
const valid='https://game.example.test/?reset=1#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh';
beforeEach(()=>{
 document.body.innerHTML='<div id="root"></div>';root=document.getElementById('root');replace=vi.fn();
 auth={setSession:vi.fn(async()=>({data:{session:{user:{id:'synthetic-user'}}}})),exchangeCodeForSession:vi.fn(async()=>({data:{session:{user:{id:'synthetic-user'}}}})),updateUser:vi.fn(async()=>({error:null})),resetPasswordForEmail:vi.fn(async()=>({error:null}))};
});
const mount=url=>mountRecovery({root,auth,webUrl:'https://game.example.test/yahtzee/',url:new URL(url),replaceUrl:replace});
const submit=()=>root.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
const passwords=(a,b=a)=>{root.querySelector('[name=password]').value=a;root.querySelector('[name=confirm]').value=b;};
it('routes recovery before game views and constructs an exact hosted redirect',()=>{
 expect(isRecoveryUrl(new URL(valid))).toBe(true);expect(isRecoveryUrl(new URL('https://game.example.test/?join=ABCDEFGH'))).toBe(false);
 expect(recoveryRedirect('https://game.example.test/yahtzee/?join=ABCDEFGH#old')).toBe('https://game.example.test/yahtzee/?reset=1');
});
it('strips credentials before checking a recovery session and shows the new-password form',async()=>{
 auth.setSession.mockImplementation(async()=>{expect(replace).toHaveBeenCalledWith('/?reset=1');return {data:{session:{user:{id:'synthetic-user'}}}};});
 await mount(valid);expect(root.querySelector('[name=password]')).not.toBeNull();expect(root.textContent).not.toContain('synthetic-access');
});
it.each(['https://game.example.test/?reset=1','https://game.example.test/?reset=1#type=recovery&access_token=synthetic','https://game.example.test/?reset=1#type=signup&access_token=a&refresh_token=b','https://game.example.test/?reset=1#error=access_denied&error_description=private'])('never uses an existing session for an absent/invalid recovery link %s',async url=>{
 await mount(url);expect(auth.setSession).not.toHaveBeenCalled();expect(root.querySelector('[name=password]')).toBeNull();expect(root.querySelector('[name=email]')).not.toBeNull();expect(root.textContent).not.toContain('private');
});
it('shows a fresh-link request after expired token rejection',async()=>{
 auth.setSession.mockResolvedValue({error:Error('private token detail')});await mount(valid);expect(root.textContent).toContain('invalid or expired');expect(root.textContent).not.toContain('private token detail');
});
it('exchanges a PKCE code and removes it from the URL',async()=>{
 await mount('https://game.example.test/?reset=1&code=synthetic-code');expect(replace).toHaveBeenCalledWith('/?reset=1');expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('synthetic-code');expect(root.querySelector('[name=password]')).not.toBeNull();
});
it('rejects short or mismatched passwords without an update',async()=>{
 await mount(valid);passwords('short');submit();expect(auth.updateUser).not.toHaveBeenCalled();passwords('synthetic-password','different');submit();expect(auth.updateUser).not.toHaveBeenCalled();
});
it('waits for server acceptance, prevents duplicate updates and clears the form on success',async()=>{
 let done;auth.updateUser.mockImplementation(()=>new Promise(resolve=>done=resolve));await mount(valid);passwords('synthetic-password');submit();submit();expect(auth.updateUser).toHaveBeenCalledTimes(1);expect(root.textContent).not.toContain('has been updated');expect(root.querySelector('button').disabled).toBe(true);
 done({error:null});await vi.waitFor(()=>expect(root.textContent).toContain('has been updated'));expect(root.querySelector('[name=password]')).toBeNull();
});
it('keeps failed password updates retryable without claiming success',async()=>{
 auth.updateUser.mockResolvedValue({error:Error('password-policy')});await mount(valid);passwords('synthetic-password');submit();await vi.waitFor(()=>expect(root.textContent).toContain('Could not update'));expect(root.querySelector('button').disabled).toBe(false);
});
it('requests a new link at the exact hosted redirect without account enumeration',async()=>{
 await mount('https://game.example.test/?reset=1');root.querySelector('[name=email]').value='fixture@example.test';submit();await vi.waitFor(()=>expect(root.textContent).toContain('If that email has a game account'));
 expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('fixture@example.test',{redirectTo:'https://game.example.test/yahtzee/?reset=1'});
});
