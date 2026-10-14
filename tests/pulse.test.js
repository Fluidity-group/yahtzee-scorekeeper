import { describe, it, expect, vi } from 'vitest';
import { acceptedPulse, pulseAccepted, pulseReduced } from '../src/ui/pulse.js';
const before={id:'game',status:'active',activeSeat:0,events:[]};
const next=(event,more={})=>({...before,events:[{id:'accepted',seat:0,...event}],...more});

describe('accepted score and turn pulse',()=>{
 it('follows newly accepted scores and next-player authority',()=>{
  expect(acceptedPulse(before,next({type:'score',category:'chance',value:21},{activeSeat:1}))).toEqual({score:{seat:0,category:'chance'},turnSeat:1,bonusSeat:null});
  expect(acceptedPulse(before,next({type:'score',category:'yahtzee',value:50,bonus:100}))).toMatchObject({bonusSeat:0,turnSeat:null});
 });
 it('stays quiet on initial load, identical snapshots, other games, corrections and optional reports',()=>{
  const after=next({type:'score',category:'chance',value:21});
  expect(acceptedPulse(null,after)).toBeNull();
  expect(acceptedPulse(after,after)).toBeNull();
  expect(acceptedPulse(before,{...after,id:'successor'})).toBeNull();
  expect(acceptedPulse(before,next({type:'score-correction'}))).toBeNull();
  expect(acceptedPulse(before,next({type:'combination-report'}))).toBeNull();
 });
 it('allows chain bonus feedback and turn handover but no failed-roll hype',()=>{
  expect(acceptedPulse(before,next({type:'final-chain-roll',value:100}))).toEqual({score:null,bonusSeat:0,turnSeat:null});
  expect(acceptedPulse(before,next({type:'final-chain-roll',value:0}))).toBeNull();
  expect(acceptedPulse(before,next({type:'final-chain-roll',value:0},{activeSeat:1}))).toEqual({score:null,bonusSeat:null,turnSeat:1});
  expect(acceptedPulse(before,next({type:'final-chain-roll',value:0},{status:'finished'}))).toBeNull();
 });
 it('honors reduced-motion without touching DOM or installing animation timers',()=>{
  expect(pulseReduced(()=>({matches:true}))).toBe(true);
  expect(pulseReduced(()=>({matches:false}))).toBe(false);
  const root={querySelector:vi.fn(),querySelectorAll:vi.fn()};
  const timer=vi.spyOn(globalThis,'setTimeout');
  pulseAccepted(root,before,next({type:'score',category:'chance',value:21}),{reduced:true});
  expect(root.querySelector).not.toHaveBeenCalled(); expect(timer).not.toHaveBeenCalled(); timer.mockRestore();
 });
 it('cleans one-shot classes without delaying input or replacing content',()=>{
  vi.useFakeTimers();
  const classes=new Set(); const target={classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}};
  const root={querySelector:()=>target,querySelectorAll:()=>[target]};
  pulseAccepted(root,before,next({type:'score',category:'chance',value:21},{activeSeat:1}),{reduced:false});
  expect(classes.has('accepted-score')).toBe(true); expect(classes.has('accepted-turn')).toBe(true);
  expect(root.inert).toBeUndefined();
  vi.advanceTimersByTime(1000); expect(classes.size).toBe(0); vi.useRealTimers();
 });
});
