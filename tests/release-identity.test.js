import {it,expect,afterEach} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readBuildIdentity} from '../scripts/build-identity.mjs';
import {verifyRequiredAssets} from '../scripts/required-assets.mjs';
const roots=[];
function fixture(){const root=mkdtempSync(join(tmpdir(),'yahtz build '));roots.push(root);mkdirSync(join(root,'public'));writeFileSync(join(root,'public','art.svg'),'art');return root;}
const contract=()=>({schemaVersion:1,assets:[{path:'art.svg',sha256:createHash('sha256').update('art').digest('hex')}]});
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
it('identifies a source edit at the same commit without disclosing environment data',()=>{
 const root=fixture();writeFileSync(join(root,'game.js'),'before');
 const git=args=>args[0]==='rev-parse'?'a'.repeat(40):args[0]==='status'?' M game.js\n':'game.js\0';
 const before=readBuildIdentity(root,'ios-test',git);writeFileSync(join(root,'game.js'),'after');
 const after=readBuildIdentity(root,'ios-test',git);
 expect(after.commit).toBe(before.commit);expect(after.sourceSha256).not.toBe(before.sourceSha256);expect(after.sourceState).toBe('modified');expect(after.profile).toBe('ios-test');
 expect(Object.keys(after).sort()).toEqual(['schemaVersion','commit','sourceState','sourceSha256','profile'].sort());
 expect(readBuildIdentity(root,'native',args=>args[0]==='status'?'':git(args)).sourceState).toBe('clean');
 expect(()=>readBuildIdentity(root,'native',()=> 'unknown')).toThrow(/commit/);
});
it('blocks a missing or altered required asset even if the source commit is unchanged',()=>{
 const root=fixture();expect(verifyRequiredAssets(root,contract())).toEqual({count:1});
 writeFileSync(join(root,'public','art.svg'),'other');expect(()=>verifyRequiredAssets(root,contract())).toThrow(/changed/);
 rmSync(join(root,'public','art.svg'));expect(()=>verifyRequiredAssets(root,contract())).toThrow(/missing/);
});
it('requires a deliberate contract for new public assets but does not require optional camera runtimes',()=>{
 const root=fixture();mkdirSync(join(root,'public','camera-assets'));writeFileSync(join(root,'public','camera-assets','optional.wasm'),'optional');
 expect(()=>verifyRequiredAssets(root,contract())).not.toThrow();
 writeFileSync(join(root,'public','portrait.webp'),'new');expect(()=>verifyRequiredAssets(root,contract())).toThrow(/absent.*portrait/);
});
it('rejects ambiguous or escaping required asset contracts',()=>{
 const root=fixture(),c=contract();
 expect(()=>verifyRequiredAssets(root,{...c,assets:[c.assets[0],c.assets[0]]})).toThrow(/Invalid/);
 expect(()=>verifyRequiredAssets(root,{...c,assets:[{...c.assets[0],path:'../outside'}]})).toThrow(/Invalid/);
 expect(()=>verifyRequiredAssets(root,{schemaVersion:1,assets:[]})).toThrow(/Invalid/);
});
