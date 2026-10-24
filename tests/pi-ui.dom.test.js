// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';import fs from 'node:fs';
import {createCoreGame,command} from '../src/game/core.js';
it('labels a frozen frame, retains a failed save and retries the same command without changing the review',async()=>{
 const html=fs.readFileSync('device/pi/web/index.html','utf8');document.body.innerHTML=html.replace(/<script[\s\S]*?<\/script>/g,'');
 localStorage.clear();sessionStorage.clear();localStorage.setItem('pi-table-session',JSON.stringify({id:'room',token:'test-token'}));
 const game=command(createCoreGame({id:'room',names:['Alice'],source:'manual-faces'}),{type:'start',seat:0},{id:'firstturn'});
 let state={id:'room',code:'CODE',seat:0,revision:1,names:['Alice'],game,devices:[{id:'device',label:'Tray',seats:[0]}],categories:[],totals:{totals:[0],winners:[0]},options:null,proposal:null};
 const observation={image:'data:image/png;base64,AAAA',mediaOrigin:'replay',dice:[1,2,3,4,5].map((value,i)=>({value,x:.2+i*.1,y:.5})),rejected:[]};
 const requests=[];let failed=false;
 vi.stubGlobal('fetch',vi.fn(async(url,opts)=>{
  let result;
  if(url.endsWith('/qr'))result={image:'data:image/png;base64,AAAA'};
  else if(url.includes('/preview'))result=observation;
  else if(url.endsWith('/freeze')){state={...state,proposal:{id:'proposal',observation}};result=state.proposal;}
  else if(opts.method==='POST'){
   const request=JSON.parse(opts.body);requests.push(request);if(!failed){failed=true;throw new TypeError('Offline');}
   state={...state,proposal:null,revision:2,game:command(state.game,{...request.action,seat:0},{id:request.commandId})};result=state;
  }else result=state;
  return {ok:true,json:async()=>structuredClone(result)};
 }));
 vi.spyOn(globalThis,'setInterval').mockImplementation(()=>0);
 try{
  await import('../device/pi/web/client.js');const $=id=>document.getElementById(id);
  await vi.waitFor(()=>expect($('table').hidden).toBe(false));$('preview').click();await vi.waitFor(()=>expect($('frameImage').src).toContain('AAAA'));
  $('freezeCamera').click();await vi.waitFor(()=>expect($('cameraStatus').textContent).toContain('Frozen'));
  $('frameImage').getBoundingClientRect=()=>({left:0,top:0,width:1000,height:500});
  for(let i=0;i<5;i++){$('frameImage').dispatchEvent(new MouseEvent('click',{clientX:200+i*100,clientY:250}));$('values').children[i].click();}
  expect($('acceptCamera').disabled).toBe(false);$('acceptCamera').click();await vi.waitFor(()=>expect($('notice').textContent).toContain('Connection lost'));
  const saved=JSON.parse(sessionStorage.getItem('pi-pending'));expect(saved.action.labels).toHaveLength(5);expect(saved.action.dice).toEqual([1,2,3,4,5]);
  $('acceptCamera').click();await vi.waitFor(()=>expect($('notice').textContent).toContain('Saved on'));
  expect(requests[1]).toEqual(requests[0]);expect(state.game.turn.rolls).toHaveLength(1);expect(sessionStorage.getItem('pi-pending')).toBeNull();expect($('cameraStatus').textContent).toBe('Review closed.');
 }finally{vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear();sessionStorage.clear();}
});
