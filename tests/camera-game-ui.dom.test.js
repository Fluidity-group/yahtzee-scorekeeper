// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {createCoreGame} from '../src/game/core.js';
import {CameraGame} from '../src/dice/camera-game.js';
const stored=vi.hoisted(()=>({game:null,options:null,testOpened:false}));
vi.mock('@capacitor/core',()=>({Capacitor:{getPlatform:()=> 'android',isNativePlatform:()=>true}}));
vi.mock('../src/core-store.js',()=>({loadCore:async()=>stored.game,saveCore:vi.fn(async g=>{stored.game=g;}),listCore:async()=>[]}));
vi.mock('../src/dice/camera-panel.js',()=>({openCameraGame:vi.fn(async options=>{stored.options=options;}),openDiceIdentificationTest:vi.fn(async()=>{stored.testOpened=true;}),disconnectCamera:vi.fn(async()=>{})}));
it('starts an Android camera turn and renders legal recommendations only after a confirmed persisted roll',async()=>{
 stored.game=createCoreGame({id:'local-camera-ui',names:['Alice','Bob'],source:'camera'});
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('[data-action="start-camera"]')).not.toBeNull());
 const beforeTest=JSON.stringify(stored.game);document.querySelector('[data-action="camera-test"]').click();await vi.waitFor(()=>expect(stored.testOpened).toBe(true));expect(JSON.stringify(stored.game)).toBe(beforeTest);expect(stored.options).toBeNull();
 document.querySelector('[data-action="start-camera"]').click();await vi.waitFor(()=>expect(stored.game.turn?.source).toBe('camera'));
 expect(document.querySelector('[data-action="choose"][data-key="chance"]').disabled).toBe(true);
 document.querySelector('[data-action="capture-camera"]').click();await vi.waitFor(()=>expect(stored.options).not.toBeNull());
 expect(stored.options.autoCapture).toBe(true);
 const adapter=new CameraGame({now:()=>10,id:()=> 'confirmed-camera-roll'});adapter.start({cameraId:'c121',sessionId:'stream-1',calibrationId:'tray-1'});
 expect(adapter.pinReview(stored.options.getGame(),{frame:{version:1,cameraId:'c121',sessionId:'stream-1',calibrationId:'tray-1',sequence:1,frameId:'frame-1',width:960,height:540,orientation:0,mediaOrigin:'camera',timestampMeaning:'local-render-not-sensor-capture',observedAtMonotonicMs:8,ageUpperBoundMs:1},prediction:{dice:[1,2,3,4,5].map((value,i)=>({value,x:.2+i*.1,y:.5})),rejected:[]},readerVersion:'opencv-pips-0.5'})).toBe(true);
 const action=adapter.reviewedAction(stored.options.getGame(),{values:[1,2,3,4,5],heldMask:Array(5).fill(false)});
 const saving=stored.options.commit(action,adapter.commandId);
 await expect(stored.options.commit(action,adapter.commandId)).rejects.toThrow('current save');
 await saving;
 expect(stored.game.turn.rolls).toHaveLength(1);const chance=document.querySelector('[data-action="choose"][data-key="chance"]');expect(chance.disabled).toBe(false);expect(chance.textContent).toContain('15');expect(document.querySelector('[data-action="choose"][data-key="largeStraight"]').textContent).toContain('40');
 expect(stored.game.events.find(e=>e.type==='roll').capture.observation.mediaOrigin).toBe('camera');
});
