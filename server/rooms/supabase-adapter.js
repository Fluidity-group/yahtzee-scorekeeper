import {RoomError} from '../../src/multiplayer/room.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const row=room=>({id:room.id,code:room.code,host_id:room.hostId,member_ids:room.members.map(m=>m.userId),revision:room.revision,state:room,created_at:room.createdAt});

// Service credentials belong only to the database/auth transport. Never return
// upstream bodies, URLs or exceptions as an application error.
export function createSupabaseRoomAdapter({url,key,fetchImplementation=(...args)=>fetch(...args),now=()=>Date.now(),commentaryScopeId=null}){
 async function db(path,options={}){
  try{
   const response=await fetchImplementation(`${url}/rest/v1/clubhouse_rooms${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'}});
   if(response.status===409&&['POST','PATCH'].includes(options.method))return null;
   if(!response.ok)throw new Error();
   const rows=await response.json();if(!Array.isArray(rows))throw new Error();return rows;
  }catch{throw new Error('Database request failed');}
 }
 async function studioResource(path,options={}){
  let response;try{response=await fetchImplementation(`${url}/rest/v1/${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'}});}catch{throw new RoomError('Studio could not connect. Retry with the same request.',503);}
  if(response.status===404)throw new RoomError('Studio needs the draft-storage server update.',503);
  if(!response.ok){let code;try{code=(await response.json())?.code;}catch{}if(['40001','23505'].includes(code))throw new RoomError('This draft changed on another computer. Reload it before saving.',409);if(code==='42501')throw new RoomError('Open your own draft in a table you belong to.',403);if(code==='22023')throw new RoomError('Invalid draft or draft limit reached (32).',400);throw new RoomError('Studio could not save this request. Refresh and try again.',503);}
  try{return await response.json();}catch{throw new RoomError('Unreadable Studio response. Refresh before editing.',503);}
 }
 const draftFields='id,room_id,owner_id,revision,base_config_version,content,updated_at';
 const draftScope=(roomId,ownerId)=>{if(!uuid.test(roomId)||!uuid.test(ownerId))throw new Error('Invalid draft scope');return `room_id=eq.${roomId}&owner_id=eq.${ownerId}&deleted=eq.false`;};
 const store={
  async reactionDrafts(roomId,ownerId){const rows=await studioResource(`clubhouse_reaction_drafts?${draftScope(roomId,ownerId)}&select=${draftFields}&order=updated_at.desc&limit=32`);if(!Array.isArray(rows))throw new Error('Invalid drafts');return rows;},
  async reactionDraft(roomId,ownerId,id){if(!uuid.test(id))throw new Error('Invalid draft identity');const rows=await studioResource(`clubhouse_reaction_drafts?${draftScope(roomId,ownerId)}&id=eq.${id}&select=${draftFields}`);if(!Array.isArray(rows))throw new Error('Invalid draft');return rows[0];},
  async saveReactionDraft({roomId,ownerId,id,expectedRevision,baseVersion,content,requestId}){return studioResource('rpc/clubhouse_save_reaction_draft',{method:'POST',body:JSON.stringify({p_room_id:roomId,p_owner_id:ownerId,p_id:id,p_expected_revision:expectedRevision,p_base_version:baseVersion,p_content:content,p_request_id:requestId})});},
  async discardReactionDraft(roomId,ownerId,id,expectedRevision){const result=await studioResource('rpc/clubhouse_discard_reaction_draft',{method:'POST',body:JSON.stringify({p_room_id:roomId,p_owner_id:ownerId,p_id:id,p_expected_revision:expectedRevision})});if(result!==true)throw new RoomError('Draft discard could not be confirmed. Refresh Studio.',503);return true;},
  async commentaryAvailable(){
   if(!uuid.test(commentaryScopeId||''))return false;
   try{const response=await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_commentary_atomic_available`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:'{}'});if(response.status===404)return false;if(!response.ok)throw Error();const available=await response.json();if(typeof available!=='boolean')throw Error();return available;}catch{throw new Error('Database request failed');}
  },
  async competitionAvailable(){
   try{const response=await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_competition_v2_available`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:'{}'});
    if(response.status===404)return false;
    if(!response.ok)throw Error();const available=await response.json();if(typeof available!=='boolean')throw Error();return available;
   }catch{throw new Error('Database request failed');}
  },
  async tournamentsAvailable(){
   try{const response=await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_tournaments_available`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:'{}'});
    if(response.status===404)return false;
    if(!response.ok)throw Error();const available=await response.json();if(typeof available!=='boolean')throw Error();return available;
   }catch{throw new Error('Database request failed');}
  },
  async tournamentGames(roomId){
   if(!uuid.test(roomId))throw new Error('Database request failed');
   const games=await resource(`clubhouse_games?room_id=eq.${roomId}&ended_at=not.is.null&select=state,sequence_number&order=sequence_number.asc&limit=20`);
   if(!Array.isArray(games))throw new Error('Database request failed');return games;
  },
  async rematchAvailable(){
   try{const response=await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_rematch_available`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:'{}'});
    if(response.status===404)return false;
    if(!response.ok)throw Error();const available=await response.json();if(typeof available!=='boolean')throw Error();return available;
   }catch{throw new Error('Database request failed');}
  },
  async receipt(roomId,commandId){return (await resource(`clubhouse_room_receipts?room_id=eq.${roomId}&command_id=eq.${encodeURIComponent(commandId)}&select=actor_id,fingerprint`))[0];},
  async history(roomId,before){
   return await resource(`clubhouse_games?room_id=eq.${roomId}&ended_at=not.is.null${before?`&sequence_number=lt.${before}`:''}&select=state,sequence_number&order=sequence_number.desc&limit=20`);
  },
  async commit(room,revision,{actor,commandId=null,fingerprint=null,outboxRows=null,draft=null}={}){
   if(outboxRows!==null&&!uuid.test(commentaryScopeId||''))throw new Error('Atomic commentary scope unavailable');
   if(draft){if(outboxRows!==null)throw new Error('Invalid publication commit');const result=await studioResource('rpc/clubhouse_commit_reaction_draft',{method:'POST',body:JSON.stringify({p_room_id:room.id,p_expected_revision:revision,p_state:room,p_actor_id:actor,p_command_id:commandId,p_fingerprint:fingerprint,p_draft_id:draft.id,p_draft_revision:draft.revision})});if(typeof result!=='boolean')throw new Error('Invalid publication result');return result;}
   const result=await resource(outboxRows===null?'rpc/clubhouse_commit_game':'rpc/clubhouse_commit_game_commentary',{method:'POST',body:JSON.stringify({p_room_id:room.id,p_expected_revision:revision,p_state:room,p_actor_id:actor,p_command_id:commandId,p_fingerprint:fingerprint,...(outboxRows!==null?{p_scope:commentaryScopeId,p_outbox:outboxRows}:{})})});
   if(typeof result!=='boolean')throw new Error('Database request failed');return result;
  },
  async byId(id){return (await db(`?id=eq.${encodeURIComponent(id)}&select=state`))[0]?.state;},
  async get(code){return (await db(`?code=eq.${code}&select=state`))[0]?.state;},
  async list(userId){return (await db(`?member_ids=cs.{${userId}}&select=state&order=created_at.desc&limit=30`)).map(r=>r.state);},
  async openTournaments(userId,before){
   if(!uuid.test(userId))throw new Error('Database request failed');
   if(before&&(!uuid.test(before.id||'')||typeof before.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before.createdAt)||!Number.isFinite(Date.parse(before.createdAt))))throw new Error('Database request failed');
   const cursor=before?`&or=(created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id}))`:'';
   return await db(`?member_ids=cs.{${userId}}&state->tournament=not.is.null&state->tournament->>status=neq.completed${cursor}&select=state,created_at,id&order=created_at.desc,id.desc&limit=20`);
  },
  async sessions(userId,view,before){
   if(!uuid.test(userId)||!['open','completed'].includes(view)||before&&(!uuid.test(before.id||'')||typeof before.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before.createdAt)||!Number.isFinite(Date.parse(before.createdAt))))throw new Error('Database request failed');
   const classification=view==='open'?'and(state->tournament.is.null,state->>status.neq.finished),state->tournament->>status.neq.completed':'and(state->tournament.is.null,state->>status.eq.finished),state->tournament->>status.eq.completed';
   const filter=before?`and=(or(${classification}),or(created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})))`:`or=(${classification})`;
   return await db(`?member_ids=cs.{${userId}}&${filter}&select=state,created_at,id&order=created_at.desc,id.desc&limit=20`);
  },
  async recentCount(userId){return (await db(`?host_id=eq.${userId}&created_at=gte.${new Date(now()-3600000).toISOString()}&select=id&limit=10`)).length;},
  async insert(room){return !!await db('',{method:'POST',body:JSON.stringify(row(room))});},
  async update(room,revision){return (await db(`?id=eq.${room.id}&revision=eq.${revision}`,{method:'PATCH',body:JSON.stringify(row(room))}))?.length===1;},
 };
 async function resource(path,options={}){
  try{
   const response=await fetchImplementation(`${url}/rest/v1/${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'}});
   if(!response.ok)throw Error();return await response.json();
  }catch{throw new Error('Database request failed');}
 }
 async function authenticate(request){
  const authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return null;
  try{
   const response=await fetchImplementation(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:authorization}});
   if(!response.ok)return null;
   const user=await response.json();
   return user?.email_confirmed_at&&!user.is_anonymous&&typeof user.id==='string'&&uuid.test(user.id)?user.id:null;
  }catch{throw new Error('Authentication request failed');}
 }
 return {store,authenticate};
}
