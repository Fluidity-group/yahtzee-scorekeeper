import {validPolygon} from './tracking.js';
// Proposal only: a blue convex octagonal region may be the felt floor, but
// colour/shape cannot establish that it is the user's intended rolling area.
export function detectTray(cv,image){
 const src=cv.matFromImageData(image),rgb=new cv.Mat(),hsv=new cv.Mat(),mask=new cv.Mat(),contours=new cv.MatVector(),hierarchy=new cv.Mat();let low,high;
 try{
  cv.cvtColor(src,rgb,cv.COLOR_RGBA2RGB);cv.cvtColor(rgb,hsv,cv.COLOR_RGB2HSV);
  low=new cv.Mat(hsv.rows,hsv.cols,hsv.type(),[90,45,18,0]);high=new cv.Mat(hsv.rows,hsv.cols,hsv.type(),[140,255,255,255]);cv.inRange(hsv,low,high,mask);
  cv.findContours(mask,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
  const candidates=[];
  for(let i=0;i<contours.size();i++){
   const c=contours.get(i),hull=new cv.Mat(),approx=new cv.Mat();
   try{
    const area=cv.contourArea(c),fraction=area/(image.width*image.height),r=cv.boundingRect(c);
    if(fraction<.06||fraction>.94||r.x<3||r.y<3||r.x+r.width>image.width-3||r.y+r.height>image.height-3)continue;
    cv.convexHull(c,hull);const solidity=area/cv.contourArea(hull);if(solidity<.85)continue;
    const perimeter=cv.arcLength(hull,true);
    for(let factor=.006;factor<=.045;factor+=.002){
     cv.approxPolyDP(hull,approx,perimeter*factor,true);if(approx.rows!==8)continue;
     let polygon=Array.from({length:8},(_,j)=>[approx.data32S[j*2]/image.width,approx.data32S[j*2+1]/image.height]);
     if(!validPolygon(polygon))continue;
     // Canonical start lets consecutive-frame outlines be compared directly.
     const signed=polygon.reduce((a,p,j)=>a+p[0]*polygon[(j+1)%8][1]-polygon[(j+1)%8][0]*p[1],0);if(signed<0)polygon.reverse();
     let start=0;polygon.forEach((p,j)=>{if(p[0]+p[1]<polygon[start][0]+polygon[start][1])start=j;});polygon=polygon.slice(start).concat(polygon.slice(0,start));
     candidates.push({polygon,fraction,solidity});break;
    }
   }finally{c.delete();hull.delete();approx.delete();}
  }
  candidates.sort((a,b)=>b.fraction-a.fraction);
  return {proposal:candidates[0]?.polygon??null,candidates:candidates.length,reason:candidates.length?'Check that this outline follows the flat blue felt, not the rim.':'No clear blue octagon found. Show the whole tray, improve lighting, or mark corners manually.'};
 }finally{[src,rgb,hsv,mask,contours,hierarchy,low,high].forEach(m=>m?.delete());}
}
export function sameOutline(a,b,tolerance=.02){return !!a&&!!b&&a.length===8&&b.length===8&&b.some((_,shift)=>a.every((p,i)=>Math.hypot(p[0]-b[(i+shift)%8][0],p[1]-b[(i+shift)%8][1])<tolerance));}
