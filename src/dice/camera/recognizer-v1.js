import {inside} from './tracking.js';
// Conservative baseline for opaque light D6s with dark pips. Returns rejected
// shapes too: losing an unreadable die must not make a scene look unobstructed.
export function recognize(cv,image,polygon,settings={}){
 const allocated=[];const keep=o=>(allocated.push(o),o);
 try{
  const src=keep(cv.matFromImageData(image)),gray=keep(new cv.Mat()),mask=keep(new cv.Mat());
  cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
  cv.threshold(gray,mask,settings.brightness??145,255,cv.THRESH_BINARY);
  const contours=keep(new cv.MatVector()),hierarchy=keep(new cv.Mat());
  cv.findContours(mask,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
  const dice=[],rejected=[];const w=image.width,h=image.height;let foreground=0;
  for(let n=0;n<contours.size();n++){
   const contour=contours.get(n);
   try{
    const rect=cv.boundingRect(contour),area=cv.contourArea(contour),x=(rect.x+rect.width/2)/w,y=(rect.y+rect.height/2)/h;
    if(!inside([x,y],polygon))continue;
    const fraction=area/(w*h);if(fraction<.0003)continue;foreground+=fraction;
    const d={x,y,bounds:[rect.x/w,rect.y/h,rect.width/w,rect.height/h],value:null,quality:0};
    const min=settings.minSize??20,max=settings.maxSize??110,ratio=rect.width/rect.height;
    if(rect.width<min||rect.height<min||rect.width>max||rect.height>max||ratio<.55||ratio>1.8||area/(rect.width*rect.height)<.55){rejected.push({...d,reason:'Size / shape / possible hand'});continue;}
    if([[rect.x,rect.y],[rect.x+rect.width,rect.y],[rect.x,rect.y+rect.height],[rect.x+rect.width,rect.y+rect.height]].some(p=>!inside([p[0]/w,p[1]/h],polygon))){rejected.push({...d,reason:'At tray boundary'});continue;}
    const inset=Math.max(2,Math.round(Math.min(rect.width,rect.height)*.12));
    const roi=gray.roi(new cv.Rect(rect.x+inset,rect.y+inset,rect.width-2*inset,rect.height-2*inset));
    const dark=new cv.Mat(),pips=new cv.MatVector(),ph=new cv.Mat();let count=0,bad=false;
    try{
     cv.threshold(roi,dark,settings.pipThreshold??85,255,cv.THRESH_BINARY_INV);
     cv.findContours(dark,pips,ph,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
     for(let k=0;k<pips.size();k++){const c=pips.get(k);try{const a=cv.contourArea(c),r=cv.boundingRect(c),per=cv.arcLength(c,true),f=a/(roi.rows*roi.cols);if(f<.006)continue;if(f>.15||r.x<=0||r.y<=0||r.x+r.width>=roi.cols||r.y+r.height>=roi.rows||4*Math.PI*a/(per*per)<.40){bad=true;continue;}count++;}finally{c.delete();}}
    }finally{roi.delete();dark.delete();pips.delete();ph.delete();}
    if(!bad&&count>=1&&count<=6){d.value=count;d.quality=.7;dice.push(d);}else rejected.push({...d,reason:'Pips unclear / touching dice'});
   }finally{contour.delete();}
  }
  dice.sort((a,b)=>a.x-b.x||a.y-b.y);
  return {dice,rejected,foreground};
 }finally{allocated.reverse().forEach(o=>o.delete());}
}
