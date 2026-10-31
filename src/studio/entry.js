import {auth,configured,emailOtpEnabled,requestRoom,watchRoom} from '../multiplayer/client.js';
import {requestPortrait} from '../profile/portrait-api.js';
import {mountReactionStudio} from './controller.js';
import '../ui/score-presentation.css';
import './studio.css';
const home=new URL(location.href);home.search='';home.hash='';
document.title='Reaction Studio · Dice Clubhouse';
const root=document.createElement('div');root.id='reactionStudio';document.body.replaceChildren(root);
let dispose=()=>{},active=false;
function start(){dispose=mountReactionStudio(root,{auth,configured,emailOtpEnabled,request:requestRoom,watch:watchRoom,homeUrl:home.href,avatars:async(code,ownerId)=>(await requestPortrait({operation:'peers',code},{expectedOwner:ownerId,timeoutMs:15000})).profiles||[]});active=true;}
start();
window.addEventListener('pagehide',()=>{dispose();active=false;});
window.addEventListener('pageshow',event=>{if(event.persisted&&!active)start();});
