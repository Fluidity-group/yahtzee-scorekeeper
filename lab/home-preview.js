import {summarizeHomeAccount} from '../src/multiplayer/home-account.js';
import {createCoreGame} from '../src/game/core.js';
// Fictional, completed fixtures use the same account-summary logic as production reads.
export function homePreview(){
 const userId='sample-alex',opponents=[['sample-jamie','Jamie'],['sample-sam','Sam'],['sample-riley','Riley']];
 const tables=opponents.map(([otherId,name],i)=>{
  const game=createCoreGame({id:'sample-tournament-'+i,names:['Alex',name],mode:'standard',source:'manual',time:`2026-10-${20+i}T18:00:00Z`});
  game.players[0].id=userId;game.players[1].id=otherId;
  game.sheets=game.sheets.map((_,seat)=>({aces:3,twos:6,threes:9,fours:12,fives:15,sixes:18,threeKind:20,fourKind:24,fullHouse:25,smallStraight:30,largeStraight:40,yahtzee:seat===0?50:0,chance:22}));
  game.status='finished';game.endedAt=`2026-10-${20+i}T19:00:00Z`;
  const first=structuredClone(game);first.id+='-first';first.endedAt=`2026-10-${20+i}T18:30:00Z`;
  const room={id:'sample-room-'+i,mode:'standard',game,members:[{userId,name:'Alex'},{userId:otherId,name}],tournament:{status:'completed',gameCount:2,rules:game.rules}};
  return {room,snapshots:[first]};
 });
 return {user:{id:userId,name:'Alex'},...summarizeHomeAccount(userId,tables)};
}
