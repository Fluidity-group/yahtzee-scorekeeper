// Authored fictional audition fixtures, never account/player personal data or live moments.
import {createCoreGame,command} from '../../src/game/core.js';
import {acceptedFacts} from '../../src/commentary/facts.js';
import {createProfile} from '../../src/commentary/profiles.js';
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'],time='2026-10-14T18:00:00.000Z';
const names=['Alex','Sam'],profile=createProfile({profanityAllowed:true,humorIntensity:'dark',frequency:'lively',voiceOption:'victor'});
const playerProfiles=[{accountId:ids[0],gender:'',blurb:'I collect vintage staplers and alphabetize the spice rack.'},{accountId:ids[1],gender:'',blurb:'I play weekend golf and insist my terrible shots are strategic.'}];
const game=id=>createCoreGame({id,names,source:'manual',time});
const score=(id,seat,value)=>{let g=game(id);g.activeSeat=seat;g=command(g,{type:'start',seat},{id:'fixture-start001',time});return command(g,{type:'score',seat,category:'chance',value},{id:'fixture-score001',time});};
export function writerAuditionFixtures(){
 const first=score('fictional-score-review',0,25),zero=score('fictional-zero-review',1,0);
 const fresh=game('fictional-new-tournament'),seats=ids.map((accountId,seat)=>({accountId,seat,displayName:names[seat],label:names[seat],remaining:13,total:0}));
 const lifecycle=(purpose,id,eventId,extra={})=>({purpose,facts:{schemaVersion:1,purpose,gameId:id,eventId,commandId:eventId,acceptedAt:time,snapshotBasis:'at-acceptance',observation:'accepted-lifecycle-only',seats,tournamentName:'Friday Dice Club',scoresRecorded:0,gameSequence:1,disclosurePolicy:'scores-and-totals',priorGameSummary:null,...extra},profile,playerProfiles,targetAccountId:ids[1]});
 return [
  {id:'opening',source:'authored-fictional-fixture',input:lifecycle('opening',fresh.id,'fixture-opening001')},
  {id:'return',source:'authored-fictional-fixture',input:lifecycle('return','fictional-return-review','fixture-return001',{gameSequence:2,priorGameSummary:{gameId:'fictional-finished-prior',winners:[{accountId:ids[1],displayName:'Sam',total:250}],tied:false,basis:'authorized-finished-history',meaning:'previous-game-result-not-tournament-standing'}})},
  {id:'score-personalized',source:'authored-fictional-fixture',input:{purpose:'score',facts:acceptedFacts(first,first.events.at(-1).id,ids),profile,playerProfiles,targetAccountId:ids[0]}},
  {id:'zero-personalized',source:'authored-fictional-fixture',input:{purpose:'score',facts:acceptedFacts(zero,zero.events.at(-1).id,ids),profile,playerProfiles,targetAccountId:ids[1]}},
 ];
}

export function correctedWriterAuditionFixtures(){return writerAuditionFixtures().filter(fixture=>['opening','return','score-personalized'].includes(fixture.id));}
