const key='dice-clubhouse:commentary-timing:v1',starts=new Map();
const bounded=value=>Number.isFinite(value)&&value>=0&&value<=180000;
export function markScoreSubmitted(commandId,now=performance.now()){if(typeof commandId!=='string')return;starts.set(commandId,{at:now,basis:'score-submission'});if(starts.size>200)starts.delete(starts.keys().next().value);}
export function observeScoreEvent(event,now=performance.now()){if(event?.type==='score'&&typeof event.commandId==='string'&&!starts.has(event.commandId)){starts.set(event.commandId,{at:now,basis:'accepted-event-observed'});if(starts.size>200)starts.delete(starts.keys().next().value);}}
export function playbackTiming(job,event,now=performance.now()){
 if(job?.purpose&&job.purpose!=='score'||event?.status!=='started')return null;
 const start=starts.get(job.sourceCommandId);if(!start)return null;const elapsedMs=now-start.at;if(!bounded(elapsedMs))return null;
 const value={basis:start.basis,elapsedMs:Math.round(elapsedMs),nativeStartupMs:bounded(event.nativeElapsedMs)?Math.round(event.nativeElapsedMs):null,measurement:'native-position-callback',at:new Date().toISOString()};
 const history=readPlaybackTimings();history.push(value);try{localStorage.setItem(key,JSON.stringify(history.slice(-100)));}catch{}
 console.info('[Commentary timing]',JSON.stringify(value));starts.delete(job.sourceCommandId);return value;
}
export function readPlaybackTimings(){try{const values=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(values)?values.filter(v=>bounded(v.elapsedMs)&&Date.now()-Date.parse(v.at)<90*86400000).slice(-100):[];}catch{return [];}}
export function forgetPlaybackTimings(){starts.clear();try{localStorage.removeItem(key);}catch{}}
