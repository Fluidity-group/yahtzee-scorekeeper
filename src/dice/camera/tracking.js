export function inside([x,y],polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes;}
export function validPolygon(p){if(!Array.isArray(p)||p.length!==8||p.some(v=>v.length!==2||v.some(n=>!Number.isFinite(n)||n<0||n>1)))return false;let sign=0,area=0;for(let i=0;i<8;i++){const a=p[i],b=p[(i+1)%8],c=p[(i+2)%8];const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(cross)<1e-6)return false;if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);area+=a[0]*b[1]-b[0]*a[1];}return Math.abs(area)/2>.03;}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function matchScene(before,after,tolerance=.045){
 const pairs=[];before.forEach((a,i)=>after.forEach((b,j)=>{if(a.value===b.value&&distance(a,b)<tolerance)pairs.push({i,j,d:distance(a,b)});}));pairs.sort((a,b)=>a.d-b.d);
 const used=new Set(),result=Array(before.length).fill(-1);for(const p of pairs)if(result[p.i]<0&&!used.has(p.j)){result[p.i]=p.j;used.add(p.j);}return result;
}
export class HoldTracker {
 reset(scene=[]){this.before=structuredClone(scene);this.removed=new Set();this.remaining=new Set();this.clearFrames=0;this.missingCounts=Array(scene.length).fill(0);this.seenActivity=false;}
 constructor(){this.reset();}
 observe(scene,{occluded=false,moving=false}={}){
  if(moving||occluded)this.seenActivity=true;
  // Absence under a hand is never evidence of removal.
  if(occluded||moving||!this.before.length||scene.length>=5){this.missingCounts.fill(0);return;}
  const matched=matchScene(this.before,scene);this.clearFrames++;
  matched.forEach((j,i)=>{if(j<0){if(++this.missingCounts[i]>=3)this.removed.add(i);}else{this.missingCounts[i]=0;this.remaining.add(i);}});
 }
 proposal(scene){if(!this.before.length)return {mask:Array(5).fill(false),method:'first-roll'};
  const matched=matchScene(this.before,scene);
  const mask=matched.map((j,i)=>this.removed.has(i)?false:j>=0&&this.remaining.has(i)?true:null);
  return {mask,method:mask.includes(null)?'needs-confirmation':'observed-pickup'};
 }
}
export function assignSlots(before,scene,mask){
 if(scene.length!==5||mask.length!==5||mask.includes(null))throw Error('Five dice and a resolved hold mask are required.');
 const result=Array(5),available=new Set(scene.map((_,i)=>i));
 for(let i=0;i<5;i++)if(mask[i]){const candidates=[...available].filter(j=>scene[j].value===before[i]?.value).sort((a,b)=>distance(before[i],scene[a])-distance(before[i],scene[b]));if(!candidates.length)throw Error('A kept face is missing. Correct the faces or held selection.');result[i]=scene[candidates[0]];available.delete(candidates[0]);}
 const rest=[...available].sort((a,b)=>scene[a].x-scene[b].x||scene[a].y-scene[b].y);for(let i=0;i<5;i++)if(!mask[i])result[i]=scene[rest.shift()];return result;
}
export class StabilityGate {
 constructor(){this.reset();}
 reset(){this.since=null;this.last=[];this.count=0;}
 update(scene,time,blocked){if(blocked||scene.length!==5||scene.some(d=>!d.value)){this.reset();return false;}const same=this.last.length===5&&matchScene(this.last,scene,.015).every(i=>i>=0);if(!same){this.since=time;this.count=0;}this.last=structuredClone(scene);this.count++;return this.count>=4&&time-this.since>=650;}
}
// Seat is spatial, never inferred from left/right handedness.
export class SeatTracker {
 constructor(){this.reset();}
 reset(){this.tracks=[];this.seats=new Set();}
 update(hands,axis='vertical'){
  const used=new Set();const next=[];
  for(const h of hands){const wrist=h[0],x=wrist.x,y=wrist.y;let best=-1,dist=.18;this.tracks.forEach((t,i)=>{const d=Math.hypot(t.x-x,t.y-y);if(!used.has(i)&&d<dist){best=i;dist=d;}});const t=best<0?{seat:null,frames:0}:this.tracks[best];if(best>=0)used.add(best);const p=axis==='vertical'?y:x;if(t.seat===null&&(p<.22||p>.78))t.seat=p<.22?0:1;t.frames++;t.x=x;t.y=y;if(t.seat!==null&&t.frames>=3&&p>.25&&p<.75)this.seats.add(t.seat);next.push(t);}
  this.tracks=next;return this.seats.size===1?[...this.seats][0]:null;
 }
}
