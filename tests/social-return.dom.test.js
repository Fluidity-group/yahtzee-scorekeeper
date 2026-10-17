// @vitest-environment jsdom
import{it,expect,vi}from'vitest';
const mock=vi.hoisted(()=>({request:vi.fn(),room:{id:'room',code:'ABCDEFGH',revision:217,status:'active',hostId:'alex',members:[{userId:'alex',name:'Alex'},{userId:'sam',name:'Sam'}],game:{id:'game8',revision:7,status:'active',rules:{version:1}},tournament:{name:'Saved tournament',status:'paused',gameCount:12},capabilities:{tournaments:true}}}));
vi.mock('../src/multiplayer/client.js',()=>({auth:{getSession:async()=>({data:{session:{user:{id:'sam',email:'sam@example.com'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},configured:true,webUrl:'https://example.com',emailOtpEnabled:true,watchRoom:()=>()=>{},requestRoom:async payload=>{mock.request(payload);return{room:structuredClone(mock.room)};}}));
it('opens a notification destination as an existing seat without joining or resuming',async()=>{
 const root=document.createElement('div');document.body.append(root);const game=vi.fn(),{openOnline,leaveOnline}=await import('../src/multiplayer/ui.js');
 await openOnline(root,{game,account:vi.fn(),notice:vi.fn(),table:vi.fn()},'ABCDEFGH','return-table');
 expect(mock.request.mock.calls).toEqual([[{operation:'read',code:'ABCDEFGH'}]]);
 expect(game).toHaveBeenCalledWith(expect.objectContaining({revision:217,tournament:expect.objectContaining({status:'paused'}),members:mock.room.members}),'sam',true,true);
 expect(mock.room.members).toHaveLength(2);leaveOnline();
});
