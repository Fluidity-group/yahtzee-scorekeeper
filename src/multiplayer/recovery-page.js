import '../styles.css';
import '../clubhouse.css';
import './multiplayer.css';
import {auth,webUrl} from './client.js';
import {mountRecovery} from './recovery.js';
document.body.innerHTML='<div id="recoveryApp" class="device"></div>';
mountRecovery({root:document.getElementById('recoveryApp'),auth,webUrl}).catch(()=>{
 document.getElementById('recoveryApp').textContent='The reset page could not open. Refresh and try again.';
});
