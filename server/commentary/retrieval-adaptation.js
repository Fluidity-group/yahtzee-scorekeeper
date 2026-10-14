import { createPlayerProfile, playerProfileContext } from '../../src/commentary/player-profile.js';
export const COMMENTARY_RETENTION_MS=90*24*60*60*1000;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const mechanisms=new Set(['misdirection','understatement','absurd-stakes','reversal','callback','observational']);
const premises=new Set(['dynasty','bureaucracy','luxury','space-mission','disaster','game-night','rivalry','ambition','mortality','bad-luck','score','player-blurb','opening','return','next-game']);
const subjects=new Set(['game-score','rivalry','hobby','work','game-night-style','absurd-stakes','confidence','bad-luck','score','bureaucracy','luxury','space-mission','dynasty','player-blurb','opening','return','next-game']);
const tag=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,39}$/.test(value);
const account=value=>{if(typeof value!=='string'||!UUID.test(value))throw new Error('Authenticated account UUID required.');return value.toLowerCase();};
const accounts=values=>{if(!Array.isArray(values)||!values.length||values.length>8)throw new Error('One to eight unique account UUIDs required.');const ids=values.map(account);if(new Set(ids).size!==ids.length)throw new Error('Unique audience required.');return ids;};
const id=value=>{if(typeof value!=='string'||!value||value.length>200||/[\u0000-\u001f]/.test(value))throw new Error('Bounded source identifier required.');return value;};
const clone=value=>structuredClone(value);

/** Pure transient contract. Service must authenticate actors and resolve source permissions;
 * persistence, trusted playback receipts and request routing are integration responsibilities. */
export class RetrievalAdaptation {
 constructor({now=Date.now,maxRecords=2000}={}){if(!Number.isSafeInteger(maxRecords)||maxRecords<1)throw new Error('Bounded record capacity required.');this.now=now;this.maxRecords=maxRecords;this.records=new Map();this.feedback=new Map();this.profiles=new Map();this.preferenceSharing=new Map();this.summaries=new Map();this.caches=new Map();}
 setPreferenceSharing(actorId,sharedGameIds=[]){const actor=account(actorId);if(!Array.isArray(sharedGameIds)||sharedGameIds.length>100)throw new Error('Bounded preference sharing required.');this.preferenceSharing.set(actor,[...new Set(sharedGameIds.map(id))]);this.invalidateDerived();}
 invalidateDerived(){this.summaries.clear();this.caches.clear();}
 setPlayerProfile(actorId,profile,{sharedGameIds=[]}={}){
  const actor=account(actorId),checked=createPlayerProfile(profile);if(actor!==checked.accountId)throw new Error('Only the profile owner can edit personal context.');
  if(!Array.isArray(sharedGameIds)||sharedGameIds.length>100)throw new Error('Bounded sharing permissions required.');
  const prior=this.profiles.get(actor);if(prior&&checked.version<=prior.profile.version)throw new Error('Personal profile version must advance.');
  this.profiles.set(actor,{profile:checked,sharedGameIds:[...new Set(sharedGameIds.map(id))]});this.invalidateDerived();return clone(checked);
 }
 remember(line,audience){
  this.purgeExpired();id(line?.id);if(this.records.has(line.id))return false;
  if(this.records.size>=this.maxRecords)throw new Error('Commentary history capacity exceeded.');
  const listeners=accounts(audience),target=account(line.targetAccountId);
  if(!listeners.includes(target)||!mechanisms.has(line.mechanism)||!premises.has(line.premise)||!Array.isArray(line.subjects)||line.subjects.length>6||!line.subjects.every(value=>tag(value)&&subjects.has(value))||typeof line.text!=='string'||[...line.text].length>500||!['playful','savage','dark'].includes(line.humorIntensity)||typeof line.containsProfanity!=='boolean'||!Number.isSafeInteger(line.profileVersion)||line.profileVersion<1)throw new Error('Valid bounded line metadata and target audience required.');
  id(line.gameId);id(line.eventId);
  this.records.set(line.id,{line:clone({...line,targetAccountId:target}),audience:listeners,status:'generated',epoch:null,heardBy:[],firstExposureAt:null,expiresAt:null,validFacts:true});this.invalidateDerived();return true;
 }
 exposure(recordId,{status,epoch,heardBy=[]}={}){
  this.purgeExpired();const record=this.records.get(recordId);if(!record)throw new Error('Unknown or expired commentary.');
  const listeners=heardBy.map(account);if(new Set(listeners).size!==listeners.length||listeners.some(value=>!record.audience.includes(value))||!Number.isSafeInteger(epoch)||epoch<1)throw new Error('Valid fenced exposure audience required.');
  if(record.status===status&&record.epoch===epoch)return false;
  const allowed=record.status==='generated'?['started','failed']:record.status==='started'?['completed','interrupted','failed']:[];
  if(!allowed.includes(status)||(record.epoch!==null&&record.epoch!==epoch))throw new Error('Invalid exposure transition.');
  // Never infer the whole table heard host audio. Trusted receipts explicitly identify listeners.
  if(listeners.length&&status==='failed')throw new Error('Failed playback cannot establish listener exposure.');
  record.status=status;record.epoch=epoch;record.heardBy=[...new Set([...record.heardBy,...listeners])];
  if(status==='started'&&record.firstExposureAt===null){record.firstExposureAt=this.now();record.expiresAt=record.firstExposureAt+COMMENTARY_RETENTION_MS;}
  this.invalidateDerived();return true;
 }
 rate(actorId,{recordId,rating,basis='playback'}={}){
  this.purgeExpired();const actor=account(actorId),record=this.records.get(recordId);
  if(!['like','dislike'].includes(rating)||!['playback','caption'].includes(basis)||!record||!['completed','interrupted'].includes(record.status)||(basis==='playback'?!record.heardBy.includes(actor):!record.audience.includes(actor)))throw new Error('Like/Dislike requires your reported exposure or authorized caption after speech.');
  const key=`${recordId}:${actor}`,prior=this.feedback.get(key);if(prior?.rating===rating&&prior?.basis===basis)return false;
  this.feedback.set(key,{recordId,accountId:actor,rating,basis,at:this.now(),expiresAt:record.expiresAt});this.invalidateDerived();return true;
 }
 invalidateEvent(gameId,eventId){for(const record of this.records.values())if(record.line.gameId===gameId&&record.line.eventId===eventId)record.validFacts=false;this.invalidateDerived();}
 purgeExpired(){
  const removed=new Set();for(const [key,record]of this.records)if(record.expiresAt!==null&&record.expiresAt<=this.now()){this.records.delete(key);removed.add(key);}
  for(const [key,rating]of this.feedback)if(removed.has(rating.recordId)||rating.expiresAt<=this.now())this.feedback.delete(key);
  if(removed.size)this.invalidateDerived();return removed.size;
 }
 context({actorId,targetAccountId,audience,gameId,authorizedSourceIds=[],profile}={}){
  this.purgeExpired();const actor=account(actorId),target=account(targetAccountId),listeners=accounts(audience);id(gameId);
  if(!listeners.includes(actor)||!listeners.includes(target))throw new Error('Current audience membership required.');
  if(!Array.isArray(authorizedSourceIds)||authorizedSourceIds.length>200||!profile||!Number.isSafeInteger(profile.version)||profile.version<1||!['playful','savage','dark'].includes(profile.humorIntensity)||typeof profile.profanityAllowed!=='boolean')throw new Error('Resolved source permissions and current table profile required.');
  const sources=new Set(authorizedSourceIds.map(id));
  const key=JSON.stringify({actor,target,listeners,gameId,sources:[...sources],profileVersion:profile.version,intensity:profile.humorIntensity,profanity:profile.profanityAllowed});
  if(this.caches.has(key))return clone(this.caches.get(key).value);
  const exposed=[...this.records.values()].filter(record=>record.heardBy.some(value=>listeners.includes(value)));
  const shared=exposed.filter(record=>sources.has(record.line.gameId)&&listeners.every(value=>record.audience.includes(value)&&record.heardBy.includes(value)));
  const personal=this.profiles.get(target);
  const tasteAllowed=actor===target||personal?.sharedGameIds.includes(gameId)||this.preferenceSharing.get(target)?.includes(gameId);
  const relevant=tasteAllowed?[...this.records.values()].filter(record=>sources.has(record.line.gameId)&&record.audience.includes(target)&&['completed','interrupted'].includes(record.status)):[];
  const weights={mechanisms:{},subjects:{}};let liked=0,disliked=0,unrated=0;
  for(const record of relevant){const rating=this.feedback.get(`${record.line.id}:${target}`);if(!rating){unrated++;continue;}
   const delta=rating.rating==='like'?2:-3;if(delta>0)liked++;else disliked++;
   weights.mechanisms[record.line.mechanism]=Math.max(-6,Math.min(6,(weights.mechanisms[record.line.mechanism]||0)+delta));
   for(const subject of record.line.subjects)weights.subjects[subject]=Math.max(-6,Math.min(6,(weights.subjects[subject]||0)+delta));
  }
  const allowedPersonal=personal&&(actor===target||personal.sharedGameIds.includes(gameId));
  const value={targetAccountId:target,nameAuthority:'game-time-alias-from-facts',personalContext:allowedPersonal?{...playerProfileContext(personal.profile),quotedBlurb:JSON.stringify(personal.profile.blurb)}:null,
   preferenceWeights:weights,evidence:{liked,disliked,unrated},
   avoidPremises:[...new Set(exposed.map(record=>record.line.premise))].slice(-16),
   cooledMechanisms:Object.entries(weights.mechanisms).filter(([,weight])=>weight<0).map(([mechanism])=>mechanism),
   cooledSubjects:Object.entries(weights.subjects).filter(([,weight])=>weight<0).map(([subject])=>subject),
   callbacks:shared.filter(record=>record.status==='completed'&&record.validFacts&&record.line.humorIntensity===profile.humorIntensity&&(profile.profanityAllowed||!record.line.containsProfanity)).slice(-6).map(record=>clone({...record.line,instructionAuthority:'none'})),
   writerPreferences:{likedMechanisms:Object.entries(weights.mechanisms).filter(([,weight])=>weight>0).map(([value])=>value).slice(0,12),dislikedMechanisms:Object.entries(weights.mechanisms).filter(([,weight])=>weight<0).map(([value])=>value).slice(0,12),likedSubjects:Object.entries(weights.subjects).filter(([,weight])=>weight>0).map(([value])=>['work','hobby','game-night-style'].includes(value)?'player-blurb':value==='game-score'?'score':value).slice(0,12),dislikedSubjects:Object.entries(weights.subjects).filter(([,weight])=>weight<0).map(([value])=>['work','hobby','game-night-style'].includes(value)?'player-blurb':value==='game-score'?'score':value).slice(0,12),avoidSubjects:[],ratingsCount:liked+disliked},
   settingsEffect:'none',learningBasis:'explicit-feedback-and-retrieval',retentionDays:90};
  this.summaries.set(target,{accounts:[...listeners],value:clone({weights,evidence:value.evidence})});
  this.caches.set(key,{accounts:[...listeners],value:clone(value)});return value;
 }
 forgetHistory(actorId){
  const actor=account(actorId),removed=new Set();for(const [key,record]of this.records)if(record.audience.includes(actor)||record.line.targetAccountId===actor){this.records.delete(key);removed.add(key);}
  for(const [key,rating]of this.feedback)if(rating.accountId===actor||removed.has(rating.recordId))this.feedback.delete(key);
  // Conservative cascade also removes derived copies shared with other listeners.
  this.invalidateDerived();return {removedRecords:removed.size,derivativesCleared:true,scoresChanged:false};
 }
}
