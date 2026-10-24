// Generic BLE connection test: no vendor commands, notifications or game writes.
export class DiceConnections {
 constructor(client, changed = () => {}) {
  this.client=client;this.changed=changed;this.devices=new Map();this.busy=false;this.closed=false;
 }
 async add() {
  if(this.busy||this.closed)return;
  if(this.devices.size>=5)throw new Error('Five dice are already selected. Remove one before adding another.');
  this.busy=true;this.changed();
  let entry;
  try {
   await this.client.initialize({androidNeverForLocation:true});
   if(this.closed)return;
   if(!await this.client.isEnabled())throw new Error('Turn on Bluetooth, then try again.');
   const device=await this.client.requestDevice({});
   if(this.closed)return;
   if(this.devices.has(device.deviceId))throw new Error('That die is already selected. Choose another die.');
   entry={id:device.deviceId,name:device.name||'Unnamed device',state:'Connecting'};
   this.devices.set(entry.id,entry);this.changed();
   await this.client.connect(entry.id,()=>{
    if(this.devices.get(entry.id)===entry){entry.state='Disconnected';this.changed();}
   },{timeout:10000});
   if(this.closed){await this.client.disconnect(entry.id);return;}
   // An early disconnect callback must not be overwritten by a late connect resolution.
   if(entry.state==='Connecting')entry.state='Connected';
  } catch(error) {
   if(entry){this.devices.delete(entry.id);await this.client.disconnect(entry.id).catch(()=>{});}
   throw error;
  } finally {this.busy=false;this.changed();}
 }
 async remove(id) {
  if(this.busy||this.closed)return;
  const entry=this.devices.get(id);if(!entry)return;
  this.busy=true;this.changed();
  try{await this.client.disconnect(id);this.devices.delete(id);}
  finally{this.busy=false;this.changed();}
 }
 async close() {
  this.closed=true;
  const ids=[...this.devices.keys()];this.devices.clear();
  const outcomes=await Promise.allSettled(ids.map(id=>this.client.disconnect(id)));
  return outcomes.every(outcome=>outcome.status==='fulfilled');
 }
}
