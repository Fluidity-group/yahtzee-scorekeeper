import {tournamentStandings} from './tournament.js';
import {computeTotals} from '../game/scoring.js';
import {recordedYahtzees} from '../game/personal-records.js';

let previewProvider=null;
// Dependency injection for an explicit, labelled development profile. Release code never sets it.
export function setHomeAccountPreview(provider){previewProvider=provider;}

export function summarizeHomeAccount(userId,tables){
 const people=new Map(),tournaments=new Set();let points=0,wins=0,total=0,completed=0;
 const games=new Map();
 for(const {room,snapshots=[]}of tables){
  if(!room.members?.some(member=>member.userId===userId))continue;
  const finished=new Map(snapshots.filter(game=>game.status==='finished').map(game=>[game.id,game]));
  if(room.game){finished.delete(room.game.id);if(room.game.status==='finished')finished.set(room.game.id,room.game);}
  for(const game of finished.values())if(game.players.some(player=>player.id===userId))games.set(game.id,game);
  if(room.tournament?.status!=='completed'||tournaments.has(room.id))continue;
  const standings=tournamentStandings(room,[...finished.values()]);
  if(!standings.final||standings.completedGames!==room.tournament.gameCount)throw Error('Tournament history is still being checked. Try again shortly.');
  tournaments.add(room.id);completed++;
  const pointWinner=standings.pointsLeaders.includes(userId),winWinner=standings.winsLeaders.includes(userId);
  if(pointWinner)points++;if(winWinner)wins++;if(pointWinner||winWinner)total++;
 }
 for(const game of games.values())for(const player of game.players){
  if(!player.id||player.id===userId)continue;
  const lastPlayed=game.endedAt||game.startedAt||'',prior=people.get(player.id);
  if(prior){prior.games++;if(lastPlayed>=prior.lastPlayed){prior.name=player.name;prior.lastPlayed=lastPlayed;}}
  else people.set(player.id,{userId:player.id,name:player.name,games:1,lastPlayed});
 }
 const lowest=new Map(),bests=new Map();
 for(const game of games.values()){
  const seat=game.players.findIndex(player=>player.id===userId),score=computeTotals(game.sheets[seat]).grand;
  // Compare exact scoring contracts, never different modes/rule versions.
  const key=JSON.stringify([game.mode,game.rules,game.players.length===1]),prior=lowest.get(key);
  const date=game.endedAt||game.startedAt||'',yahtzees=recordedYahtzees(game,seat),best=bests.get(key)||{rulesName:game.rules.name,rulesVersion:game.rules.version,highestScore:null,mostYahtzees:null};
  if(!best.highestScore||score>best.highestScore.value)best.highestScore={value:score,gameId:game.id,date};
  if(yahtzees!==null&&(!best.mostYahtzees||yahtzees>best.mostYahtzees.value))best.mostYahtzees={value:yahtzees,gameId:game.id,date};
  bests.set(key,best);
  if(!prior||score<prior.score)lowest.set(key,{score,rulesName:game.rules.name,rulesVersion:game.rules.version,gameId:game.id,endedAt:game.endedAt||game.startedAt||'',tiedGames:1});
  else if(score===prior.score){prior.tiedGames++;if((game.endedAt||game.startedAt||'')>prior.endedAt){prior.gameId=game.id;prior.endedAt=game.endedAt||game.startedAt||'';}}
 }
 return {gamesPlayed:games.size,personalBests:[...bests.values()],razzies:[...lowest.values()],trophies:{total,points,wins,completed},people:[...people.values()].sort((a,b)=>b.lastPlayed.localeCompare(a.lastPlayed)||a.name.localeCompare(b.name))};
}

export async function loadHomeAccount({client:provided}={}){
 if(previewProvider)return {...await previewProvider(),preview:true,status:'ready'};
 const client=provided||await import('./client.js');
 const session=await client.auth?.getSession();if(session?.error)throw session.error;
 const user=session?.data?.session?.user;if(!user)return {status:'signed-out'};
 const request=client.requestRoom;
 const tables=new Map();
 for(const view of ['completed','open']){
  let before;const cursors=new Set();
  do{
   const data=await request({operation:'sessions',view,...(before?{before}:{})});
   data.rooms.forEach(room=>tables.set(room.id,room));
   before=data.nextBefore;
   if(before){const key=JSON.stringify(before);if(cursors.has(key)||cursors.size>=100)throw Error('Account history could not finish loading. Try again.');cursors.add(key);}
  }while(before);
 }
 const entries=[];
 // Small worker pool avoids an unbounded burst against the account's read API.
 const queue=[...tables.values()].filter(room=>room.members?.some(m=>m.userId===user.id));
 await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{
  while(queue.length){
   const room=queue.shift(),snapshots=[];let before;const cursors=new Set();
   if(room.capabilities?.history===true)do{
    const data=await request({operation:'history',code:room.code,...(before?{before}:{})});snapshots.push(...data.games);const next=data.nextBefore;
    if(next!==null&&(cursors.has(next)||before!==undefined&&next>=before||cursors.size>=100))throw Error('Game history could not finish loading. Try again.');
    before=next;if(before)cursors.add(before);
   }while(before);
   const fresh=await request({operation:'read',code:room.code});
   if(fresh.room.revision!==room.revision)throw Error('Your games changed while loading. Refresh to see the latest history.');
   entries.push({room:fresh.room,snapshots});
  }
 }));
 const current=await client.auth?.getSession();if(current?.data?.session?.user?.id!==user.id)return {status:'signed-out'};
 return {status:'ready',preview:false,user:{id:user.id,name:user.user_metadata?.display_name||'Your account'},...summarizeHomeAccount(user.id,entries)};
}

export async function watchHomeAccount(callback){
 const {auth}=await import('./client.js');
 const listener=auth?.onAuthStateChange?.(()=>setTimeout(callback,0));
 return ()=>listener?.data?.subscription?.unsubscribe();
}
