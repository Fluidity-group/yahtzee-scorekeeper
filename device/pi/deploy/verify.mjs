import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('release-manifest.json','utf8'));
for(const entry of manifest.files){const resolved=path.resolve(entry.path);if(!resolved.startsWith(process.cwd()+path.sep))throw Error('Invalid manifest path');const bytes=fs.readFileSync(resolved);if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error(`Integrity check failed: ${entry.path}`);}
console.log(`Verified ${manifest.files.length} release files. Verify the manifest/archive checksum separately against your trusted delivery.`);
