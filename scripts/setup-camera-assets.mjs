import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../public/camera-assets/',import.meta.url);
const files=[
 ['opencv.js','https://docs.opencv.org/4.13.0/opencv.js','Apache-2.0'],
 ['vision_bundle.mjs','https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs','Apache-2.0'],
 ...['vision_wasm_internal.js','vision_wasm_internal.wasm','vision_wasm_nosimd_internal.js','vision_wasm_nosimd_internal.wasm'].map(n=>['wasm/'+n,'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/'+n,'Apache-2.0']),
 ['hand_landmarker.task','https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task','See MediaPipe model card'],
 ['OPENCV-LICENSE.txt','https://raw.githubusercontent.com/opencv/opencv/4.13.0/LICENSE','Apache-2.0'],
 ['MEDIAPIPE-LICENSE.txt','https://raw.githubusercontent.com/google-ai-edge/mediapipe/v0.10.21/LICENSE','Apache-2.0'],
];
await mkdir(new URL('wasm/',root),{recursive:true});
const manifest=[];
for(const [file,url,license] of files){
 const response=await fetch(url);if(!response.ok)throw new Error(`${response.status}: ${url}`);
 const data=Buffer.from(await response.arrayBuffer());
 await writeFile(new URL(file,root),data);
 manifest.push({file,url,license,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
 console.log(`Saved ${file} (${data.length} bytes)`);
}
await writeFile(new URL('manifest.json',root),JSON.stringify({opencv:'4.13.0',mediapipe:'0.10.21',modelVersion:1,modelCard:'https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker#models',files:manifest},null,2));
