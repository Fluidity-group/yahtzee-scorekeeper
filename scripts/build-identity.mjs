import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

// Do not inspect environment values, Git remotes, user names or credentials.
export function readBuildIdentity(root, mode, git = args => {
  const result = spawnSync('git', ['-C', root, ...args], {encoding:'utf8',maxBuffer:16*1024*1024});
  if (result.status !== 0 || result.error) throw new Error('Cannot identify build source. Build from a Git checkout.');
  return result.stdout;
}) {
  const commit = git(['rev-parse','HEAD']).trim();
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid source commit.');
  const dirty = Boolean(git(['status','--porcelain']).trim());
  const paths = git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean).sort();
  const hash = createHash('sha256');
  for (const name of paths) {
    if (name.startsWith('artifacts/')) continue;
    hash.update(name+'\0');
    const path = resolve(root,name);
    hash.update(existsSync(path) ? readFileSync(path) : '<deleted>');
  }
  return {schemaVersion:1,commit,sourceState:dirty?'modified':'clean',sourceSha256:hash.digest('hex'),profile:mode};
}
