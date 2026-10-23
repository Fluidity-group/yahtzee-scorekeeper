import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
export const baseline='1283973c170651292f87db154d65ae20d1c31529';
const states=['proposed','testing','accepted','rejected'];
export async function replaceReviewFile(temp,file,{rename=renameSync,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 for(let attempt=0;;attempt++)try{rename(temp,file);return;}catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=6)throw error;await sleep(25*(attempt+1));}
}
export function validateFeedback(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid change request.');
 const clean={};for(const [key,max]of Object.entries({screen:100,title:180,details:5000,acceptance:2000})){if(typeof value[key]!=='string'||value[key].length>max)throw Error('Check '+key);clean[key]=value[key].trim();}
 if(!clean.title||!clean.screen)throw Error('Add a screen and a short title.');
 if(!['ui','playability','bug'].includes(value.kind)||!states.includes(value.status))throw Error('Invalid change type or status.');
 return {...clean,kind:value.kind,status:value.status};
}
export function labApi(root){
 const dir=resolve(root,'artifacts/amber-lab'),file=resolve(dir,'requests.json');
 const read=()=>existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];
 let writes=Promise.resolve();
 const persist=(input,value)=>{const pending=writes.catch(()=>{}).then(async()=>{
  const requests=read();let record;
  if(input.id){record=requests.find(r=>r.id===input.id);if(!record)throw Error('Change request not found.');Object.assign(record,value,{updatedAt:new Date().toISOString()});}
  else{record={...value,id:randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};requests.push(record);}
  mkdirSync(dir,{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify(requests,null,2));
  try{await replaceReviewFile(temp,file);}finally{if(existsSync(temp))unlinkSync(temp);}
  return record;
 });writes=pending;return pending;};
 const send=(res,code,value)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
 return {name:'amber-lab-api',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 const path=(req.url||'').split('?')[0];if(!path.startsWith('/__lab/'))return next();
 if(path==='/__lab/status'&&req.method==='GET'){
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:3000}).trim();
 return send(res,200,{name:'Amber playable UI lab',baseline,branch:git(['branch','--show-current']),head:git(['rev-parse','--short','HEAD']),changes:git(['status','--short']).split('\n').filter(Boolean),liveReload:true,online:'disabled',reference:'http://192.168.1.148:8473/review/'});
 }
 if(path!=='/__lab/requests')return send(res,404,{error:'Unknown lab route.'});
 if(req.method==='GET')return send(res,200,{requests:read()});
 if(req.method!=='POST')return send(res,405,{error:'Use GET or POST.'});
 // Browser writes require the same origin and a custom header. No CORS or arbitrary file writes.
 if(req.headers.origin!==`http://${req.headers.host}`||req.headers['x-amber-lab']!=='review'||!String(req.headers['content-type']).startsWith('application/json'))return send(res,403,{error:'Open the lab on this server to save a request.'});
 try{
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)return send(res,413,{error:'Request too large.'});}
 const input=JSON.parse(raw),value=validateFeedback(input),record=await persist(input,value);return send(res,200,{record});
 }catch(error){return send(res,400,{error:error.message});}
 });}};
}
