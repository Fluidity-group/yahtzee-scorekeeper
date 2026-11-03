// Synthetic release qualification only. Never creates a deployment/private-key file.
import{generateKeyPairSync,webcrypto}from'node:crypto';import{existsSync,writeFileSync,unlinkSync,readFileSync,mkdirSync}from'node:fs';import{spawnSync}from'node:child_process';import{resolve}from'node:path';
import{validateIosTestConfig}from'./ios-test-config.mjs';import{packageUpdate}from'./package-local-update.mjs';import{verifyManifest,UPDATE_APP_ID}from'../src/updates/policy.js';
const file=resolve('.updates.local.json');if(existsSync(file))throw Error('A trust configuration exists. Run synthetic qualification in a separate clean worktree; never overwrite real trust settings.');
const input=process.argv[2];if(!input)throw Error('Provide the existing public-only phone configuration path.');
const env=validateIosTestConfig(readFileSync(input,'utf8')),keys=generateKeyPairSync('rsa',{modulusLength:2048}),config={manifestUrl:'https://updates.example.test/yahtzee/ios-test-synthetic.json',channel:'ios-test-synthetic',publicKeySpki:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')};
const assets='artifacts/sw079/synthetic-native',output='artifacts/sw079/synthetic-release';mkdirSync('artifacts/sw079',{recursive:true});
try{
 writeFileSync(file,JSON.stringify(config));
 const build=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--mode','ios-test','--outDir',assets],{env:{...process.env,...env},encoding:'utf8'});writeFileSync('artifacts/sw079/synthetic-build.log',(build.stdout||'')+'\n'+(build.stderr||''));if(build.status!==0)throw Error('Synthetic native web build failed; inspect its log.');
 const result=packageUpdate({assets,output,config,privateKey:keys.privateKey,metadata:{version:'1.0.1',sequence:1,nativeBuild:'79',notes:'Synthetic qualification only; never install on a real phone.'}}),identity=JSON.parse(readFileSync(assets+'/build-identity.json','utf8'));
 const approved=await verifyManifest(JSON.parse(readFileSync(output+'/'+result.manifestFile,'utf8')),config,{nativeInfo:{id:UPDATE_APP_ID,build:'79',version:'1.0'},runtime:identity.nativeRuntime,cryptoApi:webcrypto});
 if(approved.sourceCommit!==identity.commit)throw Error('Synthetic source identity differs.');
 const report={passed:true,source:identity,files:result.files,version:approved.version,sha256:approved.sha256,signatureVerified:true,nativeCompatibilityVerified:true,privateKeyWritten:false,realServerUsed:false,installablePhoneBuild:false,scope:'Actual clean configured iOS web build, deterministic ZIP and signed manifest verified with an ephemeral synthetic key; no real key/server, native compilation or phone.'};writeFileSync('artifacts/sw079/synthetic-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{unlinkSync(file);}
