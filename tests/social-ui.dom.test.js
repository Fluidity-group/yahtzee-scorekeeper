// @vitest-environment jsdom
import{it,expect,vi}from'vitest';
const mock=vi.hoisted(()=>({inbox:{invitations:[],requests:[]},request:vi.fn(),user:{id:'alex',email:'alex@example.com'}}));
vi.mock('../src/multiplayer/client.js',()=>({auth:{getSession:async()=>({data:{session:{user:mock.user}}})},webUrl:'https://example.com/game',watchSocial:()=>()=>{},requestSocial:async(action,payload)=>{mock.request(action,payload);if(action==='inbox')return structuredClone(mock.inbox);if(action==='play-create'){mock.inbox.requests=[{id:payload.id,code:payload.code,sent:true,status:'pending',actionable:true,recipient_name:'Sam',tournament_name:'Existing tournament'}];}return{ok:true};}}));
vi.mock('../src/multiplayer/social-native.js',()=>({enablePhoneNotifications:vi.fn(),disablePhoneNotifications:vi.fn(),syncNativeAccount:async()=>{}}));
it('keeps existing members accepted and sends a play request without changing the paused tournament',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 const room={code:'ABCDEFGH',hostId:'alex',status:'active',revision:217,tournament:{name:'Existing tournament',status:'paused'},game:{id:'game8',sheets:[{threes:9},{threes:12}]},members:[{userId:'alex',name:'Alex'},{userId:'sam',name:'Sam'}]};
 const before=structuredClone(room),{openSocial}=await import('../src/multiplayer/social-ui.js');await openSocial(room);
 expect(document.querySelector('[data-social-form=invite]')).toBeNull();
 expect(document.querySelector('.social-members').textContent).toContain('Member');
 document.querySelector('[data-social=play]').click();
 await vi.waitFor(()=>expect(mock.request).toHaveBeenCalledWith('play-create',expect.objectContaining({code:'ABCDEFGH',gameId:'game8',recipientId:'sam'})));
 await vi.waitFor(()=>expect(document.querySelector('.social-dialog').textContent).toContain('Waiting for a response'));
 expect(room).toEqual(before);
 expect(mock.request.mock.calls.some(([action])=>['invite-accept','resume','ready','command'].includes(action))).toBe(false);
});
