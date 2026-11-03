import{readFileSync}from'node:fs';import{resolve}from'node:path';import{createHash}from'node:crypto';
export function nativeUpdateIdentity(root,config,appConfig={}){
 const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')),hash=createHash('sha256');
 for(const file of ['src/core-store.js','src/db.js','capacitor.config.json','ios/App/App/Info.plist','ios/App/App/AppDelegate.swift','ios/App/App/SceneDelegate.swift','ios/App/App.xcodeproj/project.pbxproj','ios/App/CapApp-SPM/Package.swift'])hash.update(file+'\0').update(readFileSync(resolve(root,file)));
 hash.update(JSON.stringify(Object.fromEntries(Object.entries(pkg.dependencies).filter(([name])=>name.startsWith('@capacitor/')||name.startsWith('@capgo/'))))).update(JSON.stringify(config)).update(JSON.stringify(appConfig));
 const builds=[...readFileSync(resolve(root,'ios/App/App.xcodeproj/project.pbxproj'),'utf8').matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map(m=>m[1]);if(!builds.length||new Set(builds).size!==1)throw Error('Native build identities differ.');
 return{nativeBuild:builds[0],nativeRuntime:'clubhouse-ios-updates-1:'+hash.digest('hex')};
}
