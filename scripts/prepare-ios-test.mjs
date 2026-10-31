import{readFileSync,existsSync}from'node:fs';
import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';
import{dirname,resolve}from'node:path';
import{validateIosTestConfig}from'./ios-test-config.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mac=process.platform==='darwin',check=process.argv.includes('--check');
if(Number(process.versions.node.split('.')[0])!==24)throw Error('Use Node.js 24 for this test build.');
const path=resolve(root,'.env.ios-test.local');
if(!existsSync(path))throw Error('Missing .env.ios-test.local. Use the public configuration supplied with the Mac test handoff.');
const fields=validateIosTestConfig(readFileSync(path,'utf8'));
for(const pkg of['core','cli','ios']){const version=JSON.parse(readFileSync(resolve(root,'node_modules/@capacitor/'+pkg+'/package.json'),'utf8')).version;if(version!=='8.5.2')throw Error('Expected Capacitor '+pkg+' 8.5.2, found '+version);}
const ios=JSON.parse(readFileSync(resolve(root,'capacitor.config.json'),'utf8'));
if(JSON.stringify(ios.ios?.includePlugins)!==JSON.stringify(['@capacitor/app','@capacitor/haptics','@capacitor/push-notifications','@capacitor/status-bar']))throw Error('Only qualified App, Haptics, Push and StatusBar adapters belong in the manual iOS target.');
console.log('Node '+process.versions.node+'; Capacitor 8.5.2; public app config valid; voice disabled.');
console.log('Multiplayer backend: '+new URL(fields.VITE_SUPABASE_URL).hostname+' (no keys printed).');
if(mac){const r=spawnSync('xcodebuild',['-version'],{encoding:'utf8'});if(r.status!==0)throw Error('Open Xcode once to finish its setup, then select Xcode in Settings > Locations > Command Line Tools.');const match=r.stdout.match(/Xcode\s+(\d+)/);if(!match||Number(match[1])<26)throw Error('Xcode 26 or later is required by this Capacitor target.');console.log(r.stdout.trim());}
else console.log('This host cannot compile/sign an iPhone app. Only source/web assets can be prepared here.');
if(check)process.exit(0);
function run(args){const r=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,...fields},stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
run(['node_modules/vite/bin/vite.js','build','--mode','ios-test','--outDir','dist-native']);
run(['node_modules/@capacitor/cli/bin/capacitor','sync','ios']);
console.log(mac?'iOS project prepared. Open ios/App/App.xcodeproj, select your signing team and iPhone, then Run.':'iOS source/assets prepared. Xcode compilation, signing and physical iPhone acceptance remain pending on the Mac.');
