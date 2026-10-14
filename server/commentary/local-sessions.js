import {createCoreGame,command} from '../../src/game/core.js';
import {acceptedFacts} from '../../src/commentary/facts.js';
import {computeTotals,filledBaseCount} from '../../src/game/scoring.js';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const key=/^[A-Za-z0-9_-]{8,100}$/;
const clean=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f\u007f]/.test(value);
export function createLocalSession({roomId,ownerId,commandId,config,time}){
 if(!uuid.test(roomId||'')||!uuid.test(ownerId||'')||!key.test(commandId||'')||!config||Object.keys(config).some(k=>!['gameId','names','mode','rulesVersion','hideTotals','players'].includes(k))||!uuid.test(config.gameId||''))throw Error('Invalid local session setup');
 const game=createCoreGame({id:config.gameId,names:config.names,mode:config.mode,rulesVersion:config.rulesVersion||1,hideTotals:config.hideTotals===true,source:'manual',time});
 const players=game.players.map((p,seat)=>{const draft=config.players?.[seat]||{};if(!['','woman','man','nonbinary','another'].includes(draft.gender||'')||!clean(draft.blurb||'',240))throw Error('Invalid local player details');return {participantId:p.id,gender:draft.gender||'',blurb:draft.blurb||''};});
 return {schemaVersion:1,id:roomId,ownerId,startCommandId:commandId,fingerprint:JSON.stringify(config),game,players,receipts:{},createdAt:time};
}
export function localRoom(session){return {id:session.id,hostId:session.ownerId,members:[{userId:session.ownerId,name:session.game.players[0].name}],game:session.game,localSession:{startCommandId:session.startCommandId,identityKind:'local-seat'},status:'active',revision:session.game.revision};}
export function localOpening(session){const game=session.game;return {schemaVersion:1,purpose:'opening',gameId:game.id,eventId:'lifecycle-'+session.startCommandId,commandId:session.startCommandId,acceptedAt:session.createdAt,snapshotBasis:'at-acceptance',observation:'accepted-lifecycle-only',identityKind:'local-seat',ownerAccountId:session.ownerId,accountId:game.players[0].id,seats:game.players.map((p,seat)=>({accountId:p.id,seat,displayName:p.name,label:p.name})),scoresRecorded:0,gameSequence:1,disclosurePolicy:game.hideTotals?'category-scores-only':'scores-and-totals',scoreDependencies:[]};}
export function applyLocalCommands(session,commands,time){
 if(!Array.isArray(commands)||commands.length<1||commands.length>2)throw Error('One or two local commands required');
 const next=structuredClone(session),events=[];
 for(const entry of commands){
  if(!entry||Object.keys(entry).some(k=>!['commandId','action'].includes(k))||!key.test(entry.commandId||'')||!entry.action||Object.keys(entry.action).some(k=>!['type','seat','category','value','face','target','dice','source','rollId','yahtzeeFace','heldMask'].includes(k))||!['start','score','bonus','undo-score','correct-score','final-chain-roll','roll','discard-roll','correct-roll','manual-fallback'].includes(entry.action.type))throw Error('Invalid local command');
  const fingerprint=JSON.stringify(entry.action),prior=next.receipts[entry.commandId];if(prior){if(prior!==fingerprint)throw Error('Local command collision');continue;}
  if(Object.keys(next.receipts).length>=2048)throw Error('Local command limit');
  const before=next.game;next.game=command(before,entry.action,{id:entry.commandId,time});next.receipts[entry.commandId]=fingerprint;events.push(...next.game.events.slice(before.events.length));
 }
 return {session:next,events};
}
export function localScoreFacts(session,eventId){return acceptedFacts(session.game,eventId,session.game.players.map(p=>p.id),{identityKind:'local-seat',ownerAccountId:session.ownerId});}
export function localPreferences(state,ownerId){
 const liked=new Map(),disliked=new Map();let count=0;
 for(const feedback of state.feedback.values()){if(feedback.accountId!==ownerId)continue;const job=state.jobs.get(feedback.recordId);if(!job?.audience.includes(ownerId)||!job.line?.mechanism)continue;const target=feedback.rating==='like'?liked:disliked;target.set(job.line.mechanism,(target.get(job.line.mechanism)||0)+1);count++;}
 const top=map=>[...map].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([tag])=>tag);return {likedMechanisms:top(liked),dislikedMechanisms:top(disliked),ratingsCount:count};
}
