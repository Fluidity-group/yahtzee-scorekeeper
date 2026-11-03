import {readFileSync,readdirSync,realpathSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';

// Required UI assets are a reviewed contract; optional camera runtimes stay separate.
export function verifyRequiredAssets(root, contract) {
  if (contract?.schemaVersion !== 1 || !Array.isArray(contract.assets) || !contract.assets.length) throw new Error('Invalid required asset contract.');
  const base=resolve(root,'public'),seen=new Set();
  for (const asset of contract.assets) {
    const name=asset.path;
    if(typeof name!=='string'||! /^[\w./-]+$/.test(name)||name.startsWith('/')||name.split('/').includes('..')||seen.has(name)||! /^[a-f0-9]{64}$/.test(asset.sha256||'')) throw new Error('Invalid required asset entry.');
    seen.add(name);
    const path=resolve(base,name);
    let bytes;
    try {
      const actual=relative(realpathSync(base),realpathSync(path));
      if(actual==='..'||actual.startsWith('..'+sep))throw Error('outside public');
      bytes=readFileSync(path);
    } catch {throw new Error('Required public asset missing or unreadable: '+name);}
    if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error('Required public asset changed: '+name+'. Review the asset and update its contract.');
  }
  function visit(dir,prefix='') {
    for(const entry of readdirSync(dir,{withFileTypes:true})) {
      const name=prefix+entry.name;
      if(name==='camera-assets'||entry.name==='README.md'||entry.name==='.DS_Store')continue;
      if(entry.isDirectory())visit(resolve(dir,entry.name),name+'/');
      else if(!seen.has(name))throw new Error('Public asset absent from required contract: '+name);
    }
  }
  visit(base);
  return {count:seen.size};
}
