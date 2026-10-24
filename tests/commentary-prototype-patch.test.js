import { describe, expect, it } from 'vitest';
import { transformWithEsbuild } from 'vite';
import { applyCommentaryPrototypePatch } from '../scripts/apply-sprint2-commentary-ui.mjs';
const baseline = `import { saveCore, loadCore, listCore } from './core-store.js';
const hardwareCapture=new AutomaticCapture();
function nameInputs(n){return '';}
function header(){return '<button class="hbtn" data-action="history">History</button><a class="hbtn" href="?legacy=1">Original game</a><a class="core-legacy" href="?legacy=1">Open original two-player game &amp; existing saves</a><a class="core-legacy" href="?legacy=1">Original game history</a>';}
async function create(f){await persist(createCoreGame({names:f.getAll('player'),mode:f.get('mode'),source:f.get('source'),...(f.get('mode')==='competition'&&f.get('source')==='manual'?{rulesVersion:2}:{}),hideTotals:f.has('hideTotals'),id:id()}));}
if(a==='camera-settings'||a==='capture-camera'){}
`;
describe('lead-source commentary patch isolation',()=>{
 it('adds app entry points without touching a concurrent phone scorecard implementation',async()=>{
  const phoneMarker='\n// concurrent phone scorecard integration sentinel\nconst phoneScorecardSentinel = true;\n';
  const patched=applyCommentaryPrototypePatch(baseline+phoneMarker);
  expect(patched).toContain(phoneMarker);expect(patched).not.toContain('href="?legacy=1"');
  expect(patched).toContain('data-action="commentary-settings"');expect(patched).toContain('commentarySession.setPlayers(created.id,playerDrafts)');
  expect(patched).toContain('scoreDialog:dialog');expect(patched).not.toContain('accountId:');
  await expect(transformWithEsbuild(patched,'prototype.js',{loader:'js'})).resolves.toHaveProperty('code');
 });
 it('fails before writing if integration anchors drift or the patch is already present',()=>{
  expect(()=>applyCommentaryPrototypePatch('unrelated file')).toThrow('anchor');
  expect(()=>applyCommentaryPrototypePatch(applyCommentaryPrototypePatch(baseline))).toThrow('already applied');
 });
});
