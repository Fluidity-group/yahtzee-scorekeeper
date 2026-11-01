import{createServer}from'node:http';import{readFile,realpath,lstat}from'node:fs/promises';import{resolve,join,sep}from'node:path';import{pathToFileURL}from'node:url';
export function createUpdateServer(directory){
 const root=resolve(directory);
 return createServer(async(req,res)=>{
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'content-type','X-Content-Type-Options':'nosniff'};
  try{if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers);res.end();return;}
   const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'');
   if(!/^(?:[a-z0-9-]{1,40}\.json|bundles\/[a-f0-9]{64}\.zip)$/.test(path))throw Error();
   const file=join(root,path),actual=await realpath(file),base=await realpath(root),stat=await lstat(file);
   if(!actual.startsWith(base+sep)||stat.isSymbolicLink()||!stat.isFile()||stat.size>(path.endsWith('.json')?24000:32*1024*1024))throw Error();
   const data=await readFile(file);res.writeHead(200,{...headers,'Content-Type':path.endsWith('.json')?'application/json':'application/zip','Content-Length':data.length,'Cache-Control':path.endsWith('.json')?'no-store':'public, max-age=31536000, immutable'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404,headers);res.end();}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(!process.argv[2])throw Error('Provide only the dedicated release directory.');const port=Number(process.argv[3]||8475);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port.');createUpdateServer(process.argv[2]).listen(port,'127.0.0.1',()=>console.log('Update assets on loopback port '+port+'; administrator must provide trusted HTTPS reverse proxy.'));}
