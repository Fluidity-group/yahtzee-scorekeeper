import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {resolveConfig} from 'vite';
import {rewritePreviewEntry} from '../preview/html.js';
it('protects initial and timestamped bootstrap URLs before application imports',()=>{
 for(const url of ['/src/bootstrap.js','/src/bootstrap.js?t=123'])expect(rewritePreviewEntry(`<script type="module" src="${url}"></script>`)).toContain('src="/preview/entry.js"');
 expect(rewritePreviewEntry('<script src="/other.js"></script>')).toBe('<script src="/other.js"></script>');
 const entry=readFileSync(new URL('../preview/entry.js',import.meta.url),'utf8');
 expect(entry.indexOf('installLabUuid();')).toBeLessThan(entry.indexOf("await import('../src/bootstrap.js')"));expect(entry).not.toContain('homePreview');
});
it('allows the checkout inside an artifacts ancestor while denying its private output and env files',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'yahtz-preview-')),file=join(directory,'public.env'),prior=process.env.YAHTZ_PREVIEW_CONFIG;
 writeFileSync(file,'VITE_SUPABASE_URL=https://example.supabase.co\nVITE_SUPABASE_ANON_KEY=sb_publishable_fixture\nVITE_GAME_WEB_URL=https://example.test\n');
 process.env.YAHTZ_PREVIEW_CONFIG=file;
 try{
  const {default:config}=await import('../preview/vite.config.js');
  const resolved=await resolveConfig({...config,configFile:false},'serve');
  const path=p=>resolve(p).replaceAll('\\','/');
  expect(resolved.fsDenyGlob(path('index.html'))).toBe(false);
  expect(resolved.fsDenyGlob(path('src/prototype.js'))).toBe(false);
  expect(resolved.fsDenyGlob(path('artifacts/phone-preview/server.log'))).toBe(true);
  expect(resolved.fsDenyGlob(path('.env.ios-test.local'))).toBe(true);
 }finally{if(prior===undefined)delete process.env.YAHTZ_PREVIEW_CONFIG;else process.env.YAHTZ_PREVIEW_CONFIG=prior;unlinkSync(file);rmdirSync(directory);}
});
