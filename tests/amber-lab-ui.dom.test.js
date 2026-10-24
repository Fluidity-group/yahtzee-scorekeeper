// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
it('lets a tester save a request, revise its decision, resize the real preview and export the queue',async()=>{
 document.documentElement.innerHTML=readFileSync(resolve('lab/index.html'),'utf8');
 Element.prototype.scrollIntoView=vi.fn();const records=[];
 vi.stubGlobal('fetch',vi.fn(async(path,options)=>{
 if(path.endsWith('status'))return {ok:true,json:async()=>({branch:'codex/amber-ui-lab',head:'test',baseline:'1283973',liveReload:true,online:'disabled',changes:[]})};
 if(options?.method==='POST'){expect(options.headers['X-Amber-Lab']).toBe('review');const input=JSON.parse(options.body);const record={...input,id:input.id||'request-1'};const index=records.findIndex(r=>r.id===record.id);if(index<0)records.push(record);else records[index]=record;return{ok:true,json:async()=>({record})};}
 return {ok:true,json:async()=>({requests:[...records]})};
 }));
 URL.createObjectURL=vi.fn(()=> 'blob:review');URL.revokeObjectURL=vi.fn();document.addEventListener('click',e=>{if(e.target.matches('a[download]'))e.preventDefault();});
 await import('../lab/workbench.js');
 const form=document.querySelector('#request');for(const [key,value]of Object.entries({screen:'Scorecard',title:'Larger total',details:'Read without zoom',acceptance:'393px',kind:'ui',status:'proposed'}))form.elements.namedItem(key).value=value;
 form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(document.querySelector('#save-state').textContent).toContain('Saved on the ROG'));
 expect(records).toHaveLength(1);document.querySelector('.request-card button').click();form.elements.namedItem('status').value='accepted';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(records[0].status).toBe('accepted'));expect(records).toHaveLength(1);
 const width=document.querySelector('#width');width.value='320';width.dispatchEvent(new Event('change'));expect(document.querySelector('.phone').style.width).toBe('334px');
 document.querySelector('#export').click();expect(URL.createObjectURL).toHaveBeenCalled();
 expect(document.querySelector('#game').getAttribute('src')).toBe('/');
});
