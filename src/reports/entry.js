import {auth,configured,emailOtpEnabled,requestRoom,webUrl} from '../multiplayer/client.js';
import {recoveryRedirect} from '../multiplayer/recovery.js';
import {mountReports} from './controller.js';
import './reports.css';
const home=new URL(location.href);home.search='';home.hash='';
const studio=new URL(home);studio.searchParams.set('studio','1');
try{document.documentElement.dataset.theme=localStorage.getItem('yz_theme')||'dark';}catch{document.documentElement.dataset.theme='dark';}
document.title='Clubhouse Reports · YAHTZ';
const root=document.createElement('div');root.id='clubhouseReports';document.body.replaceChildren(root);
let dispose=()=>{},active=false;
function start(){dispose=mountReports(root,{auth,configured,emailOtpEnabled,request:requestRoom,homeUrl:home.href,studioUrl:studio.href,recoveryUrl:recoveryRedirect(webUrl||home.href)});active=true;}
start();
window.addEventListener('pagehide',()=>{dispose();active=false;});
window.addEventListener('pageshow',event=>{if(event.persisted&&!active)start();});
