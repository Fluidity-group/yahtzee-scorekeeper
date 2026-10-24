// Transactional rehearsal only: process memory is lost on restart, not production durability.
export class InMemoryCommentaryStore {
 constructor(){this.state={settings:new Map(),jobs:new Map(),moments:new Map(),leases:new Map(),attempts:new Map(),budgets:new Map(),exposure:new Map(),memoryRecords:new Map(),feedback:new Map(),playerProfiles:new Map(),playerProfileVersions:new Map(),preferenceSharing:new Map(),memorySummaries:new Map(),memoryCaches:new Map(),localSessions:new Map()};this.tail=Promise.resolve();}
 transaction(fn){
  const run=this.tail.then(()=>{const next=structuredClone(this.state),result=fn(next);if(result&&typeof result.then==='function')throw Error('Transaction callback must be synchronous; no provider work in transaction');this.state=next;return structuredClone(result);});
  this.tail=run.catch(()=>{});return run;
 }
 snapshot(){return structuredClone(this.state);}
}
