import { describe, it, expect } from 'vitest';
import { renderSavedSessions, renderResumeEntry, savedSessionState } from '../src/multiplayer/session-cards.js';

function room(id, more = {}) {
 return { id, code:id, status:'active', mode:'standard', hostId:'a', createdAt:'2026-10-14T10:00:00Z', members:[{userId:'a',name:'First'},{userId:'b',name:'Second'}], game:{status:'active',activeSeat:1,players:[{id:'a',name:'Captain House'},{id:'b',name:'Dice Queen'}],rules:{name:'Standard'},hideTotals:true,sheets:[{chance:29},{chance:18}]}, ...more };
}
const tournament = more => ({ name:'Friday Dice', gameCount:5, playerCount:2, status:'playing', ...more });
describe('saved account session cards',()=>{
 it('provides prominent entry actions for both online home and prototype entry',()=>{
  expect(renderResumeEntry()).toContain('data-mp="sessions"');
  expect(renderResumeEntry()).toContain('Resume saved games &amp; tournaments');
  expect(renderResumeEntry()).toContain('no new invitation needed');
  expect(renderResumeEntry({local:true})).toContain('data-action="saved-sessions"');
 });
 it('keeps unfinished tournaments open between games and splits completed sessions',()=>{
  const list=[room('active'),room('finished',{status:'finished',game:{status:'finished'}}),room('between',{status:'finished',game:{status:'finished'},tournament:tournament(),gameSequence:2}),room('final',{status:'finished',game:{status:'finished'},tournament:tournament({status:'completed'})})];
  const open=renderSavedSessions(list,'a',{view:'open'}), completed=renderSavedSessions(list,'a',{view:'completed'});
  expect(open).toContain('data-code="active"');expect(open).toContain('data-code="between"');
  expect(open).not.toContain('data-code="finished"');expect(open).not.toContain('data-code="final"');
  expect(open).toContain('Between games');expect(open).toContain('Game 2 of 5');
  expect(completed).toContain('data-code="finished"');expect(completed).toContain('data-code="final"');
  expect(completed).not.toContain('data-code="between"');expect(completed).toContain('View results');
 });
 it('sorts paused before active and lobbies without mutating input',()=>{
  const list=[room('lobby',{status:'lobby',game:null}),room('active'),room('paused',{tournament:tournament({status:'paused'})})];
  const before=list.map(item=>item.id);
  const html=renderSavedSessions(list,'a');
  expect(html.indexOf('data-code="paused"')).toBeLessThan(html.indexOf('data-code="active"'));
  expect(html.indexOf('data-code="active"')).toBeLessThan(html.indexOf('data-code="lobby"'));
  expect(list.map(item=>item.id)).toEqual(before);
 });
 it('makes pause status and unchanged lifecycle explicit for host and guest',()=>{
  const paused=room('paused',{tournament:tournament({status:'paused'})});
  expect(savedSessionState(paused)).toEqual({key:'paused',label:'Paused'});
  expect(renderSavedSessions([paused],'a')).toContain('Reopening keeps it paused; use Resume tournament');
  expect(renderSavedSessions([paused],'b')).toContain('until the host resumes');
  expect(renderSavedSessions([paused],'b')).toContain('Resume tournament');
  expect(paused.tournament.status).toBe('paused');
 });
 it('uses authenticated player UUID for your turn, preserving frozen nicknames and hiding scores',()=>{
  const data=room('manual');
  const guest=renderSavedSessions([data],'b'),host=renderSavedSessions([data],'a');
  expect(guest).toContain('Your turn · Dice Queen');expect(host).toContain('Dice Queen to play');
  expect(host).not.toContain('Your turn');expect(host).toContain('Captain House');expect(host).not.toContain('First');
  expect(host).not.toContain('29');expect(guest).not.toContain('18');expect(guest).not.toContain('online now');
 });
 it('shows correct lobby context, role and explicit kind without pretending play started',()=>{
  const lobby=room('waiting',{status:'lobby',game:null,tournament:tournament()});
  expect(renderSavedSessions([lobby],'a')).toContain('Continue hosting');
  expect(renderSavedSessions([lobby],'b')).toContain('You joined this table');
  expect(renderSavedSessions([lobby],'a')).toContain('5 games planned');
  expect(renderSavedSessions([lobby],'a')).not.toContain('Game 1 of 5');
  expect(renderSavedSessions([lobby],'a')).toContain('Waiting for players');
 });
 it('escapes names, mode and invitation codes in every card text/attribute',()=>{
  const data=room('" onclick="evil',{tournament:tournament({name:'<script>alert(1)</script>'})});
  data.game.players[1].name='<img src=x>';data.game.rules.name='<Mode>';
  const html=renderSavedSessions([data],'b');
  expect(html).not.toContain('<script>');expect(html).not.toContain('<img');expect(html).not.toContain('data-code="" onclick=');
  expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;img src=x&gt;');expect(html).toContain('&lt;Mode&gt;');
 });
 it('renders no outsider table and handles empty/missing pages with actionable scope',()=>{
  expect(renderSavedSessions([room('private')],'outsider')).not.toContain('data-code="private"');
  expect(renderSavedSessions(undefined,'a')).toContain('No unfinished games');
  expect(renderSavedSessions([],'a',{view:'completed'})).toContain('No completed games');
 });
 it('keeps long eight-player rosters readable without exposing emails or adding nested controls',()=>{
  const data=room('large');
  data.members=Array.from({length:8},(_,seat)=>({userId:String(seat),name:`LongNicknameWithoutSpaces${seat}`,email:`private${seat}@example.test`}));
  data.hostId='0';data.game.players=data.members.map(member=>({id:member.userId,name:member.name}));
  const html=renderSavedSessions([data],'0');
  expect(html).toContain('8 players');for(const member of data.members)expect(html).toContain(member.name);
  expect(html).not.toContain('@example');expect(html.match(/<button/g)).toHaveLength(1);
  expect(html).toContain('aria-label="Players"');
 });
});
