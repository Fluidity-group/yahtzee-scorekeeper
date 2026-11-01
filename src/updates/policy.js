export const UPDATE_RUNTIME=typeof __YAHTZ_UPDATE_RUNTIME__==='undefined'?'clubhouse-ios-updates-1':__YAHTZ_UPDATE_RUNTIME__;
export const UPDATE_APP_ID='com.fluiditygroup.diceclubhouse.dev';
export const MAX_BUNDLE_BYTES=32*1024*1024;
const bad=message=>{throw Error(message);};
export function newerVersion(next,current){
 const parse=v=>{if(typeof v!=='string'||!/^\d+\.\d+(?:\.\d+)?$/.test(v))bad('Unreadable app version.');const p=v.split('.').map(Number);while(p.length<3)p.push(0);if(!p.every(Number.isSafeInteger))bad('Invalid app version.');return p;};
 const a=parse(next),b=parse(current);for(let n=0;n<3;n++){if(a[n]!==b[n])return a[n]>b[n];}return false;
}
export function trustedUrl(value,base){
 const url=new URL(value,base);
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search)bad('Updates require a plain HTTPS address.');
 if(base){const root=new URL('.',base);if(url.origin!==root.origin||!url.pathname.startsWith(root.pathname))bad('Update address is outside the approved server.');}
 return url.href;
}
export function validateUpdateConfig(config){
 if(config===null||config===undefined)return null;
 if(!config||Object.keys(config).sort().join(',')!=='channel,manifestUrl,publicKeySpki')bad('Invalid update configuration.');
 if(!/^[a-z0-9-]{1,40}$/.test(config.channel)||typeof config.publicKeySpki!=='string'||!/^[A-Za-z0-9+/]{350,1600}={0,2}$/.test(config.publicKeySpki))bad('Invalid update trust configuration.');
 return {...config,manifestUrl:trustedUrl(config.manifestUrl)};
}
export const base64Bytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export async function verifyManifest(envelope,config,{nativeInfo,highest=0,now=Date.now(),cryptoApi=globalThis.crypto,runtime=UPDATE_RUNTIME,runningVersion=nativeInfo?.version}={}){
 config=validateUpdateConfig(config);if(!config)bad('Local updates are not configured for this build.');
 if(!envelope||typeof envelope.payload!=='string'||typeof envelope.signature!=='string'||envelope.payload.length>16000||envelope.signature.length>1400)bad('Unreadable update manifest.');
 let bytes,valid=false;
 try{bytes=base64Bytes(envelope.payload);const key=await cryptoApi.subtle.importKey('spki',base64Bytes(config.publicKeySpki),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);if(key.algorithm.modulusLength<2048)bad('Weak update key.');valid=await cryptoApi.subtle.verify('RSASSA-PKCS1-v1_5',key,base64Bytes(envelope.signature),bytes);}catch{bad('Update signature could not be verified.');}
 if(!valid)bad('Update signature could not be verified.');
 let m;try{m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{bad('Unreadable signed update.');}
 if(!m||m.schema!==1||m.appId!==UPDATE_APP_ID||m.platform!=='ios'||m.runtime!==runtime||m.channel!==config.channel||m.nativeBuild!==nativeInfo?.build||nativeInfo.id!==UPDATE_APP_ID)bad('This update needs a different native app build.');
 if(!Number.isSafeInteger(m.sequence)||m.sequence<=0||!/^\d+\.\d+\.\d+$/.test(m.version)||!/^[a-f0-9]{40}$/.test(m.sourceCommit)||!/^[a-f0-9]{64}$/.test(m.sha256)||!Number.isSafeInteger(m.bytes)||m.bytes<=0||m.bytes>MAX_BUNDLE_BYTES||typeof m.notes!=='string'||m.notes.length>1000)bad('Invalid update version or bundle information.');
 if(!Number.isFinite(Date.parse(m.expiresAt))||!Number.isFinite(Date.parse(m.publishedAt))||Date.parse(m.publishedAt)>now+300000||Date.parse(m.expiresAt)<=now||Date.parse(m.expiresAt)<=Date.parse(m.publishedAt))bad('Update manifest has expired or is not yet valid.');
 if(m.sequence<=highest||!newerVersion(m.version,runningVersion))bad('No newer approved update is available.');
 return {...m,url:trustedUrl(m.url,config.manifestUrl)};
}
