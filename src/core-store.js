import Dexie from 'dexie';

export const coreDb = new Dexie('yahtzeeClubhouse');
coreDb.version(1).stores({ games: 'id,status,startedAt' });
const prefix = 'yz_core_journal:';
let queue = Promise.resolve();
function conflict(){const error=new Error('This game changed in another tab. Reload before editing.');error.name='SaveConflict';return error;}
function recoveryEntries(){
  const entries=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key?.startsWith(prefix))continue;
    const serialized=localStorage.getItem(key);
    if(serialized===null)continue; // Another tab may have flushed this entry.
    const game=JSON.parse(serialized);
    if(game.schema!==1 || !game.id || !Array.isArray(game.events))throw new Error('A recovery record is unreadable. Export it before continuing.');
    entries.push({key,game,serialized});
  }
  return entries;
}
function requireCurrent(prior,game,serialized){
  if(prior&&(prior.revision>game.revision||(prior.revision===game.revision&&JSON.stringify(prior)!==serialized)))throw conflict();
}
// Synchronous recovery journal closes the reload window before the async IndexedDB write.
// Each write has its own key: interleaved tabs cannot destroy each other's recovery evidence.
// Existing one-key-per-game journals remain readable; legacy game storage is separate.
export function saveCore(game) {
  const serialized = JSON.stringify(game);
  const entries=recoveryEntries().filter(entry=>entry.game.id===game.id);
  try{for(const entry of entries)requireCurrent(entry.game,game,serialized);}catch(error){return Promise.reject(error);}
  const duplicate=entries.find(entry=>entry.serialized===serialized);
  const key=duplicate?.key??prefix+game.id+':'+crypto.randomUUID();
  if(!duplicate)localStorage.setItem(key, serialized); // Failure is surfaced; never claim the action saved.
  const next = queue.catch(() => {}).then(async () => {
    try { await coreDb.transaction('rw',coreDb.games,async()=>{
      const prior=await coreDb.games.get(game.id);
      requireCurrent(prior,game,serialized);
      await coreDb.games.put(JSON.parse(serialized));
    }); } catch(error) {
      if(error.name==='SaveConflict'){
        if(localStorage.getItem(key)===serialized)localStorage.removeItem(key);
        throw error;
      }
      // Recheck after the async failure: another tab may have written meanwhile.
      // Conflicting entries stay intact for recovery instead of choosing a silent winner.
      if(localStorage.getItem(key)!==serialized)throw error;
      for(const entry of recoveryEntries())if(entry.game.id===game.id)requireCurrent(entry.game,game,serialized);
      return { recoveryOnly:true };
    }
    // Only prune entries observed before this commit; never remove a concurrent newer write.
    for(const entry of [...entries,{key,serialized}])if(localStorage.getItem(entry.key)===entry.serialized)localStorage.removeItem(entry.key);
  });
  queue=next;
  return next;
}
export async function listCore() {
  await queue.catch(()=>{});
  let records=[],readError;
  try{records=await coreDb.games.toArray();}catch(e){readError=e;}
  const games=new Map();
  const snapshots=[...records,...recoveryEntries().map(entry=>entry.game)].sort((a,b)=>b.revision-a.revision);
  for(const g of snapshots){
    const prior=games.get(g.id);
    if(!prior)games.set(g.id,g);
    else if(prior.revision===g.revision&&JSON.stringify(prior)!==JSON.stringify(g))throw conflict();
  }
  if(readError&&!games.size)throw readError;
  return [...games.values()].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
}
export async function loadCore(){return (await listCore()).find(g=>g.status==='active')??null;}
