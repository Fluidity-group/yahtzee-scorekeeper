import{build}from'esbuild';
await build({entryPoints:['server/portraits/edge.js'],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:'supabase/functions/portraits/index.ts'});
await build({entryPoints:['server/portraits/cleanup-edge.js'],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:'supabase/functions/portrait-cleanup/index.ts'});
console.log('Bundled authenticated portrait generation and private storage service.');
