import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {labApi} from './server.js';
const root=resolve(import.meta.dirname,'..');
// This config intentionally does not load the normal .env files, PWA or paid-provider proxy.
export default defineConfig({
 root,base:'/',envDir:resolve(root,'lab/empty-env'),envPrefix:'AMBER_PUBLIC_',
 resolve:{alias:{'#dice-panel':resolve(root,'src/dice/connection-ui.js')}},
 define:{'import.meta.env.MODE':JSON.stringify('ios-test'),'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""','import.meta.env.VITE_GAME_WEB_URL':JSON.stringify('http://192.168.1.148:8475/'),'import.meta.env.VITE_COMMENTARY_URL':'""','import.meta.env.VITE_EMAIL_OTP_ENABLED':'"false"'},
 plugins:[labApi(root),{name:'amber-lab-entry',transformIndexHtml(html,ctx){return ctx.path==='/lab/index.html'?html:html.replace('src="/src/bootstrap.js"','src="/lab/entry.js"');}}],
 server:{host:'192.168.1.148',port:8475,strictPort:true,fs:{strict:true,allow:[root,resolve(root,'node_modules')]}},
 build:{outDir:'dist-lab',emptyOutDir:true},
});
