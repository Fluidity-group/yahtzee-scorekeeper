// Read only the validated public app configuration; never print configuration values.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateIosTestConfig} from './ios-test-config.mjs';
const input=process.argv[2];if(!input)throw Error('Provide the existing validated public-only app configuration path.');
const values=validateIosTestConfig(readFileSync(resolve(input),'utf8'));
if(new URL(values.VITE_SUPABASE_URL).host!=='ezgawsdmvuoqrxlfbgen.supabase.co')throw Error('Public configuration points to a different backend project.');
const target='https://fluidity-group.github.io/yahtzee-scorekeeper/';
values.VITE_GAME_WEB_URL=target;values.VITE_PUBLIC_BASE='/yahtzee-scorekeeper/';
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{cwd:process.cwd(),env:{...process.env,...values},stdio:'inherit'});
if(result.status!==0)throw Error('Studio web build failed.');
const identity=JSON.parse(readFileSync('dist/build-identity.json','utf8'));
if(identity.sourceState!=='clean')throw Error('Publish only a clean source build.');
const publicConfigurationSha256=createHash('sha256').update(JSON.stringify(values)).digest('hex');
mkdirSync('artifacts/sw078',{recursive:true});writeFileSync('artifacts/sw078/web-build.json',JSON.stringify({source:identity,target,publicConfigurationSha256,pushEnabled:values.VITE_PUSH_ENABLED==='true',commentaryEnabled:!!values.VITE_COMMENTARY_URL,scope:'Validated public-only production web build. No deployment or phone installation.'},null,2)+'\n');
console.log('Prepared clean Studio web build; public-only configuration validated, push disabled, live commentary deferred.');
