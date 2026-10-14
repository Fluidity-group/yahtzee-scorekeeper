import { build } from 'esbuild';
await build({entryPoints:['server/rooms/edge.js'],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:'supabase/functions/game-room/index.ts'});
console.log('Bundled game-room function from the shared game rules.');
