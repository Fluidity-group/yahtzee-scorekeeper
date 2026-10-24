import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {validateIosTestConfig} from '../scripts/ios-test-config.mjs';
import {rewritePreviewEntry} from './html.js';
const root=resolve(import.meta.dirname,'..');
if(!process.env.YAHTZ_PREVIEW_CONFIG)throw Error('Set YAHTZ_PREVIEW_CONFIG to the validated public-only phone-test configuration.');
const fields=validateIosTestConfig(readFileSync(process.env.YAHTZ_PREVIEW_CONFIG,'utf8'));
export default defineConfig({
 root,base:'/',envDir:resolve(root,'preview/empty-env'),envPrefix:'YAHTZ_PUBLIC_',
 resolve:{alias:{'#dice-panel':resolve(root,'src/dice/connection-ui.js')}},
 define:{...Object.fromEntries(Object.entries(fields).map(([key,value])=>['import.meta.env.'+key,JSON.stringify(value)])),'import.meta.env.MODE':'"ios-test"','import.meta.env.VITE_PUSH_ENABLED':'"false"','import.meta.env.VITE_COMMENTARY_URL':'""'},
 plugins:[{name:'amber-multiplayer-preview',transformIndexHtml:{order:'pre',handler:rewritePreviewEntry}}],
 server:{host:'192.168.1.148',port:8476,strictPort:true,watch:{ignored:[resolve(root,'artifacts/**').replaceAll('\\','/'),'**/dist-*/**']},fs:{strict:true,allow:[root,resolve(root,'node_modules')],deny:['**/.env*','**/.git/**',resolve(root,'artifacts/**').replaceAll('\\','/'),'**/.private/**']}},
 build:{outDir:'dist-phone-preview',emptyOutDir:true},
});
