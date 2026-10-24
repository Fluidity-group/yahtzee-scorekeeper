import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateIosTestConfig} from '../scripts/ios-test-config.mjs';
const fields=validateIosTestConfig(readFileSync(process.env.YAHTZ_PREVIEW_CONFIG,'utf8'));
const base='http://192.168.1.148:8476';
async function get(path){const r=await fetch(base+path);if(!r.ok)throw Error(path+' returned '+r.status);return r.text();}
const html=await get('/'),entry=await get('/preview/entry.js'),client=await get('/src/multiplayer/client.js'),style=await get('/src/ui/slot-cabinet.css');
if(!html.includes('/preview/entry.js'))throw Error('Missing protected preview entry');
if(entry.includes('homePreview')||entry.includes('setHomeAccountPreview'))throw Error('Fictional profile injection found');
if(!client.includes(fields.VITE_SUPABASE_URL)||!client.includes(fields.VITE_SUPABASE_ANON_KEY))throw Error('Public multiplayer configuration mismatch');
if(!style.includes('slot-bulb-chase'))throw Error('Latest cabinet styling missing');
const denied=await fetch(base+'/@fs/'+resolve('artifacts/phone-preview/server.log').replaceAll('\\','/'));
if(denied.status!==403)throw Error('Artifact access must be denied');
const report={at:new Date().toISOString(),url:base,htmlEntry:true,secureUuidEntry:true,realPublicBackendConfigured:true,fictionalProfileInjected:false,latestCabinetServed:true,privateArtifactAccessDenied:true,visualOrPhoneTest:false};
mkdirSync('artifacts/phone-preview',{recursive:true});writeFileSync('artifacts/phone-preview/http-check.json',JSON.stringify(report,null,2));console.log('HTTP scripts/styles passed; real public backend configured; fictional profile absent; private artifacts denied.');
