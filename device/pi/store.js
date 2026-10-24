import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');

// Atomic authoritative snapshots, retaining the preceding checkpoint.
// Compare-and-swap prevents a second process from overwriting newer state.
export class GameStore {
 constructor(file){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  this.db=new DatabaseSync(file,{timeout:5000});
  fs.chmodSync(file,0o600);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS commits (revision INTEGER PRIMARY KEY, at TEXT NOT NULL, state TEXT NOT NULL);');
  this.db.exec('CREATE TABLE IF NOT EXISTS samples (id TEXT PRIMARY KEY, room TEXT NOT NULL, at INTEGER NOT NULL, data TEXT NOT NULL);');
 }
 load(){const row=this.db.prepare('SELECT revision,state FROM commits ORDER BY revision DESC LIMIT 1').get();return {revision:row?.revision??0,state:row?JSON.parse(row.state):{rooms:{}}};}
 save(state,revision,sample=null){
  this.db.exec('BEGIN IMMEDIATE');
  try{if(this.load().revision!==revision)throw Error('Storage changed; refresh and retry');
   this.db.prepare('INSERT INTO commits VALUES (?,?,?)').run(revision+1,new Date().toISOString(),JSON.stringify(state));this.db.prepare('DELETE FROM commits WHERE revision < ?').run(revision);
   if(sample){this.db.prepare('INSERT INTO samples VALUES (?,?,?,?)').run(sample.id,sample.roomId,Date.now(),JSON.stringify(sample));
    this.db.exec('DELETE FROM samples WHERE id NOT IN (SELECT id FROM samples ORDER BY at DESC LIMIT 200)');
    while(this.db.prepare('SELECT COALESCE(SUM(length(data)),0) AS size FROM samples').get().size>128*1024*1024)this.db.exec('DELETE FROM samples WHERE id=(SELECT id FROM samples ORDER BY at LIMIT 1)');
   }
   this.db.exec('COMMIT');
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 close(){this.db.close();}
 samples(room){return this.db.prepare('SELECT data FROM samples WHERE room=? ORDER BY at').all(room).map(r=>JSON.parse(r.data));}
}
