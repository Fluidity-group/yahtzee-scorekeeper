import {it,expect,beforeAll} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {recognize} from '../src/dice/camera/recognizer.js';
import {processFrame} from '../device/pi/vision.js';
let cv;
const path='public/camera-assets/opencv.js';
beforeAll(async()=>{if(!existsSync(path))return;const context={module:{exports:{}},require:createRequire(import.meta.url),__dirname:process.cwd(),process,console,Buffer,WebAssembly,setTimeout,clearTimeout,TextDecoder,TextEncoder};context.global=context;vm.runInNewContext(readFileSync(path,'utf8'),context);cv=context.module.exports;await new Promise(resolve=>cv.then(()=>resolve()));},30000);
const polygon=[[.02,.02],[.98,.02],[.99,.03],[.99,.97],[.98,.98],[.02,.98],[.01,.97],[.01,.03]];
function image(values){const width=640,height=180,data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4)data.set([18,35,70,255],i);const pipPositions={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};values.forEach((v,n)=>{const x0=25+n*100,y0=55;for(let y=y0;y<y0+64;y++)for(let x=x0;x<x0+64;x++)data.set([240,240,230,255],(y*width+x)*4);for(const [px,py]of pipPositions[v])for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++)if(x*x+y*y<=25)data.set([15,15,15,255],((y0+32+py*16+y)*width+x0+32+px*16+x)*4);});return {width,height,data};}
it.skipIf(!existsSync(path))('runs actual OpenCV on synthetic pipped faces 1 through 6',()=>{const r=recognize(cv,image([1,2,3,4,5,6]),polygon);expect(r.dice.map(d=>d.value)).toEqual([1,2,3,4,5,6]);expect(r.rejected).toHaveLength(0);});
it.skipIf(!existsSync(path))('empty blue felt creates no dice',()=>expect(recognize(cv,image([]),polygon).dice).toEqual([]));
it.skipIf(!existsSync(path))('runs the Pi RGBA bridge through the same recognizer without accepting a game roll',()=>{
 const frame=image([1,2,3,4,5]);
 const r=processFrame(cv,{sequence:1,width:frame.width,height:frame.height,pixels:Buffer.from(frame.data).toString('base64')},{calibrationId:'pi-test',width:frame.width,height:frame.height,polygon});
 expect(r.dice.map(d=>d.value)).toEqual([1,2,3,4,5]);expect(r.kind).toBe('preview');expect(r.requiresConfirmation).toBe(true);
});
it.skipIf(!existsSync(path))('ignores bright surroundings enclosing the tray without losing the five dice',()=>{
 const source=image([6,4,3,6,5]);
 const area=[[.02,.08],[.98,.08],[.985,.12],[.985,.88],[.98,.92],[.02,.92],[.015,.88],[.015,.12]];
 for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(x<4||x>635||y<5||y>174)source.data.set([245,245,245,255],(y*source.width+x)*4);
 const r=recognize(cv,source,area);
 expect(r.dice.map(d=>d.value)).toEqual([6,4,3,6,5]);expect(r.rejected).toHaveLength(0);
});

import {detectTray,sameOutline} from '../src/dice/camera/tray.js';
import {inside} from '../src/dice/camera/tracking.js';
const trayPolygon=[[.25,.15],[.75,.15],[.85,.3],[.85,.7],[.75,.85],[.25,.85],[.15,.7],[.15,.3]];
function trayImage(outline=trayPolygon,colour=[18,35,70,255]){
 const width=640,height=480,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(inside([x/width,y/height],outline)?colour:[120,110,95,255],(y*width+x)*4);
 return {width,height,data};
}
it.skipIf(!existsSync(path))('proposes a dark blue octagonal floor through real OpenCV',()=>{
 const r=detectTray(cv,trayImage());expect(r.candidates).toBe(1);expect(sameOutline(r.proposal,trayPolygon,.01)).toBe(true);
});
it.skipIf(!existsSync(path))('rejects blue rectangles, clipped trays, and non-blue octagons',()=>{
 expect(detectTray(cv,trayImage([[.1,.1],[.9,.1],[.9,.9],[.1,.9]])).proposal).toBeNull();
 expect(detectTray(cv,trayImage(trayPolygon.map(([x,y])=>[x-.2,y]))).proposal).toBeNull();
 expect(detectTray(cv,trayImage(trayPolygon,[80,20,20,255])).proposal).toBeNull();
});
it('compares outlines across starting vertices and rejects movement',()=>{
 expect(sameOutline(trayPolygon,trayPolygon.slice(2).concat(trayPolygon.slice(0,2)))).toBe(true);
 expect(sameOutline(trayPolygon,trayPolygon.map(([x,y])=>[x+.05,y]))).toBe(false);
 expect(sameOutline(trayPolygon,null)).toBe(false);
});

it.skipIf(!existsSync(path))('recognizes dice anywhere inside the confirmed polygon and excludes outside dice',()=>{
 const area=[[.02,.05],[.43,.05],[.46,.1],[.46,.9],[.43,.95],[.02,.95],[.01,.9],[.01,.1]];
 expect(recognize(cv,image([1,2,3,4,5,6]),area).dice.map(d=>d.value)).toEqual([1,2,3]);
});
import {patternFits} from '../src/dice/camera/recognizer.js';
it('rejects arbitrary dark blobs that do not form a legal pip layout',()=>{
 expect(patternFits([[.1,.1]])).toBe(false);
 expect(patternFits([[.25,.25],[.75,.25]])).toBe(false);
 expect(patternFits([[.25,.25],[.5,.5],[.75,.75]])).toBe(true);
});
it.skipIf(!existsSync(path))('reads six faces rotated 35 degrees without treating felt corners as pips',()=>{
 const source=image([1,2,3,4,5,6]),out=image([]),angle=35*Math.PI/180;
 for(let n=0;n<6;n++){const cx=57+n*100,cy=87;
  for(let y=cy-48;y<cy+48;y++)for(let x=cx-48;x<cx+48;x++){
   const dx=x-cx,dy=y-cy,sx=Math.round(cx+dx*Math.cos(angle)+dy*Math.sin(angle)),sy=Math.round(cy-dx*Math.sin(angle)+dy*Math.cos(angle));
   if(sx>=0&&sx<source.width&&sy>=0&&sy<source.height)out.data.set(source.data.slice((sy*source.width+sx)*4,(sy*source.width+sx)*4+4),(y*out.width+x)*4);
  }
 }
 expect(recognize(cv,out,polygon).dice.map(d=>d.value)).toEqual([1,2,3,4,5,6]);
});
import {withinTrayMargin,agreedFace} from '../src/dice/camera/recognizer.js';
it('limits tray-edge tolerance to three pixels and does not expand it indefinitely',()=>{
 const square=[[.1,.1],[.9,.1],[.9,.9],[.1,.9]];
 expect(withinTrayMargin([.099,.5],square,960,540)).toBe(true);
 expect(withinTrayMargin([.096,.5],square,960,540)).toBe(false);
 expect(withinTrayMargin([.5,.906],square,960,540)).toBe(false);
 expect(withinTrayMargin([.5,.5],square,960,540)).toBe(true);
});
it('requires two valid threshold readings and refuses conflicting face values',()=>{
 expect(agreedFace([1,null,1])).toBe(1);expect(agreedFace([null,1,null])).toBeNull();
 expect(agreedFace([1,2,1])).toBeNull();expect(agreedFace([null,null,null])).toBeNull();
});
it.skipIf(!existsSync(path))('excludes dice whose centres lie outside the tray even near the margin',()=>{
 const area=[[.09,.1],[.9,.1],[.95,.2],[.95,.8],[.9,.9],[.09,.9],[.0895,.8],[.0895,.2]];
 // First die centre is x=57/640, just left of the polygon.
 expect(recognize(cv,image([1]),area).dice).toHaveLength(0);
});
it.skipIf(!existsSync(path))('keeps neighbouring dice separate across narrow visible gaps',()=>{
 const source=image([1,5]);
 for(const gap of [1,2,5]){
  const out=image([]);
  for(let n=0;n<2;n++)for(let y=55;y<119;y++)for(let x=0;x<64;x++){
   const from=(y*source.width+25+n*100+x)*4,to=(y*out.width+25+n*(64+gap)+x)*4;
   out.data.set(source.data.slice(from,from+4),to);
  }
  const r=recognize(cv,out,polygon);expect(r.dice.map(d=>d.value)).toEqual([1,5]);expect(r.rejected).toHaveLength(0);
 }
});
it.skipIf(!existsSync(path))('does not report edge-touching dice as a single readable face',()=>{
 const source=image([1,5]),out=image([]);
 for(let n=0;n<2;n++)for(let y=55;y<119;y++)for(let x=0;x<64;x++){
  const from=(y*source.width+25+n*100+x)*4,to=(y*out.width+25+n*64+x)*4;out.data.set(source.data.slice(from,from+4),to);
 }
 const r=recognize(cv,out,polygon);expect(r.dice).toHaveLength(0);expect(r.rejected.length).toBeGreaterThan(0);
});
it('still vetoes conflicting values when using the darker fourth threshold',()=>{
 expect(agreedFace([null,null,1,1])).toBe(1);
 expect(agreedFace([null,null,null,1])).toBeNull();
 expect(agreedFace([1,1,null,2])).toBeNull();
});
it.skipIf(!existsSync(path))('splits narrow bright contacts only when two separation passes agree',()=>{
 for(const values of [[1,1],[1,1,1],[1,5]]){
  const source=image(values);
  for(let n=0;n<values.length-1;n++)for(let y=86;y<=88;y++)for(let x=88+n*100;x<=125+n*100;x++)source.data.set([240,240,230,255],(y*source.width+x)*4);
  const r=recognize(cv,source,polygon);
  expect(r.dice.map(d=>d.value)).toEqual(values);expect(r.rejected).toHaveLength(0);
  expect(r.dice.every(d=>d.evidence.method==='contact-split-two-pass')).toBe(true);
 }
});
