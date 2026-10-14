import {inside} from './tracking.js';
export const RECOGNIZER_VERSION='opencv-pips-0.5';
const patterns={1:[[.5,.5]],2:[[.25,.25],[.75,.75]],3:[[.25,.25],[.5,.5],[.75,.75]],4:[[.25,.25],[.75,.25],[.25,.75],[.75,.75]],5:[[.25,.25],[.75,.25],[.5,.5],[.25,.75],[.75,.75]],6:[[.25,.25],[.75,.25],[.25,.5],[.75,.5],[.25,.75],[.75,.75]]};
export function withinTrayMargin(point,polygon,width,height,margin=3){
 if(inside(point,polygon))return true;
 const [x,y]=[point[0]*width,point[1]*height];
 return polygon.some((a,i)=>{const b=polygon[(i+1)%polygon.length],ax=a[0]*width,ay=a[1]*height,dx=(b[0]-a[0])*width,dy=(b[1]-a[1])*height;const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy)<=margin;});
}
export function patternFits(points){
 const template=patterns[points.length];if(!template)return false;
 for(let rotation=0;rotation<4;rotation++){
  const used=new Set();let ok=true;
  for(const point of points){let [x,y]=point;for(let r=0;r<rotation;r++)[x,y]=[1-y,x];let nearest=-1,best=.16;
   template.forEach(([tx,ty],i)=>{const d=Math.hypot(x-tx,y-ty);if(!used.has(i)&&d<best){best=d;nearest=i;}});
   if(nearest<0){ok=false;break;}used.add(nearest);
  }if(ok)return true;
 }return false;
}
function readPips(cv,face,threshold){
 const dark=new cv.Mat(),contours=new cv.MatVector(),hierarchy=new cv.Mat();
 try{
  cv.threshold(face,dark,threshold,255,cv.THRESH_BINARY_INV);cv.findContours(dark,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
  const points=[];let bad=false;
  for(let i=0;i<contours.size();i++){const c=contours.get(i);try{
   const a=cv.contourArea(c),r=cv.boundingRect(c),per=cv.arcLength(c,true);
   // Exclude the outer face edge, where felt and side faces contaminate the crop.
   if(r.x<5||r.y<5||r.x+r.width>59||r.y+r.height>59)continue;
   if(a<8)continue;
   if(a>360||per===0||4*Math.PI*a/(per*per)<.35){bad=true;continue;}
   const m=cv.moments(c);points.push([m.m10/m.m00/64,m.m01/m.m00/64]);
  }finally{c.delete();}}
  return !bad&&patternFits(points)?points.length:null;
 }finally{dark.delete();contours.delete();hierarchy.delete();}
}
export function agreedFace(counts){const valid=counts.filter(v=>Number.isInteger(v)&&v>=1&&v<=6);return valid.length>=2&&valid.every(v=>v===valid[0])?valid[0]:null;}
export function recognize(cv,image,polygon,settings={}){
 const allocated=[];const keep=o=>(allocated.push(o),o);
 try{
  const src=keep(cv.matFromImageData(image)),gray=keep(new cv.Mat()),mask=keep(new cv.Mat());cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);cv.threshold(gray,mask,settings.brightness??145,255,cv.THRESH_BINARY);
  if(settings._erode){const kernel=keep(cv.Mat.ones(3,3,cv.CV_8U));cv.erode(mask,mask,kernel,new cv.Point(-1,-1),settings._erode);}
  const contours=keep(new cv.MatVector()),hierarchy=keep(new cv.Mat());cv.findContours(mask,contours,hierarchy,cv.RETR_CCOMP,cv.CHAIN_APPROX_SIMPLE);
  const dice=[],rejected=[];let foreground=0;const w=image.width,h=image.height,scale=w/960;
  for(let n=0;n<contours.size();n++){
   const contour=contours.get(n);let from,to,transform,face,otsu;
   try{
    // CCOMP retains dice inside a surrounding bright background; ignore hole contours.
    if(hierarchy.data32S[n*4+3]>=0)continue;
    const rect=cv.boundingRect(contour),area=cv.contourArea(contour),x=(rect.x+rect.width/2)/w,y=(rect.y+rect.height/2)/h;
    if(!inside([x,y],polygon)||area/(w*h)<.0003)continue;
    // A background contour can enclose the tray while its bounding-box centre
    // falls on the felt. Its outline must actually reach the tray to be a candidate.
    let reachesTray=false;
    for(let i=0;i<contour.rows;i++)if(withinTrayMargin([contour.data32S[2*i]/w,contour.data32S[2*i+1]/h],polygon,w,h,3*scale)){reachesTray=true;break;}
    if(!reachesTray)continue;
    foreground+=area/(w*h);
    const d={x,y,bounds:[rect.x/w,rect.y/h,rect.width/w,rect.height/h],value:null,quality:0};
    const rotated=cv.minAreaRect(contour),rw=rotated.size.width,rh=rotated.size.height;
    if(Math.min(rw,rh)<(settings.minSize??20)*scale||Math.max(rw,rh)>(settings.maxSize??110)*scale||rw/rh<.6||rw/rh>1.67||area/(rw*rh)<.72){rejected.push({...d,reason:'Size / shape / possible hand'});continue;}
    let atEdge=false;for(let i=0;i<contour.rows;i++)if(!withinTrayMargin([contour.data32S[2*i]/w,contour.data32S[2*i+1]/h],polygon,w,h,3*scale)){atEdge=true;break;}
    if(atEdge){rejected.push({...d,reason:'At tray boundary'});continue;}
    const corners=cv.RotatedRect.points(rotated).sort((a,b)=>Math.atan2(a.y-rotated.center.y,a.x-rotated.center.x)-Math.atan2(b.y-rotated.center.y,b.x-rotated.center.x));
    from=cv.matFromArray(4,1,cv.CV_32FC2,corners.flatMap(p=>[p.x,p.y]));to=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,63,0,63,63,0,63]);transform=cv.getPerspectiveTransform(from,to);face=new cv.Mat();cv.warpPerspective(gray,face,transform,new cv.Size(64,64));
    otsu=new cv.Mat();const t=cv.threshold(face,otsu,0,255,cv.THRESH_BINARY|cv.THRESH_OTSU);
    // A wider, bounded sweep tolerates grey side-face contamination of Otsu.
    // A single successful threshold is insufficient; conflicting values veto.
    const floor=cv.minMaxLoc(face).minVal;const thresholds=[t,Math.max(floor,t*.925),Math.max(floor,t*.85),Math.max(floor,t*.775)];const counts=thresholds.map(threshold=>readPips(cv,face,threshold));const value=agreedFace(counts);
    if(value){d.value=value;d.quality=.8;d.evidence={method:'rotated-face-pattern',threshold:t,thresholdAgreement:true,counts,edgeMarginPixels:3*scale};dice.push(d);}else rejected.push({...d,reason:'Pip pattern unclear / threshold disagreement',diagnostic:{threshold:t,counts}});
   }finally{contour.delete();[from,to,transform,face,otsu].forEach(m=>m?.delete());}
  }
  // Only try splitting rejected shapes. Never split a readable die or infer a
  // face from the number of objects needed to reach five.
  if(!settings._splitPass&&rejected.some(d=>d.reason==='Size / shape / possible hand')){
   const passes=[2,3].map(_erode=>recognize(cv,image,polygon,{...settings,_splitPass:true,_erode}));
   for(let i=rejected.length-1;i>=0;i--){
    const parent=rejected[i];if(parent.reason!=='Size / shape / possible hand')continue;
    const [px,py,pw,ph]=parent.bounds;
    const contained=d=>d.bounds[0]>=px&&d.bounds[1]>=py&&d.bounds[0]+d.bounds[2]<=px+pw+1e-6&&d.bounds[1]+d.bounds[3]<=py+ph+1e-6;
    const groups=passes.map(p=>p.dice.filter(contained)),[a,b]=groups;
    if(a.length<2||a.length>5||a.length!==b.length||dice.length+a.length>5||passes.some(p=>p.rejected.some(contained)))continue;
    const used=new Set();const agrees=a.every(d=>{const j=b.findIndex((e,j)=>!used.has(j)&&d.value===e.value&&Math.hypot(d.x-e.x,d.y-e.y)<.008);if(j<0)return false;used.add(j);return true;});
    if(!agrees||a.reduce((sum,d)=>sum+d.bounds[2]*d.bounds[3],0)<pw*ph*.55)continue;
    dice.push(...a.map(d=>({...d,quality:.7,evidence:{...d.evidence,method:'contact-split-two-pass',erosionAgreement:true}})));rejected.splice(i,1);
   }
  }
  dice.sort((a,b)=>a.x-b.x||a.y-b.y);return {dice,rejected,foreground};
 }finally{allocated.reverse().forEach(o=>o.delete());}
}
