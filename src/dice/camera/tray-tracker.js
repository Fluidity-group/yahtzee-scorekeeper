import {validPolygon} from './tracking.js';
const centre=p=>p.reduce((a,v)=>[a[0]+v[0]/p.length,a[1]+v[1]/p.length],[0,0]);
// Align cyclic vertex order, then fit a bounded similarity transform.
export function fitTray(reference,candidate){
 if(!validPolygon(reference)||!validPolygon(candidate))return null;
 const a=centre(reference),b=centre(candidate);let best=null;
 for(const order of [candidate,[...candidate].reverse()])for(let shift=0;shift<8;shift++){
  const target=order.map((_,i)=>order[(i+shift)%8]);let dot=0,cross=0,norm=0;
  reference.forEach((p,i)=>{const x=p[0]-a[0],y=p[1]-a[1],u=target[i][0]-b[0],v=target[i][1]-b[1];dot+=x*u+y*v;cross+=x*v-y*u;norm+=x*x+y*y;});
  const c=dot/norm,s=cross/norm,scale=Math.hypot(c,s),angle=Math.atan2(s,c);
  const apply=p=>[b[0]+c*(p[0]-a[0])-s*(p[1]-a[1]),b[1]+s*(p[0]-a[0])+c*(p[1]-a[1])];
  const error=Math.sqrt(reference.reduce((n,p,i)=>{const q=apply(p);return n+(q[0]-target[i][0])**2+(q[1]-target[i][1])**2;},0)/8);
  if(!best||error<best.error-1e-6||Math.abs(error-best.error)<=1e-6&&Math.abs(angle)<Math.abs(best.angle))best={error,scale,angle,shift:Math.hypot(b[0]-a[0],b[1]-a[1]),apply,target};
 }
 return best;
}
export class TrayTracker {
 reset(polygon){this.bounds=structuredClone(polygon);this.anchor=null;this.pending=null;this.streak=0;}
 update(proposal,candidates=1){
  if(candidates!==1||!validPolygon(proposal)){this.pending=null;this.streak=0;return {state:'seeking'};}
  const fit=fitTray(this.anchor??this.bounds,proposal);
  if(!fit||fit.error>.012||fit.shift>.08||fit.scale<.9||fit.scale>1.1||Math.abs(fit.angle)>.21){this.pending=null;this.streak=0;return {state:'seeking'};}
  // Initial anchor records the detected floor but preserves the user's confirmed bounds.
  if(!this.anchor){
   const near=this.bounds.every(p=>{const q=fit.apply(p);return Math.hypot(p[0]-q[0],p[1]-q[1])<.012;});
   if(near){this.anchor=structuredClone(fit.target);return {state:'locked'};}
   this.anchor=structuredClone(this.bounds);
  }
  // Polygon simplification jitters individual corners even on a stationary tray.
  // Measure coherent fitted motion, not the largest raw vertex error.
  const fitted=this.anchor.map(fit.apply);
  const movement=Math.max(...this.anchor.map((p,i)=>Math.hypot(p[0]-fitted[i][0],p[1]-fitted[i][1])));
  if(movement<.005){this.pending=null;this.streak=0;return {state:'locked'};}
  const consistent=this.pending&&fitted.every((p,i)=>Math.hypot(p[0]-this.pending[i][0],p[1]-this.pending[i][1])<.006);
  this.streak=consistent?this.streak+1:1;this.pending=fitted;
  if(this.streak<3)return {state:'moving'};
  const bounds=this.bounds.map(fit.apply);if(!validPolygon(bounds)){this.streak=0;return {state:'seeking'};}
  this.bounds=bounds;this.anchor=structuredClone(fit.target);this.pending=null;this.streak=0;
  return {state:'resynced',polygon:structuredClone(bounds)};
 }
}
