import {compileReactionSet,evaluateReactions} from '../experience/reactions.js';
import {META} from '../game/categories.js';
import {validateScoreValue} from '../game/core.js';
export const editableRule=rule=>structuredClone(Object.fromEntries(['id','enabled','when','audience','actions'].map(k=>[k,rule[k]])));
export const newRule=room=>({id:crypto.randomUUID(),enabled:true,when:{actorId:room.members[0].userId,category:'fullHouse',value:25},audience:{kind:'all'},actions:[{type:'animation',assetId:'full-house'},{type:'sound',assetId:'milestone'}]});
export const ruleId=content=>content.operation==='save'?content.rule.id:content.ruleId;
export function validateEditableRule(room,userId,rule){
 return compileReactionSet({id:room.id,version:1,scopeId:room.id,effectiveAfterRevision:0,rules:[{...rule,authorId:userId,version:1}]},{memberIds:room.members.map(m=>m.userId)});
}
export function scoreCondition(when){return when.value!==undefined?`= ${when.value}`:when.minValue!==undefined&&when.maxValue!==undefined?`${when.minValue}–${when.maxValue} inclusive`:when.minValue!==undefined?`≥ ${when.minValue}`:when.maxValue!==undefined?`≤ ${when.maxValue}`:'any score';}
export function audienceDescription(audience,room,actorId){const name=id=>room.members.find(m=>m.userId===id)?.name||'Player';return audience.kind==='all'?'Everyone':audience.kind==='others'?`Everyone except ${name(actorId)}`:audience.kind==='scorer'?`${name(actorId)} only`:audience.playerIds.map(name).join(', ');}
export function reactionDescription(rule,room){if(!rule)return'No published reaction';const actor=room.members.find(m=>m.userId===rule.when.actorId)?.name||'Player';return`${actor} · ${META[rule.when.category].name} ${scoreCondition(rule.when)} → ${audienceDescription(rule.audience,room,rule.when.actorId)}${rule.enabled?'':' · disabled'}`;}
export function previewDraft({room,userId,content,recipientId,value,now=Date.now()}){
 const id=ruleId(content),prior=room.reactions?.rules.find(r=>r.id===id),rule=content.operation==='save'?content.rule:prior;
 if(!rule)throw Error('That reaction no longer exists. Reload Studio.');
 validateScoreValue(room.game,rule.when.category,value);
 const rules=(room.reactions?.rules||[]).filter(r=>r.id!==id);
 if(content.operation==='save')rules.push({...content.rule,authorId:userId,version:(prior?.version||0)+1});
 const set=compileReactionSet({id:room.id,version:1,scopeId:room.id,effectiveAfterRevision:0,rules},{memberIds:room.members.map(m=>m.userId)});
 const eventId=crypto.randomUUID(),fact={type:'score-recorded',scopeId:room.id,gameId:room.game.id,eventId,actorId:rule.when.actorId,category:rule.when.category,value,acceptedAt:new Date(now).toISOString(),roomRevision:1};
 const intents=evaluateReactions(set,fact,{now}),actions=new Map();
 for(const intent of intents.filter(i=>i.recipientId===recipientId))for(const action of intent.actions)actions.set(action.type,action);
 const seat=room.game.players.findIndex(p=>p.id===rule.when.actorId);
 return{event:{id:eventId,eventId,gameId:room.game.id,seat,actorId:rule.when.actorId,category:rule.when.category,value,acceptedAt:fact.acceptedAt,playbackStartedAt:fact.acceptedAt,expiresAt:new Date(now+4000).toISOString(),items:[{kind:value===0?'scratch':'score',seat,category:rule.when.category,text:`${META[rule.when.category].name} · ${value} points`}]},actions:[...actions.values()],recipients:room.members.map(m=>({id:m.userId,name:m.name,custom:intents.some(i=>i.recipientId===m.userId)}))};
}
const canonical=value=>value&&typeof value==='object'?(Array.isArray(value)?value.map(canonical):Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]))):value;
export function draftMatchesPublished(draft,room){const prior=room.reactions?.rules.find(r=>r.id===ruleId(draft.content));return draft.content.operation==='remove'?!prior:!!prior&&JSON.stringify(canonical(editableRule(prior)))===JSON.stringify(canonical(draft.content.rule));}

export const actionDescription=rule=>!rule?'None':rule.actions.map(a=>a.type==='text'?`Message: ${a.text}`:`${a.type==='sound'?'Sound':'Animation'}: ${a.assetId}`).join(' · ');
