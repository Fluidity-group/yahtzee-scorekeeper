import Dexie from 'dexie';

export const coreDb = new Dexie('yahtzeeClubhouse');
coreDb.version(1).stores({ games: 'id,status,startedAt' });
const prefix = 'yz_core_journal:';
let queue = Promise.resolve();
// Synchronous recovery journal closes the reload window before the async IndexedDB write.
// One key per game; never overwrite the historical two-player database.
export function saveCore(game) {
  const serialized = JSON.stringify(game);
  localStorage.setItem(prefix + game.id, serialized); // Failure is surfaced; never claim the action saved.
  const next = queue.catch(() => {}).then(async () => {
    try { await coreDb.transaction('rw',coreDb.games,async()=>{
      const prior=await coreDb.games.get(game.id);
      if(prior && (prior.revision>game.revision || (prior.revision===game.revision && JSON.stringify(prior)!==serialized))){
        const conflict=new Error('This game changed in another tab. Reload before editing.');conflict.name='SaveConflict';throw conflict;
      }
      await coreDb.games.put(JSON.parse(serialized));
    }); } catch(error) {
      if(error.name==='SaveConflict'){
        if(localStorage.getItem(prefix+game.id)===serialized)localStorage.removeItem(prefix+game.id);
        throw error;
      }
      // The synchronous journal already contains the accepted action.
      // Continue from that state, rather than inviting a duplicate retry.
      return { recoveryOnly:true };
    }
    if(localStorage.getItem(prefix+game.id)===serialized) localStorage.removeItem(prefix+game.id);
  });
  queue=next;
  return next;
}
export async function listCore() {
  await queue.catch(()=>{});
  let records=[],readError;
  try{records=await coreDb.games.toArray();}catch(e){readError=e;}
  const games=new Map(records.map(g=>[g.id,g]));
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key?.startsWith(prefix))continue;
    const g=JSON.parse(localStorage.getItem(key));
    if(g.schema!==1 || !g.id || !Array.isArray(g.events)) throw new Error('A recovery record is unreadable. Export it before continuing.');
    if(!games.has(g.id)||games.get(g.id).revision<=g.revision)games.set(g.id,g);
  }
  if(readError&&!games.size)throw readError;
  return [...games.values()].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
}
export async function loadCore(){return (await listCore()).find(g=>g.status==='active')??null;}
