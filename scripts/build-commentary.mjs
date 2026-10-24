import {build} from 'esbuild';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function buildCommentary({entry='server/commentary/edge.js',outfile='supabase/functions/live-commentary/index.ts'}={}){
 if(!existsSync(entry))throw Error('Commentary edge composition is required: '+entry);
 mkdirSync(dirname(resolve(outfile)),{recursive:true});
 await build({entryPoints:[entry],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile,external:['node:buffer'],banner:{js:'import { Buffer } from "node:buffer";'},logLevel:'silent'});
 return {entry,outfile};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(args.some(arg=>!arg.startsWith('--entry=')&&!arg.startsWith('--outfile=')))throw Error('Use --entry=... --outfile=...');
 const options=Object.fromEntries(args.map(arg=>{const [key,...value]=arg.slice(2).split('=');return [key,value.join('=')];}));
 const result=await buildCommentary(options);console.log('Bundled server-only commentary edge composition: '+result.outfile);
}
