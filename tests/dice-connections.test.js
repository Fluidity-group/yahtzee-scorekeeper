import {it,expect,vi} from 'vitest';
import {DiceConnections} from '../src/dice/connections.js';
function client(){return {initialize:vi.fn(async()=>{}),isEnabled:vi.fn(async()=>true),requestDevice:vi.fn(async()=>({deviceId:'die',name:'Test die'})),connect:vi.fn(async()=>{}),disconnect:vi.fn(async()=>{})};}
it('connects selected devices and reflects radio disconnects',async()=>{
 const ble=client(),state=new DiceConnections(ble);await state.add();
 expect(state.devices.get('die').state).toBe('Connected');
 ble.connect.mock.calls[0][1]();expect(state.devices.get('die').state).toBe('Disconnected');
 await state.remove('die');expect(state.devices.size).toBe(0);
});
it('rejects duplicates and caps the selection at five',async()=>{
 const ble=client(),state=new DiceConnections(ble);await state.add();
 await expect(state.add()).rejects.toThrow('already selected');
 expect(ble.connect).toHaveBeenCalledTimes(1);
 for(let i=1;i<5;i++){ble.requestDevice.mockResolvedValue({deviceId:`die${i}`});await state.add();}
 await expect(state.add()).rejects.toThrow('Five dice');
});
it('recovers from rejected permissions and failed connections',async()=>{
 const ble=client(),state=new DiceConnections(ble);
 ble.initialize.mockRejectedValueOnce(new Error('Permission denied'));
 await expect(state.add()).rejects.toThrow('Permission denied');expect(state.busy).toBe(false);
 ble.connect.mockRejectedValueOnce(new Error('Timeout'));
 await expect(state.add()).rejects.toThrow('Timeout');expect(state.devices.size).toBe(0);
 await state.add();expect(state.devices.size).toBe(1);
});
it('does not connect a selection returned after the panel closes',async()=>{
 const ble=client(),state=new DiceConnections(ble);let select;
 ble.requestDevice.mockImplementation(()=>new Promise(resolve=>{select=resolve;}));
 const pending=state.add();await vi.waitFor(()=>expect(select).toBeTypeOf('function'));
 await state.close();select({deviceId:'late'});await pending;
 expect(ble.connect).not.toHaveBeenCalled();expect(state.devices.size).toBe(0);
});
it('disconnects an in-flight connection when it completes after closure',async()=>{
 const ble=client(),state=new DiceConnections(ble);let finish;
 ble.connect.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const pending=state.add();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 await state.close();finish();await pending;
 expect(state.devices.size).toBe(0);expect(ble.disconnect).toHaveBeenCalledWith('die');
});
