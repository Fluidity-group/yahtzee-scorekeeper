// Only the Home shortcut is dismissed. Saved game snapshots/history stay intact.
const key='dice-clubhouse:resume-dismissed:v1';
const read=()=>{const value=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(value)||!value.every(id=>typeof id==='string'))throw Error('Resume preferences are unreadable. Your games are still saved.');return value;};
export const resumeDismissed=id=>{try{return read().includes(id);}catch{return false;}};
export function setResumeDismissed(id,dismissed){const ids=new Set(read());dismissed?ids.add(id):ids.delete(id);localStorage.setItem(key,JSON.stringify([...ids]));}

export function bindResumeSwipe(root,onRemove){
 const card=root.querySelector('.home-resume');if(!card)return()=>{};
 let start=null,delta=0,horizontal=false,suppress=false;
 const reset=()=>{start=null;delta=0;horizontal=false;card.style.removeProperty('--resume-drag');};
 const begin=e=>{reset();suppress=false;if(e.touches.length===1)start={x:e.touches[0].clientX,y:e.touches[0].clientY};};
 const move=e=>{if(!start||e.touches.length!==1){reset();return;}const dx=e.touches[0].clientX-start.x,dy=e.touches[0].clientY-start.y;if(!horizontal&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){reset();return;}if(dx>12&&dx>Math.abs(dy)*1.5)horizontal=true;if(horizontal){e.preventDefault();delta=Math.max(0,dx);card.style.setProperty('--resume-drag',Math.min(delta,180)+'px');}};
 const end=()=>{const remove=horizontal&&delta>=80;suppress=suppress||horizontal;reset();if(remove)onRemove();};
 const cancel=()=>{suppress=horizontal;reset();};
 const click=e=>{if(suppress){e.preventDefault();e.stopPropagation();suppress=false;}};
 card.addEventListener('touchstart',begin,{passive:true});card.addEventListener('touchmove',move,{passive:false});card.addEventListener('touchend',end);card.addEventListener('touchcancel',cancel);card.addEventListener('click',click,true);
 return()=>{card.removeEventListener('touchstart',begin);card.removeEventListener('touchmove',move);card.removeEventListener('touchend',end);card.removeEventListener('touchcancel',cancel);card.removeEventListener('click',click,true);};
}
