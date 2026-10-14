// Read-only UI bridge. This module contains no vendor API or game commands.
let state={enabled:false,paused:false,dice:[]};
const listeners=new Set();
export function getDiceStatus(){return state;}
export function publishDiceStatus(next){
 state={...next,dice:next.dice.map(d=>({...d}))};
 for(const listener of listeners)listener(state);
}
export function subscribeDiceStatus(listener){listeners.add(listener);return()=>listeners.delete(listener);}
const eventListeners=new Set();
export function publishDiceEvent(event){for(const listener of eventListeners)listener(event);}
export function subscribeDiceEvents(listener){eventListeners.add(listener);return()=>eventListeners.delete(listener);}
