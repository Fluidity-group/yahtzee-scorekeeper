import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {readBuildIdentity} from './build-identity.mjs';
import {verifyRequiredAssets} from './required-assets.mjs';

export function releaseIdentityPlugin(root,mode) {
  let identity;
  return {
    name:'yahtz-release-identity',apply:'build',
    config() {
      identity=readBuildIdentity(root,mode);
      return {define:{__YAHTZ_BUILD__:JSON.stringify(identity)}};
    },
    buildStart() {
      verifyRequiredAssets(root,JSON.parse(readFileSync(resolve(root,'public-assets.required.json'),'utf8')));
    },
    generateBundle() {
      this.emitFile({type:'asset',fileName:'build-identity.json',source:JSON.stringify(identity,null,2)+'\n'});
    },
  };
}
