import{readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,renameSync,existsSync,openSync,closeSync,unlinkSync}from'node:fs';import{resolve,join,relative,basename}from'node:path';import{createHash,sign,createPublicKey,verify}from'node:crypto';import{spawnSync}from'node:child_process';import{pathToFileURL}from'node:url';import{UPDATE_APP_ID,UPDATE_RUNTIME,MAX_BUNDLE_BYTES,validateUpdateConfig}from'../src/updates/policy.js';
export function packageUpdate({assets,output,metadata,privateKey,config,now=new Date()}){
 config=validateUpdateConfig(config);if(!config)throw Error('Provide the native build trust configuration.');
 const publicKey=createPublicKey({key:Buffer.from(config.publicKeySpki,'base64'),format:'der',type:'spki'});
 if(publicKey.asymmetricKeyType!=='rsa'||publicKey.asymmetricKeyDetails.modulusLength<2048)throw Error('Weak signing configuration.');
 assets=resolve(assets);output=resolve(output);if(output===assets||output.startsWith(assets+'/'))throw Error('Output must be outside public assets.');
 const identity=JSON.parse(readFileSync(join(assets,'build-identity.json'),'utf8'));
 if(identity.sourceState!=='clean'||!/^[a-f0-9]{40}$/.test(identity.commit)||!['native','ios-test'].includes(identity.profile)||!existsSync(join(assets,'index.html'))||existsSync(join(assets,'godice-evaluation.json')))throw Error('Package only a clean identified native test build.');
 if(identity.nativeBuild!==metadata.nativeBuild||!/^clubhouse-ios-updates-1:[a-f0-9]{64}$/.test(identity.nativeRuntime))throw Error('Native build/runtime identity is missing or mismatched.');
 if(!Number.isSafeInteger(metadata.sequence)||metadata.sequence<1||!/^\d+\.\d+\.\d+$/.test(metadata.version)||!/^\d+$/.test(metadata.nativeBuild)||typeof metadata.notes!=='string'||metadata.notes.length>1000)throw Error('Invalid release metadata.');
 let bytes=0,count=0;function walk(dir){for(const name of readdirSync(dir)){const p=join(dir,name),s=lstatSync(p);if(s.isSymbolicLink()||name.startsWith('.')||name.endsWith('.map')||!s.isDirectory()&&!s.isFile())throw Error('Refusing private or linked build assets.');if(s.isDirectory())walk(p);else{bytes+=s.size;count++;if(bytes>64*1024*1024||count>2000)throw Error('Expanded bundle exceeds limits.');if(/\.(?:js|json|html)$/.test(name)){const text=readFileSync(p,'utf8');if(/sb_secret_[\w-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))throw Error('Refusing secret-shaped public assets.');for(const token of text.matchAll(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g)){let role;try{role=JSON.parse(Buffer.from(token[0].split('.')[1],'base64url')).role;}catch{}if(role&&role!=='anon')throw Error('Refusing a nonpublic token in update assets.');}}}}}walk(assets);
 mkdirSync(join(output,'bundles'),{recursive:true});const lock=join(output,'.packaging.lock'),fd=openSync(lock,'wx'),temp=join(output,'bundles','.packaging.zip');
 try{
 const py="import pathlib,sys,zipfile\nr=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:\n for p in sorted(r.rglob('*')):\n  if p.is_file():\n   i=zipfile.ZipInfo(p.relative_to(r).as_posix(),(2026,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=0o100644<<16;z.writestr(i,p.read_bytes())\n";
 const zip=spawnSync('python3',['-c',py,assets,temp],{encoding:'utf8'});if(zip.status!==0)throw Error('ZIP creation failed.');
 const archive=readFileSync(temp),sha256=createHash('sha256').update(archive).digest('hex');if(archive.length>MAX_BUNDLE_BYTES)throw Error('Compressed bundle exceeds limits.');
 const publishedAt=now.toISOString(),expiresAt=new Date(now.getTime()+7*86400000).toISOString();
 const manifest={schema:1,appId:UPDATE_APP_ID,platform:'ios',runtime:identity.nativeRuntime,channel:config.channel,nativeBuild:metadata.nativeBuild,sequence:metadata.sequence,version:metadata.version,sourceCommit:identity.commit,bytes:archive.length,sha256,url:'bundles/'+sha256+'.zip',notes:metadata.notes,publishedAt,expiresAt};
 const payload=Buffer.from(JSON.stringify(manifest)),signature=sign('RSA-SHA256',payload,privateKey);
 if(!verify('RSA-SHA256',payload,publicKey,signature))throw Error('Signing key does not match the native verification key.');
 const envelope={payload:payload.toString('base64'),signature:signature.toString('base64')};renameSync(temp,join(output,'bundles',sha256+'.zip'));
 const filename=basename(new URL(config.manifestUrl).pathname);if(!/^[a-z0-9-]{1,40}\.json$/.test(filename))throw Error('Manifest URL must end in a static JSON filename.');const file=join(output,filename);writeFileSync(file+'.tmp',JSON.stringify(envelope)+'\n');renameSync(file+'.tmp',file);
 return{manifest,manifestFile:relative(output,file),files:count};
 }finally{if(existsSync(temp))unlinkSync(temp);closeSync(fd);unlinkSync(lock);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const[assets,output,metadataFile,publicConfigFile,signingFile]=process.argv.slice(2);if(!signingFile)throw Error('Usage: package-local-update <assets> <output> <metadata.json> <public-config.json> <signing-key-file>; administrator only, never put keys in Git/chat.');
 const result=packageUpdate({assets,output,metadata:JSON.parse(readFileSync(metadataFile,'utf8')),config:JSON.parse(readFileSync(publicConfigFile,'utf8')),privateKey:readFileSync(signingFile)});console.log(JSON.stringify({version:result.manifest.version,sequence:result.manifest.sequence,source:result.manifest.sourceCommit,archiveSha256:result.manifest.sha256,manifestFile:result.manifestFile,files:result.files}));
}
