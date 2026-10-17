import{Capacitor}from'@capacitor/core';
export async function syncPlayformBars(theme){
 if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='ios')return;
 const{StatusBar,Style}=await import('@capacitor/status-bar');
 await StatusBar.setStyle({style:theme==='dark'?Style.Dark:Style.Light});
}
