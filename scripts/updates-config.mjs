import{readFileSync,existsSync}from'node:fs';import{resolve}from'node:path';import{createPublicKey}from'node:crypto';import{validateUpdateConfig}from'../src/updates/policy.js';
export function readUpdateConfig(root,mode){
 if(!['native','ios-test'].includes(mode))return null;
 const file=resolve(root,'.updates.local.json');if(!existsSync(file))return null;
 const config=validateUpdateConfig(JSON.parse(readFileSync(file,'utf8'))),key=createPublicKey({key:Buffer.from(config.publicKeySpki,'base64'),format:'der',type:'spki'});
 if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<2048)throw Error('Use an RSA update verification key of at least 2048 bits.');
 return config;
}
