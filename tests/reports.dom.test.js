// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {mountReports} from '../src/reports/controller.js';
import {reportGame,reportTable} from './helpers/report-fixtures.js';
let stop=()=>{};
afterEach(()=>{stop();stop=()=>{};document.body.replaceChildren();vi.useRealTimers();});
function setup({initial='one',load,lookup,emailOtpEnabled=false}={}){
 document.body.innerHTML='<div id="reports"></div>';const root=document.querySelector('#reports');let owner=initial,listener;
 const unsubscribe=vi.fn(),tables=[reportTable('first',[reportGame('a',{patches:[{chance:23},{chance:10}]})])];
 const auth={getSession:lookup||vi.fn(async()=>({data:{session:owner?{user:{id:owner}}:null}})),onAuthStateChange:vi.fn(fn=>{listener=fn;return{data:{subscription:{unsubscribe}}};}),signInWithPassword:vi.fn(async()=>({data:{user:{id:'one'}}})),signInWithOtp:vi.fn(async()=>({data:{}})),verifyOtp:vi.fn(async()=>({data:{user:{id:'one'}}})),signOut:vi.fn(async()=>({}))};
 const reader=load||vi.fn(async()=>tables);stop=mountReports(root,{auth,configured:true,request:vi.fn(),load:reader,emailOtpEnabled,homeUrl:'https://game.example.test/',studioUrl:'https://game.example.test/?studio=1',recoveryUrl:'https://game.example.test/?reset=1'});
 return{root,auth,reader,tables,unsubscribe,event(next,event='SIGNED_IN'){owner=next;listener(event,next?{user:{id:next}}:null);},click(action){root.querySelector(`[data-report-action="${action}"]`).click();}};
}
const ready=async x=>vi.waitFor(()=>expect(x.root.querySelector('.report-filters')).not.toBeNull());
it('loads real account-derived results and drills into matching-rule player patterns and tournament totals',async()=>{
 const x=setup();await ready(x);expect(x.reader.mock.calls[0][0].userId).toBe('one');expect(x.root.textContent).toContain('23');expect(x.root.textContent).toContain('Combined recorded points');expect(x.root.textContent).not.toContain('Illustrative');
 x.root.querySelector('[data-report-player="one"]').click();expect(x.root.querySelector('h1').textContent).toBe('Player patterns');expect(x.root.querySelector('[data-report-chart] svg')).not.toBeNull();expect(x.root.textContent).toContain('first five accepted scoring entries');expect(x.root.textContent).toContain('13 / 1');expect(x.root.querySelector('[data-report-filter=contract]').value).not.toBe('all');
 x.root.querySelector('[data-report-page=overall]').click();x.root.querySelector('[data-report-tournament]').click();expect(x.root.querySelector('.report-detail').textContent).toContain('Final accepted totals');
});
it('preserves report/filter DOM through a same-user token refresh without rereading or replaying charts',async()=>{
 const x=setup();await ready(x);x.root.querySelector('[data-report-page=patterns]').click();const chart=x.root.querySelector('[data-report-chart] svg'),select=x.root.querySelector('[data-report-filter=contract]');select.focus();x.event('one','TOKEN_REFRESHED');expect(x.reader).toHaveBeenCalledOnce();expect(x.root.querySelector('[data-report-chart] svg')).toBe(chart);expect(document.activeElement).toBe(select);
});
it('clears private rows immediately on account replacement and discards a late old read',async()=>{
 let resolve;const reader=vi.fn().mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue([]);const x=setup({load:reader});await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));x.event('two');await ready(x);resolve(x.tables);await new Promise(r=>setTimeout(r,0));expect(x.root.textContent).not.toContain('Alex');expect(x.root.textContent).not.toContain('23');expect(reader.mock.calls.at(-1)[0].userId).toBe('two');
});
it('keeps signed-out reports empty after a late private read or failed signout',async()=>{
 let resolve;const x=setup({load:vi.fn(()=>new Promise(r=>{resolve=r;}))});await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));x.event(null,'SIGNED_OUT');resolve(x.tables);await new Promise(r=>setTimeout(r,0));expect(x.root.querySelector('form')).not.toBeNull();expect(x.root.textContent).not.toContain('Alex');
});
it('does not let an old initial lookup replace a newer account auth event',async()=>{
 let finish;const x=setup({lookup:vi.fn(()=>new Promise(r=>{finish=r;}))});x.event('two');await ready(x);finish({data:{session:{user:{id:'one'}}}});await new Promise(r=>setTimeout(r,0));expect(x.reader.mock.calls.every(([q])=>q.userId==='two')).toBe(true);
});
it('retires loads on page disposal and unsubscribes auth',async()=>{
 let resolve;const x=setup({load:vi.fn(()=>new Promise(r=>{resolve=r;}))});await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));stop();resolve(x.tables);await new Promise(r=>setTimeout(r,0));expect(x.root.childElementCount).toBe(0);expect(x.unsubscribe).toHaveBeenCalledOnce();
});
it('offers refresh after a load failure without passing off partial data as zero trophies',async()=>{
 const reader=vi.fn().mockRejectedValueOnce(Error('History changed')).mockResolvedValue([]),x=setup({load:reader});await vi.waitFor(()=>expect(x.root.textContent).toContain('History changed'));expect(x.root.querySelector('table')).toBeNull();x.click('refresh');await ready(x);expect(x.root.textContent).toContain('No completed scorecards');
});
it('keeps archived corrections and incomplete history explicit in the view',async()=>{
 const t=reportTable('partial',[reportGame('a')],{count:3});t.snapshots[0].events=[];t.room.game.events=[];const x=setup({load:vi.fn(async()=>[t])});await ready(x);expect(x.root.textContent).toContain('awards are withheld');x.root.querySelector('[data-report-page=patterns]').click();expect(x.root.textContent).toContain('0 / 1 fully reconciled');expect(x.root.textContent).toContain('— / 0');
});
it('escapes saved aliases and tournament names',async()=>{
 const t=reportTable('xss',[reportGame('a')]);t.room.tournament.name='<img src=x onerror=alert(1)>';t.room.game.players[0].name='<script>alert(1)</script>';const x=setup({load:vi.fn(async()=>[t])});await ready(x);expect(x.root.querySelector('script,img')).toBeNull();expect(x.root.textContent).toContain('<script>alert(1)</script>');
});
it('uses existing password login and keeps auth-mode changes from racing an in-flight sign-in',async()=>{
 const x=setup({initial:null,emailOtpEnabled:true});await vi.waitFor(()=>expect(x.root.querySelector('form')).not.toBeNull());let resolve;x.auth.signInWithPassword.mockImplementation(()=>new Promise(r=>{resolve=r;}));x.root.querySelector('[name=email]').value='player@example.test';x.root.querySelector('[name=password]').value='synthetic-passphrase';x.root.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));x.click('auth-mode');expect(x.root.querySelector('[name=password]')).not.toBeNull();expect(x.auth.signInWithOtp).not.toHaveBeenCalled();resolve({data:{user:{id:'one'}}});await ready(x);expect(x.auth.signInWithPassword).toHaveBeenCalledOnce();
});
it('supports configured email OTP for existing accounts without signing up a new account',async()=>{
 const x=setup({initial:null,emailOtpEnabled:true});await vi.waitFor(()=>expect(x.root.querySelector('form')).not.toBeNull());x.click('auth-mode');x.root.querySelector('[name=email]').value='player@example.test';x.root.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(x.root.querySelector('[name=token]')).not.toBeNull());expect(x.auth.signInWithOtp).toHaveBeenCalledWith({email:'player@example.test',options:{shouldCreateUser:false}});x.root.querySelector('[name=token]').value='000000';x.root.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await ready(x);expect(x.auth.verifyOtp).toHaveBeenCalledWith({email:'player@example.test',token:'000000',type:'email'});
});
it('shows failed signout without restoring previously loaded private rows',async()=>{
 const x=setup();await ready(x);x.auth.signOut.mockResolvedValueOnce({error:Error('Signout unavailable')});x.click('signout');await vi.waitFor(()=>expect(x.root.textContent).toContain('Signout unavailable'));expect(x.root.querySelector('table')).toBeNull();
});
it('shows setup help instead of an unusable account form on an unconfigured build',()=>{
 document.body.innerHTML='<div id="reports"></div>';const root=document.querySelector('#reports');stop=mountReports(root,{configured:false});expect(root.querySelector('form')).toBeNull();expect(root.textContent).toContain('not configured');
});
it('loads through the existing read-only account API without an injected report dataset',async()=>{
 document.body.innerHTML='<div id="reports"></div>';const root=document.querySelector('#reports'),table=reportTable('account',[reportGame('existing')]);
 const auth={getSession:async()=>({data:{session:{user:{id:'one'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})};
 const request=vi.fn(async q=>q.operation==='sessions'?{rooms:q.view==='completed'?[table.room]:[],nextBefore:null}:q.operation==='history'?{games:table.snapshots,nextBefore:null}:{room:table.room});
 stop=mountReports(root,{auth,configured:true,request});await vi.waitFor(()=>expect(root.querySelector('table')).not.toBeNull());expect(root.textContent).toContain('Alex');expect(request.mock.calls.every(([q,o])=>['sessions','history','read'].includes(q.operation)&&o.expectedUserId==='one')).toBe(true);
});
it('resets a removed contract to the visible selector instead of silently applying an obsolete filter',async()=>{
 const first=reportTable('a',[reportGame('old')]),second=reportTable('b',[reportGame('new',{mode:'competition',rulesVersion:2})]);const reader=vi.fn().mockResolvedValueOnce([first]).mockResolvedValueOnce([second]);const x=setup({load:reader});await ready(x);x.root.querySelector('[data-report-page=patterns]').click();const old=x.root.querySelector('[data-report-filter=contract]').value;x.click('refresh');await ready(x);expect(x.root.querySelector('[data-report-filter=contract]').value).not.toBe(old);expect(x.root.textContent).toContain('Competition');expect(x.root.querySelector('[data-report-chart]')).not.toBeNull();
});
it('keeps chart nodes intact on height-only resize notifications',async()=>{
 let callback;const observe=vi.fn(),disconnect=vi.fn();vi.stubGlobal('ResizeObserver',class{constructor(fn){callback=fn;}observe=observe;disconnect=disconnect;});
 try{const x=setup();await ready(x);x.root.querySelector('[data-report-page=patterns]').click();callback([{contentRect:{width:600}}]);const svg=x.root.querySelector('[data-report-chart] svg');callback([{contentRect:{width:600}}]);expect(x.root.querySelector('[data-report-chart] svg')).toBe(svg);callback([{contentRect:{width:390}}]);expect(x.root.querySelector('[data-report-chart] svg')).not.toBe(svg);}finally{vi.unstubAllGlobals();}
});
it('fences a pending sign-in when sign-out arrives before an account has loaded',async()=>{
 const x=setup({initial:null});await vi.waitFor(()=>expect(x.root.querySelector('form')).not.toBeNull());let resolve;x.auth.signInWithPassword.mockImplementation(()=>new Promise(r=>{resolve=r;}));x.root.querySelector('[name=email]').value='player@example.test';x.root.querySelector('[name=password]').value='synthetic-passphrase';x.root.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));x.event(null,'SIGNED_OUT');resolve({data:{user:{id:'one'}}});await new Promise(r=>setTimeout(r,0));expect(x.reader).not.toHaveBeenCalled();expect(x.root.querySelector('form')).not.toBeNull();expect(x.root.querySelector('table')).toBeNull();
});
