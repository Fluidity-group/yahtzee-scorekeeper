import {inside} from './tracking.js';
export const RECOGNIZER_VERSION='opencv-pips-0.2';
const patterns={1:[[.5,.5]],2:[[.25,.25],[.75,.75]],3:[[.25,.25],[.5,.5],[.75,.75]],4:[[.25,.25],[.75,.25],[.25,.75],[.75,.75]],5:[[.25,.25],[.75,.25],[.5,.5],[.25,.75],[.75,.75]],6:[[.25,.25],[.75,.25],[.25,.5],[.75,.5],[.25,.75],[.75,.75]]};
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
export function recognize(cv,image,polygon,settings={}){
 const allocated=[];const keep=o=>(allocated.push(o),o);
 try{
  const src=keep(cv.matFromImageData(image)),gray=keep(new cv.Mat()),mask=keep(new cv.Mat());cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);cv.threshold(gray,mask,settings.brightness??145,255,cv.THRESH_BINARY);
  const contours=keep(new cv.MatVector()),hierarchy=keep(new cv.Mat());cv.findContours(mask,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
  const dice=[],rejected=[];let foreground=0;const w=image.width,h=image.height,scale=w/960;
  for(let n=0;n<contours.size();n++){
   const contour=contours.get(n);let from,to,transform,face,otsu;
   try{
    const rect=cv.boundingRect(contour),area=cv.contourArea(contour),x=(rect.x+rect.width/2)/w,y=(rect.y+rect.height/2)/h;
    if(!inside([x,y],polygon)||area/(w*h)<.0003)continue;foreground+=area/(w*h);
    const d={x,y,bounds:[rect.x/w,rect.y/h,rect.width/w,rect.height/h],value:null,quality:0};
    const rotated=cv.minAreaRect(contour),rw=rotated.size.width,rh=rotated.size.height;
    if(Math.min(rw,rh)<(settings.minSize??20)*scale||Math.max(rw,rh)>(settings.maxSize??110)*scale||rw/rh<.6||rw/rh>1.67||area/(rw*rh)<.72){rejected.push({...d,reason:'Size / shape / possible hand'});continue;}
    let atEdge=false;for(let i=0;i<contour.rows;i++)if(!inside([contour.data32S[2*i]/w,contour.data32S[2*i+1]/h],polygon)){atEdge=true;break;}
    if(atEdge){rejected.push({...d,reason:'At tray boundary'});continue;}
    const corners=cv.RotatedRect.points(rotated).sort((a,b)=>Math.atan2(a.y-rotated.center.y,a.x-rotated.center.x)-Math.atan2(b.y-rotated.center.y,b.x-rotated.center.x));
    from=cv.matFromArray(4,1,cv.CV_32FC2,corners.flatMap(p=>[p.x,p.y]));to=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,63,0,63,63,0,63]);transform=cv.getPerspectiveTransform(from,to);face=new cv.Mat();cv.warpPerspective(gray,face,transform,new cv.Size(64,64));
    otsu=new cv.Mat();const t=cv.threshold(face,otsu,0,255,cv.THRESH_BINARY|cv.THRESH_OTSU);
    const a=readPips(cv,face,t),b=readPips(cv,face,Math.max(cv.minMaxLoc(face).minVal,t*.85));
    if(a&&a===b){d.value=a;d.quality=.8;d.evidence={method:'rotated-face-pattern',threshold:t,thresholdAgreement:true};dice.push(d);}else rejected.push({...d,reason:'Pip pattern unclear / threshold disagreement'});
   }finally{contour.delete();[from,to,transform,face,otsu].forEach(m=>m?.delete());}
  }
  dice.sort((a,b)=>a.x-b.x||a.y-b.y);return {dice,rejected,foreground};
 }finally{allocated.reverse().forEach(o=>o.delete());}
}
