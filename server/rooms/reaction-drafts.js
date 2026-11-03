import {compileReactionSet} from '../../src/experience/reactions.js';
import {changeRoomReactions} from '../../src/experience/room-reactions.js';
import {RoomError} from '../../src/multiplayer/room.js';
const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const fail=(message,status=400)=>{throw new RoomError(message,status);};
const fields=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
export const draftOperations=['reaction-draft-list','reaction-draft-save','reaction-draft-discard'];
export function validateDraftContent(room,userId,content){
 if(!fields(content,['operation','rule','ruleId']))fail('Invalid draft content.');
 const prior=room.reactions?.rules.find(r=>r.id===(content.operation==='save'?content.rule?.id:content.ruleId));
 if(prior&&prior.authorId!==userId)fail('You can only change reactions you created.',403);
 if(content.operation==='remove'){
  if(content.rule!==undefined||!prior)fail('That published reaction no longer exists. Refresh Studio.',409);
 }else if(content.operation==='save'){
  if(content.ruleId!==undefined||!fields(content.rule,['id','enabled','when','audience','actions']))fail('Invalid draft reaction.');
  try{compileReactionSet({id:room.id,version:1,scopeId:room.id,effectiveAfterRevision:0,rules:[{...content.rule,authorId:userId,version:1}]},{memberIds:room.members.map(m=>m.userId)});}catch(e){fail(e.message);}
 }else fail('Choose a draft action.');
 return structuredClone(content);
}
export function draftView(row){return{id:row.id,roomId:row.room_id,ownerId:row.owner_id,revision:Number(row.revision),baseConfigVersion:Number(row.base_config_version),content:row.content,updatedAt:row.updated_at};}
export async function handleRoomDraft({store,room,userId,body}){
 if(!room.game)fail('Start this hosted game before editing its reactions.',409);
 if(typeof store.reactionDrafts!=='function'||typeof store.saveReactionDraft!=='function')fail('Studio needs the matching server update.',503);
 if(body.operation==='reaction-draft-list')return{drafts:(await store.reactionDrafts(room.id,userId)).map(draftView)};
 if(!uuid.test(body.draftId||'')||!Number.isSafeInteger(body.expectedDraftRevision)||body.expectedDraftRevision<0)fail('Invalid draft revision.');
 if(body.operation==='reaction-draft-discard'){
  await store.discardReactionDraft(room.id,userId,body.draftId,body.expectedDraftRevision);return{discarded:true};
 }
 if(!uuid.test(body.requestId||'')||!Number.isSafeInteger(body.baseConfigVersion)||body.baseConfigVersion<0||body.baseConfigVersion>(room.reactions?.version||0))fail('Invalid saved draft. Refresh the published settings.');
 const content=validateDraftContent(room,userId,body.content);
 const draft=await store.saveReactionDraft({roomId:room.id,ownerId:userId,id:body.draftId,expectedRevision:body.expectedDraftRevision,baseVersion:body.baseConfigVersion,content,requestId:body.requestId});
 return{draft:draftView(draft)};
}
export async function publishRoomDraft({store,room,userId,body,time}){
 if(typeof store.reactionDraft!=='function')fail('Studio needs the matching server update.',503);
 if(!uuid.test(body.draftId||'')||!Number.isSafeInteger(body.draftRevision)||body.draftRevision<1)fail('Choose a saved draft revision.');
 const draft=await store.reactionDraft(room.id,userId,body.draftId);
 if(!draft||draft.owner_id!==userId||draft.room_id!==room.id||draft.deleted||Number(draft.revision)!==body.draftRevision)fail('The saved draft changed. Reload it before publishing.',409);
 if(Number(draft.base_config_version)!==body.configVersion)fail('Review the latest published settings before publishing.',409);
 const content=validateDraftContent(room,userId,draft.content);
 const next=changeRoomReactions(room,{...body,userId,operation:content.operation==='save'?'reaction-save':'reaction-remove',rule:content.rule,ruleId:content.ruleId});
 return{...next,reactionPublication:{authorId:userId,draftId:draft.id,draftRevision:Number(draft.revision),commandId:body.commandId,configVersion:next.reactions.version,publishedAt:time}};
}
