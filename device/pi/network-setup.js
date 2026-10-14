import {randomUUID} from 'node:crypto';
const escape=s=>s.replaceAll('\\','\\\\').replaceAll(' ','\\s');
export function wifiProfile({ssid,password,hotspot=false}){
 if(typeof ssid!=='string'||!ssid||Buffer.byteLength(ssid)>32||/[\x00-\x1f\x7f]/.test(ssid))throw Error('SSID must be 1–32 bytes without control characters');
 if(typeof password!=='string'||password.length<8||password.length>63||/[^\x20-\x7e]/.test(password))throw Error('Use an 8–63 character WPA2 passphrase');
 const id=randomUUID();return {id,text:`[connection]\nid=Dice-${hotspot?'Setup':'Home'}\nuuid=${id}\ntype=wifi\ninterface-name=wlan0\nautoconnect=${!hotspot}\n\n[wifi]\nmode=${hotspot?'ap':'infrastructure'}\nssid=${escape(ssid)}\n\n[wifi-security]\nkey-mgmt=wpa-psk\npsk=${escape(password)}\n\n[ipv4]\nmethod=${hotspot?'shared':'auto'}\n${hotspot?'address1=10.42.0.1/24\n':''}\n[ipv6]\nmethod=disabled\n`};
}
export async function applyWifi(credentials,{write,run,fallbackId}){
 const profile=wifiProfile(credentials);
 await write(profile.text);await run(['connection','load','/etc/NetworkManager/system-connections/dice-home.nmconnection']);
 try{await run(['--wait','30','connection','up','uuid',profile.id]);return {connected:true};}
 catch{if(fallbackId)await run(['connection','up','uuid',fallbackId]);throw Error('Wi-Fi connection failed. Rejoin the setup hotspot and retry.');}
}
