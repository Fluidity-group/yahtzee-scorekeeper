import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const release=process.argv[2]||'dice-pi-'+new Date().toISOString().replace(/[:.]/g,'-');
if(!/^[a-zA-Z0-9._-]+$/.test(release))throw Error('Invalid release name');
const out=path.resolve('artifacts/pi-releases',release);if(fs.existsSync(out))throw Error('Release directory already exists');fs.mkdirSync(out,{recursive:true});
function copy(file){const target=path.join(out,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
for(const dir of ['device/pi','src/game','src/dice/camera']){
 const walk=root=>{for(const e of fs.readdirSync(root,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='__pycache__')continue;const p=path.join(root,e.name);if(e.isDirectory())walk(p);else if(/\.(js|mjs|py|html|css|json|md|sh|service|yaml)$/.test(p)||e.name==='Dockerfile'||e.name==='Caddyfile')copy(p);}};walk(dir);
}
copy('docs/raspberry-pi-game-design.md');copy('docs/pi-hardware-handoff.md');
for(const f of ['opencv.js','OPENCV-LICENSE.txt'])copy('public/camera-assets/'+f);
const copied=new Set();function dependency(name,from){const req=createRequire(from);const pkgPath=req.resolve(name+'/package.json');const root=path.dirname(pkgPath);if(copied.has(root))return;copied.add(root);const rel=path.relative(process.cwd(),root);if(rel.startsWith('..'))throw Error('Dependency outside workspace');fs.cpSync(root,path.join(out,rel),{recursive:true});const pkg=JSON.parse(fs.readFileSync(pkgPath));for(const child of Object.keys(pkg.dependencies||{}))dependency(child,pkgPath);}
for(const name of ['pngjs','qrcode'])dependency(name,path.resolve('package.json'));
const files=[];function list(root){for(const e of fs.readdirSync(root,{withFileTypes:true})){const p=path.join(root,e.name);if(e.isDirectory())list(p);else files.push({path:path.relative(out,p).replaceAll('\\','/'),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')});}}list(out);
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify({private:true,type:'module',engines:{node:'>=24 <25'}}));
files.push({path:'package.json',sha256:createHash('sha256').update(fs.readFileSync(path.join(out,'package.json'))).digest('hex')});
fs.writeFileSync(path.join(out,'release-manifest.json'),JSON.stringify({release,at:new Date().toISOString(),files},null,2));console.log(out);
