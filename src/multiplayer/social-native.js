import{Capacitor}from'@capacitor/core';
import{auth,requestSocial,webUrl}from'./client.js';
import{socialDestination,notificationDestination,rememberSocialDestination}from'./social-links.js';
let initialised=false,registrationPending=false;
const key='clubhouse:notification-install';
function installationId(){let value;try{value=localStorage.getItem(key);}catch{}if(!/^[0-9a-f-]{36}$/i.test(value||'')){value=crypto.randomUUID();localStorage.setItem(key,value);}return value;}
function navigate(destination){if(!destination)return;rememberSocialDestination(destination);document.dispatchEvent(new CustomEvent('clubhouse-open-tournament',{detail:destination}));}
export async function initialiseNativeSocial(){
 if(initialised||!Capacitor.isNativePlatform())return;initialised=true;
 const{App}=await import('@capacitor/app');
 await App.addListener('appUrlOpen',event=>navigate(socialDestination(event.url,{webOrigin:webUrl})));
 const launch=await App.getLaunchUrl();if(launch?.url)navigate(socialDestination(launch.url,{webOrigin:webUrl}));
 const{PushNotifications}=await import('@capacitor/push-notifications');
 await PushNotifications.addListener('pushNotificationActionPerformed',event=>navigate(notificationDestination(event.notification?.data)));
 await PushNotifications.addListener('pushNotificationReceived',()=>document.dispatchEvent(new Event('clubhouse-social-changed')));
 await PushNotifications.addListener('registration',async event=>{
  if(!registrationPending)return;
  registrationPending=false;
  try{const session=await auth?.getSession();if(!session?.data?.session)throw Error('Sign in to enable notifications.');await requestSocial('device-register',{id:installationId(),platform:Capacitor.getPlatform(),token:event.value});document.dispatchEvent(new CustomEvent('clubhouse-push-status',{detail:'Phone registered. Alerts also need the server delivery service configured.'}));}
  catch{document.dispatchEvent(new CustomEvent('clubhouse-push-status',{detail:'Phone registration failed. Your in-app invitations still work.'}));}
 });
 await PushNotifications.addListener('registrationError',()=>{registrationPending=false;document.dispatchEvent(new CustomEvent('clubhouse-push-status',{detail:'Phone alerts need notification signing/provider setup. In-app invitations still work.'}));});
}
export async function enablePhoneNotifications(){
 if(!Capacitor.isNativePlatform())throw Error('Use the Android or iPhone app for phone alerts. Invitations are available here.');
 if(import.meta.env.VITE_PUSH_ENABLED!=='true')throw Error('Phone alerts are awaiting Apple/Firebase setup. In-app invitations are ready when the server update is installed.');
 await initialiseNativeSocial();const{PushNotifications}=await import('@capacitor/push-notifications');
 let permission=await PushNotifications.checkPermissions();if(permission.receive==='prompt')permission=await PushNotifications.requestPermissions();
 if(permission.receive!=='granted')throw Error('Notifications are off in phone settings. You can still open invitations here.');
 try{localStorage.removeItem('clubhouse:phone-alerts-disabled');}catch{}
 if(Capacitor.getPlatform()==='android')await PushNotifications.createChannel({id:'tournament-play',name:'Tournament invitations & play requests',importance:4,visibility:0});
 registrationPending=true;await PushNotifications.register();
}
export async function syncNativeAccount(user){
 if(!user||!Capacitor.isNativePlatform()||import.meta.env.VITE_PUSH_ENABLED!=='true')return;
 try{if(localStorage.getItem('clubhouse:phone-alerts-disabled')==='true')return;}catch{}
 await initialiseNativeSocial();const{PushNotifications}=await import('@capacitor/push-notifications');
 if((await PushNotifications.checkPermissions()).receive==='granted'){registrationPending=true;await PushNotifications.register();}
}
export async function disablePhoneNotifications(){await requestSocial('device-remove',{id:installationId()});registrationPending=false;try{localStorage.setItem('clubhouse:phone-alerts-disabled','true');}catch{}}
