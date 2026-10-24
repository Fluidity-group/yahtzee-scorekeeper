import {inside} from './camera/tracking.js';
// Conservative local-image guard, not an optical reliability claim. Small tiles
// ensure an unreadable die changing cannot disappear into a whole-tray average.
export function sameCameraScene(before,after,polygon,{difference=25,maxChangedFraction=.01}={}){
 if(!before||!after||before.width!==after.width||before.height!==after.height||before.data.length!==after.data.length)return false;
 const {width,height}=before;
 for(let top=0;top<height;top+=16)for(let left=0;left<width;left+=16){let count=0,changed=0;
  for(let y=top;y<Math.min(top+16,height);y+=2)for(let x=left;x<Math.min(left+16,width);x+=2){if(!inside([x/width,y/height],polygon))continue;count++;const i=(y*width+x)*4;if(Math.max(...[0,1,2].map(c=>Math.abs(before.data[i+c]-after.data[i+c])))>difference)changed++;}
  if(count&&changed/count>maxChangedFraction)return false;
 }
 return true;
}
