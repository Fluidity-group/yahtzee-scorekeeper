import {BASE_KEYS} from '../game/categories.js';
import {AVATAR_REACTIONS} from '../profile/avatar-reactions.js';

// Pure contract foundation. Hosting, authorisation, persistence and playback remain adapters.
const fail=message=>{throw new Error(message);};
const fields=(value,allowed)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))fail('Unsupported reaction fields.');};
const id=value=>typeof value==='string'&&/^[\w:-]{1,160}$/.test(value);
const version=value=>Number.isSafeInteger(value)&&value>0;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function compileReactionSet(input,{memberIds,identityKind='account',gameId,soundIds=['score','scratch','milestone']}={}) {
 fields(input,['id','version','scopeId','effectiveAfterRevision','rules']);
 if(!id(input.id)||!id(input.scopeId)||!version(input.version)||!Number.isSafeInteger(input.effectiveAfterRevision)||input.effectiveAfterRevision<0)fail('Versioned reaction scope required.');
 if(!Array.isArray(memberIds)||memberIds.length<1||memberIds.length>8||new Set(memberIds).size!==memberIds.length)fail('Unique roster required.');
 const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
 if(identityKind==='account'?memberIds.some(v=>!uuid.test(v)):identityKind!=='local-seat'||!id(gameId)||memberIds.some((v,i)=>v!==`${gameId}:p${i}`))fail('Use account UUIDs or scoped local-seat identities.');
 const member=v=>memberIds.includes(v),rules=input.rules;
 if(!Array.isArray(rules)||rules.length>32||new Set(rules.map(r=>r?.id)).size!==rules.length)fail('Choose at most 32 uniquely identified reactions.');
 for(const r of rules){
  fields(r,['id','version','authorId','enabled','when','audience','actions']);fields(r.when,['category','actorId','value']);fields(r.audience,['kind','playerIds']);
  if(!id(r.id)||!version(r.version)||!member(r.authorId)||typeof r.enabled!=='boolean'||!member(r.when.actorId)||!BASE_KEYS.includes(r.when.category))fail('Reaction needs a member author, scorer and category.');
  if(r.when.value!==undefined&&(!Number.isInteger(r.when.value)||r.when.value<0||r.when.value>100))fail('Invalid score condition.');
  if(!['scorer','others','all','players'].includes(r.audience.kind))fail('Choose a reaction audience.');
  if(r.audience.kind==='players'){
   if(!Array.isArray(r.audience.playerIds)||!r.audience.playerIds.length||new Set(r.audience.playerIds).size!==r.audience.playerIds.length||r.audience.playerIds.some(p=>!member(p)))fail('Recipients must be table members.');
  }else if(r.audience.playerIds!==undefined)fail('Only a specific audience lists player IDs.');
  if(!Array.isArray(r.actions)||!r.actions.length||r.actions.length>3)fail('Choose one to three reaction actions.');
  for(const action of r.actions){
   fields(action,['type','assetId','text']);
   if(action.type==='text'){if(action.assetId!==undefined||typeof action.text!=='string'||!action.text.trim()||action.text.length>240)fail('Use a short plain-text reaction.');}
   else if(action.type==='sound'||action.type==='animation'){if(action.text!==undefined||!(action.type==='sound'?soundIds:AVATAR_REACTIONS).includes(action.assetId))fail('Choose a registered reaction asset.');}
   else fail('Reaction actions cannot change game state or invoke providers.');
  }
 }
 return freeze(structuredClone({...input,memberIds,identityKind,...(identityKind==='local-seat'?{gameId}:{})}));
}

export function evaluateReactions(set,fact,{now,seenIntentIds=[]}={}) {
 if(fact?.type!=='score-recorded')return[]; // Corrections, hydration and unaccepted commands are not new scores.
 if(fact.scopeId!==set.scopeId||!set.memberIds.includes(fact.actorId)||!id(fact.eventId)||!id(fact.gameId)||!Number.isSafeInteger(fact.roomRevision)||!BASE_KEYS.includes(fact.category)||(!Number.isInteger(fact.value)||fact.value<0||fact.value>100))fail('Accepted score facts required.');
 if(set.identityKind==='local-seat'&&set.gameId!==fact.gameId)fail('Local reaction belongs to another game.');
 if(fact.roomRevision<=set.effectiveAfterRevision)return[];
 const acceptedAt=Date.parse(fact.acceptedAt);
 if(!Number.isFinite(acceptedAt)||!Number.isFinite(now))fail('Explicit acceptance and delivery times required.');
 if(now<acceptedAt||now>=acceptedAt+15000)return[]; // Live-only delivery; not a reconnect replay policy.
 const seen=new Set(seenIntentIds),plans=[];
 for(const rule of set.rules){
  if(!rule.enabled||rule.when.actorId!==fact.actorId||rule.when.category!==fact.category||(rule.when.value!==undefined&&rule.when.value!==fact.value))continue;
  const recipients=rule.audience.kind==='scorer'?[fact.actorId]:rule.audience.kind==='others'?set.memberIds.filter(p=>p!==fact.actorId):rule.audience.kind==='all'?set.memberIds:rule.audience.playerIds;
  for(const recipientId of recipients){
   const intentId=JSON.stringify([set.scopeId,set.id,set.version,rule.id,rule.version,fact.gameId,fact.eventId,recipientId]);
   if(seen.has(intentId))continue;
   plans.push({intentId,eventId:fact.eventId,gameId:fact.gameId,ruleId:rule.id,ruleVersion:rule.version,authorId:rule.authorId,actorId:fact.actorId,recipientId,expiresAt:new Date(acceptedAt+15000).toISOString(),actions:structuredClone(rule.actions)});
  }
 }
 return freeze(plans);
}
