import {describe,it,expect} from 'vitest';
import {resolve} from 'node:path';
import {resolveConfig} from 'vite';
import config from '../vite.config.js';

describe('native build distribution contract',()=>{
 for(const mode of ['production','native'])it(`${mode} uses the supported generic panel without private distribution marker`,()=>{
  const result=config({mode});
  expect(result.resolve.alias['#dice-panel']).toBe(resolve('src/dice/connection-ui.js'));
  expect(result.plugins.some(p=>p.name==='local-dice-evaluation')).toBe(false);
 });
 it('explicit native evaluation uses private panel and emits the publication guard marker',()=>{
  const result=config({mode:'native-evaluation'});
  expect(result.resolve.alias['#dice-panel']).toBe(resolve('local-evaluation/godice/panel.js'));
  const assets=[];result.plugins.find(p=>p.name==='local-dice-evaluation').generateBundle.call({emitFile:a=>assets.push(a)});
  expect(assets).toEqual([{type:'asset',fileName:'godice-evaluation.json',source:JSON.stringify({distribution:'local-android-evaluation'})}]);
 });
 for(const mode of ['native','native-evaluation'])it(`${mode} uses root assets and disables service-worker updates`,async()=>{
  const result=await resolveConfig({mode},'build');expect(result.base).toBe('/');
  const pwa=result.plugins.flat().find(p=>p.name==='vite-plugin-pwa');
  expect(pwa.api.disabled).toBe(true);
 });
});
