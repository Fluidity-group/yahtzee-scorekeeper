import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { DiceConnections } from './connections.js';

export function openDiceConnections(){
 const dialog=document.createElement('dialog');dialog.className='core-dialog dice-connection-dialog';
 const native=Capacitor.getPlatform()==='android';
 dialog.innerHTML=`<button class="sheet-close" data-dice-close aria-label="Close dice connections">×</button><h2>Connect your dice</h2>
 <p class="core-muted">${native?'Wake your GoDice and close any other app connected to them. Select each die in the Bluetooth picker.':'Use Connect dice in the Android app for this first hardware test. Joined browsers can keep playing manually.'}</p>
 <p class="simulation-note">Connection test · Dice faces and automatic scoring are not enabled yet.</p>
 <div data-dice-list></div><p data-dice-message role="status" aria-live="polite"></p>
 ${native?'<button class="bigbtn score core-primary" data-dice-add>Add a die</button><p class="core-muted">Choose only your dice. This test lists nearby Bluetooth devices. Closing this panel disconnects the test dice.</p>':''}`;
 document.body.append(dialog);
 let message='';
 const render=()=>{
  if(!dialog.isConnected)return;
  const list=dialog.querySelector('[data-dice-list]');list.replaceChildren();
  const count=document.createElement('p');count.textContent=`${[...connections.devices.values()].filter(d=>d.state==='Connected').length} / 5 connected`;list.append(count);
  for(const device of connections.devices.values()){
   const row=document.createElement('div');row.className='connection-die';
   const text=document.createElement('span');text.textContent=`${device.name} · ${device.state}`;
   const remove=document.createElement('button');remove.className='hbtn';remove.textContent='Remove';remove.disabled=connections.busy;
   remove.addEventListener('click',async()=>{try{message='';await connections.remove(device.id);}catch(error){message=error.message;}render();});
   row.append(text,remove);list.append(row);
  }
  const add=dialog.querySelector('[data-dice-add]');if(add){add.disabled=connections.busy||connections.devices.size>=5;add.textContent=connections.busy?'Connecting…':'Add a die';}
  dialog.querySelector('[data-dice-message]').textContent=message;
 };
 const connections=new DiceConnections(BleClient,render);
 const close=()=>dialog.close();
 const hidden=()=>{if(document.hidden)close();};
 dialog.addEventListener('close',()=>{document.removeEventListener('visibilitychange',hidden);void connections.close();dialog.remove();},{once:true});
 dialog.querySelector('[data-dice-close]').addEventListener('click',close);
 dialog.querySelector('[data-dice-add]')?.addEventListener('click',async()=>{
  message='';try{await connections.add();}catch(error){message=`${error.message||'Could not connect.'} You can try again.`;}render();
 });
 document.addEventListener('visibilitychange',hidden);
 render();dialog.showModal();
}
