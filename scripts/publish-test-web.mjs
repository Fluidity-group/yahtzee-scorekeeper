// Publishes built assets only, using an isolated checkout. Never changes the
// user's working branch, source commits, or unrelated development sessions.
import { execFileSync,spawnSync } from 'node:child_process';
import { resolve,join,sep } from 'node:path';
import { existsSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync,cpSync } from 'node:fs';
const repo='FluidityGroup-Git/yahtzee-scorekeeper';
const root=resolve('artifacts/pages-publish'),dist=resolve('dist'),marker=join(root,'.codex-pages-workspace');
if(!existsSync(join(dist,'index.html')))throw new Error('Build the web app first.');
if(existsSync(join(dist,'godice-evaluation.json')))throw new Error('Refusing to publish a local GoDice evaluation build.');
if(existsSync(root)&&(!existsSync(marker)||readFileSync(marker,'utf8')!==repo))throw new Error('Refusing to reuse an unrecognised publishing directory.');
mkdirSync(root,{recursive:true});writeFileSync(marker,repo);
const git=(...args)=>execFileSync('git',['-C',root,'-c','credential.helper=','-c','credential.helper=!gh auth git-credential',...args],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
if(!existsSync(join(root,'.git'))){git('init','-b','gh-pages');git('remote','add','origin',`https://github.com/${repo}.git`);}
if(git('remote','get-url','origin').trim()!==`https://github.com/${repo}.git`)throw new Error('Unexpected publishing remote.');
const remote=git('ls-remote','--heads','origin','refs/heads/gh-pages').trim();
if(remote){git('fetch','origin','gh-pages');git('switch','-C','gh-pages','FETCH_HEAD');}
for(const name of readdirSync(root)){
 if(['.git','.codex-pages-workspace'].includes(name))continue;
 const target=resolve(root,name);if(!target.startsWith(root+sep))throw new Error('Invalid publishing path.');
 rmSync(target,{recursive:true,force:true});
}
cpSync(dist,root,{recursive:true});writeFileSync(join(root,'.nojekyll'),'');
writeFileSync(join(root,'.gitignore'),'.codex-pages-workspace\n');
git('add','--all');
if(git('status','--porcelain').trim()){
 git('-c','user.name=Codex','-c','user.email=codex@users.noreply.github.com','commit','-m','Publish QR multiplayer test build');
 git('push','origin','HEAD:refs/heads/gh-pages');
}
const pages=spawnSync('gh',['api',`repos/${repo}/pages`],{encoding:'utf8'});
if(pages.status!==0){
 if(!pages.stderr.includes('404'))throw new Error(pages.stderr);
 const created=spawnSync('gh',['api',`repos/${repo}/pages`,'--method','POST','--input','-'],{input:JSON.stringify({source:{branch:'gh-pages',path:'/'}}),encoding:'utf8'});
 // Pushing the first gh-pages branch can enable Pages before the POST finishes.
 if(created.status!==0&&!created.stderr.includes('409'))throw new Error(created.stderr);
}
console.log('Published assets. GitHub Pages may take a minute to finish deployment.');
console.log('https://fluiditygroup-git.github.io/yahtzee-scorekeeper/');
