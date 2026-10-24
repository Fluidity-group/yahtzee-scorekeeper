import {it,expect} from 'vitest';
import {resolveConfig} from 'vite';
import {resolve} from 'node:path';
import config from '../lab/vite.config.js';
it('serves app/workbench source but denies ignored output, private data, env and Git',async()=>{
 const resolved=await resolveConfig({...config,configFile:false},'serve');
 const denied=path=>resolved.fsDenyGlob(resolve(path).replaceAll('\\','/'));
 for(const path of ['index.html','src/prototype.js','lab/index.html'])expect(denied(path),path).toBe(false);
 for(const path of ['artifacts/amber-lab/requests.json','artifacts/phone-preview/server.log','.private/test.txt','.env.ios-test.local','.git/config'])expect(denied(path),path).toBe(true);
});
