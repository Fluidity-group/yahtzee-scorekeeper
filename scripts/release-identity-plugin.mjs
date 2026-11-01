import{readUpdateConfig}from'./updates-config.mjs';
import{nativeUpdateIdentity}from'./native-update-runtime.mjs';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {readBuildIdentity} from './build-identity.mjs';
import {verifyRequiredAssets} from './required-assets.mjs';

export function releaseIdentityPlugin(root,mode,appConfig={}) {
  let identity;
  return {
    name:'yahtz-release-identity',apply:'build',
    config() {
      identity=readBuildIdentity(root,mode);
      if(['native','ios-test'].includes(mode))Object.assign(identity,nativeUpdateIdentity(root,readUpdateConfig(root,mode),appConfig));
      return {define:{__YAHTZ_BUILD__:JSON.stringify(identity),__YAHTZ_UPDATE_RUNTIME__:JSON.stringify(identity.nativeRuntime||null)}};
    },
    buildStart() {
      verifyRequiredAssets(root,JSON.parse(readFileSync(resolve(root,'public-assets.required.json'),'utf8')));
    },
    generateBundle() {
      this.emitFile({type:'asset',fileName:'build-identity.json',source:JSON.stringify(identity,null,2)+'\n'});
    },
  };
}
