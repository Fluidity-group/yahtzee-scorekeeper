import {waitForOnline} from '../multiplayer/connection.js';

const changed=()=>new Error('Your saved games changed while loading. Refresh Reports to read the latest history.');
const cursorKey=cursor=>JSON.stringify([cursor.createdAt,cursor.id]);
const earlier=(next,prior)=>!prior||next.createdAt<prior.createdAt||next.createdAt===prior.createdAt&&next.id<prior.id;
export class ReportsRetired extends Error {constructor(){super('Your account changed. Open Reports for the current account.');}}

export async function loadReportTables({auth,request,userId,isCurrent=()=>true}){
 let failed=false;
 const guard=()=>{if(failed||!isCurrent())throw new ReportsRetired();};
 async function owner(){guard();const result=await waitForOnline(auth?.getSession());guard();if(result?.error)throw result.error;if(!userId||result?.data?.session?.user?.id!==userId)throw new ReportsRetired();}
 async function read(body){guard();const data=await request(body,{expectedUserId:userId});guard();return data;}
 await owner();
 const rooms=new Map();
 for(const view of ['completed','open']){
  let before;const seen=new Set();
  do{
   const data=await read({operation:'sessions',view,...(before?{before}:{})});
   if(!Array.isArray(data.rooms))throw Error('Saved tables could not be read. Refresh Reports.');
   for(const room of data.rooms){
    if(!room?.id||!room.code||!Number.isSafeInteger(room.revision)||!room.members?.some(m=>m.userId===userId))throw new ReportsRetired();
    const prior=rooms.get(room.id);
    if(prior&&(prior.code!==room.code||prior.revision!==room.revision))throw changed();
    rooms.set(room.id,room);
   }
   const next=data.nextBefore;
   if(next!==null&&(!next||!next.id||!Number.isFinite(Date.parse(next.createdAt))||!earlier(next,before)||seen.has(cursorKey(next))||seen.size>=100))throw Error('Saved table pages could not finish loading. Refresh Reports.');
   before=next;if(next)seen.add(cursorKey(next));
  }while(before);
 }
 const queue=[...rooms.values()],entries=[];
 try{await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{
  while(queue.length){
   guard();const room=queue.shift(),snapshots=[];let before;const seen=new Set();
   if(room.capabilities?.history===true)do{
    const data=await read({operation:'history',code:room.code,...(before?{before}:{})});
    if(!Array.isArray(data.games))throw Error('Saved game history could not be read. Refresh Reports.');
    snapshots.push(...data.games);const next=data.nextBefore;
    if(next!==null&&(!Number.isSafeInteger(next)||next<1||before!==undefined&&next>=before||seen.has(next)||seen.size>=100))throw Error('Saved game pages could not finish loading. Refresh Reports.');
    before=next;if(next)seen.add(next);
   }while(before);
   const fresh=(await read({operation:'read',code:room.code})).room;
   if(fresh?.id!==room.id||fresh?.code!==room.code||fresh?.revision!==room.revision||!fresh.members?.some(m=>m.userId===userId))throw changed();
   entries.push({room:fresh,snapshots,historyAvailable:room.capabilities?.history===true});
  }
 }));}catch(error){failed=true;throw error;}
 await owner();
 return entries;
}
