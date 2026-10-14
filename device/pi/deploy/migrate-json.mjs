import fs from 'node:fs';import {GameStore} from '../store.js';
const [source,target]=process.argv.slice(2);if(!source||!target||!fs.existsSync(source)||fs.existsSync(target))throw Error('Usage: migrate-json.mjs existing-games.json new-games.sqlite');
const state=JSON.parse(fs.readFileSync(source,'utf8'));if(!state.rooms||Object.values(state.rooms).some(r=>!r.id||!Array.isArray(r.members)||!Array.isArray(r.receipts)))throw Error('Not a local game snapshot');
const store=new GameStore(target);try{store.save(state,0);console.log('Migrated; source JSON preserved. Stop the old host before switching to the new database.');}finally{store.close();}
