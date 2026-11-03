import{Capacitor}from'@capacitor/core';import{createUpdateController}from'./controller.js';
const config=typeof __YAHTZ_UPDATE_CONFIG__==='undefined'?null:__YAHTZ_UPDATE_CONFIG__;
const identity=typeof __YAHTZ_BUILD__==='undefined'?null:__YAHTZ_BUILD__;
let instance,safety=()=>false;
export async function nativeUpdates(canActivate){
 if(canActivate)safety=canActivate;
 if(Capacitor.getPlatform()!=='ios'||typeof Capacitor.isPluginAvailable!=='function'||!Capacitor.isPluginAvailable('CapacitorUpdater'))return null;
 if(!instance)instance=Promise.all([import('@capgo/capacitor-updater'),import('@capacitor/app')]).then(([{CapacitorUpdater},{App}])=>createUpdateController({config,identity,bridge:CapacitorUpdater,getInfo:()=>App.getInfo(),storage:localStorage,canActivate:()=>safety()}));
 return instance;
}
export async function markUpdateReady(){try{await(await nativeUpdates())?.ready();}catch{console.warn('Update health confirmation unavailable; native rollback remains armed.');}}
