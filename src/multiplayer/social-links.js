const codePattern=/^[A-Z2-9]{8}$/;
export function socialDestination(value,{webOrigin}={}){
 let url;try{url=new URL(value);}catch{return null;}
 if(url.protocol==='diceclubhouse:'&&url.hostname==='table'){
  const code=url.pathname.slice(1).toUpperCase();return codePattern.test(code)?{code}:null;
 }
 if(!webOrigin||url.origin!==new URL(webOrigin).origin||url.protocol!=='https:')return null;
 const code=(url.searchParams.get('join')||'').toUpperCase();return codePattern.test(code)?{code}:null;
}
export function notificationDestination(data){
 return data&&codePattern.test(data.code||'')&&['invite','play','ready'].includes(data.kind)?{code:data.code,kind:data.kind}:null;
}
const key='clubhouse:pending-tournament';
export function rememberSocialDestination(destination,storage=globalThis.sessionStorage){
 if(!destination||!codePattern.test(destination.code||''))return;
 try{storage.setItem(key,JSON.stringify({code:destination.code,...(['invite','play','ready'].includes(destination.kind)?{kind:destination.kind}:{}),at:Date.now()}));}catch{}
}
export function readSocialDestination(storage=globalThis.sessionStorage){
 try{const value=JSON.parse(storage.getItem(key)||'null');return value&&codePattern.test(value.code)&&Number.isFinite(value.at)&&Date.now()>=value.at&&Date.now()-value.at<24*60*60*1000?{code:value.code,...(['invite','play','ready'].includes(value.kind)?{kind:value.kind}:{})}:null;}catch{return null;}
}
export function clearSocialDestination(storage=globalThis.sessionStorage){try{storage.removeItem(key);}catch{}}
