import {createRequire} from 'node:module';import fs from 'node:fs';
const {DatabaseSync,backup}=createRequire(import.meta.url)('node:sqlite');
const [source,target]=process.argv.slice(2);if(!source||!target||!fs.existsSync(source)||fs.existsSync(target))throw Error('Usage: backup.mjs existing.sqlite new-backup.sqlite (target must not exist)');
const db=new DatabaseSync(source,{readOnly:true});try{await backup(db,target);fs.chmodSync(target,0o600);console.log('Consistent backup written. Treat it as private: it includes game/device credential hashes and optional images.');}finally{db.close();}
