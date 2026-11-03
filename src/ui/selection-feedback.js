import {Capacitor} from '@capacitor/core';
import {Haptics} from '@capacitor/haptics';
export function selectionFeedback(phase){
 if(!Capacitor.isNativePlatform())return;
 const method={start:'selectionStart',change:'selectionChanged',end:'selectionEnd'}[phase];
 if(method)void Haptics[method]().catch(()=>{}); // Unsupported hardware never blocks layout.
}
