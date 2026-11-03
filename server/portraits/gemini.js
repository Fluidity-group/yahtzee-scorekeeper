import{PortraitError,portraitPrompt}from'../../src/profile/portrait-contract.js';
const MODEL='gemini-nano-banana-2.1';
export function createGeminiPortraitGenerator({key,fetchImplementation=fetch,timeoutMs=85000}){
 return async({bytes,mime,style})=>{
  if(!key)throw new PortraitError('Portrait generation is not configured on the server.',503);
  // No grounding, tools, automatic retries or arbitrary client prompts/models.
  let encoded='';for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));
  let response;try{response=await fetchImplementation('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({model:MODEL,input:[{type:'text',text:portraitPrompt(style)},{type:'image',mime_type:mime,data:btoa(encoded)}],generation_config:{max_output_tokens:8192},response_format:{type:'image',aspect_ratio:'1:1',image_size:'1K'},store:false}),signal:AbortSignal.timeout(timeoutMs)});}catch{throw new PortraitError('Generation could not finish. Check this draft before trying a new generation.',504);}
  if(!response.ok)throw new PortraitError(response.status===429?'Portrait service is busy. Try a new generation later.':'The portrait service could not create this image.',502);
  let data;try{data=await response.json();}catch{throw new PortraitError('Portrait service returned an unreadable response.',502);}
  const images=[];function scan(v){if(Array.isArray(v))v.forEach(scan);else if(v&&typeof v==='object'){if(v.type==='image'&&typeof v.data==='string')images.push(v);for(const[k,item]of Object.entries(v))if(k!=='data')scan(item);}}scan(data);
  const unique=[...new Map(images.map(v=>[v.data,v])).values()];if(unique.length!==1)throw new PortraitError('No usable portrait was returned. Your saved avatar is unchanged.',502);
  const image=unique[0];let output;try{output=Uint8Array.from(atob(image.data),c=>c.charCodeAt(0));}catch{throw new PortraitError('Portrait service returned an invalid image.',502);}
  return{bytes:output,mime:image.mime_type,usage:data.usage||{},model:MODEL};
 };
}
