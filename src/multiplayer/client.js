import { createClient } from '@supabase/supabase-js';
import {fetchWithTimeout,waitForOnline,onlineErrorMessage} from './connection.js';

const url=import.meta.env.VITE_SUPABASE_URL||'';
const key=import.meta.env.VITE_SUPABASE_ANON_KEY||'';
export const webUrl=import.meta.env.VITE_GAME_WEB_URL||'';
export const emailOtpEnabled=import.meta.env.VITE_EMAIL_OTP_ENABLED==='true';
export const configured=!!(url&&key&&webUrl);
const client=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'clubhouse-account'},global:{fetch:fetchWithTimeout}}):null;
export const auth=client?.auth;
const validRoom=value=>value&&typeof value==='object'&&!Array.isArray(value)
 &&typeof value.id==='string'&&value.id.length>0&&typeof value.code==='string'&&/^[A-Z2-9]{8}$/.test(value.code)
 &&Number.isInteger(value.revision)&&value.revision>=0;
export function watchRoom(code,onRoom){
 const channel=client.channel(`room-${code}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'clubhouse_rooms',filter:`code=eq.${code}`},payload=>onRoom(payload.new.state)).subscribe();
 return ()=>{client.removeChannel(channel);};
}
export async function requestRoom(payload){
 if(!auth)throw new Error('Online games are not configured. Use Local games.');
 let lookup;
 try{lookup=await waitForOnline(auth.getSession());}catch(error){throw new Error(onlineErrorMessage(error));}
 if(lookup?.error)throw new Error(onlineErrorMessage(lookup.error));
 const session=lookup?.data?.session;
 if(!session)throw new Error('Please sign in again.');
 let response;const body=JSON.stringify(payload),operation=payload.operation;
 // Reuse the exact command ID on an uncertain network retry.
 for(let attempt=0;attempt<2;attempt++){
  try{
   response=await fetchWithTimeout(`${url}/functions/v1/game-room`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${session.access_token}`},body});
   break;
  }catch(error){if(error?.name==='AbortError'||attempt===1)throw new Error(onlineErrorMessage(error));}
 }
 let data;
 try{data=await waitForOnline(response.json());}catch(error){
  if(['TypeError','AbortError','TimeoutError','AuthRetryableFetchError'].includes(error?.name))throw new Error(onlineErrorMessage(error));
  throw new Error('The multiplayer server returned an unreadable response. Try again, or use Local games.');
 }
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('The multiplayer server returned an unreadable response. Try again, or use Local games.');
 if(!response.ok)throw new Error(typeof data.error==='string'&&data.error?data.error:'Could not connect to the game.');
 const validHistory=()=>Array.isArray(data.games)&&data.games.length<=20&&data.games.every(g=>g&&typeof g.id==='string'&&g.schema===1&&Array.isArray(g.players)&&Array.isArray(g.sheets)&&Array.isArray(g.events))&&(data.nextBefore===null||Number.isInteger(data.nextBefore)&&data.nextBefore>0);
 if(['tournaments','sessions'].includes(operation)){
  const cursor=data.nextBefore;
  if(!Array.isArray(data.rooms)||data.rooms.length>20||!data.rooms.every(r=>validRoom(r)&&(operation==='sessions'||r.tournament&&r.tournament.status!=='completed'))||!(cursor===null||cursor&&typeof cursor.createdAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cursor.createdAt)&&Number.isFinite(Date.parse(cursor.createdAt))&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.id||'')))throw new Error('The multiplayer server returned an unreadable response. Try again.');
  return data;
 }
 const validStandings=()=>Array.isArray(data.standings)&&data.standings.length>=2&&data.standings.length<=8&&data.standings.every(row=>row&&typeof row.userId==='string'&&row.userId&&typeof row.name==='string'&&Number.isInteger(row.points)&&row.points>=0&&Number.isInteger(row.wins)&&row.wins>=0&&Number.isInteger(row.games)&&row.games>=0)&&new Set(data.standings.map(row=>row.userId)).size===data.standings.length&&Number.isInteger(data.completedGames)&&data.completedGames>=0&&typeof data.final==='boolean'&&Number.isInteger(data.roomRevision)&&data.roomRevision>=0&&typeof data.gameId==='string'&&data.gameId.length>0&&Number.isInteger(data.gameRevision)&&data.gameRevision>=0;
 if(operation==='standings'?!validStandings():operation==='history'?!validHistory():operation==='list'?!Array.isArray(data.rooms)||!data.rooms.every(validRoom):!validRoom(data.room))throw new Error('The multiplayer server returned an unreadable response. Try again, or use Local games.');
 return data;
}
