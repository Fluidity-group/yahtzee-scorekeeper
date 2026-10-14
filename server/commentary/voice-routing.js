// Server-only routing: client submits a validated option, never a provider ID or URL.
// Owner selected Victor/Dark by listening; no additional paid generation is enabled here.
const routes=Object.freeze({
 victor:Object.freeze({voiceOption:'victor',voiceId:'cPoqAvGWCPfCfyPMwe4z'}),
 ditzy:Object.freeze({voiceOption:'ditzy',voiceId:'JVVJ6VsnUPJAdfGmEBGP'}),
});
export function resolveCommentaryVoice(voiceOption='victor'){
 if(typeof voiceOption!=='string'||!Object.hasOwn(routes,voiceOption))throw Error('Unsupported commentary voice option');
 return routes[voiceOption];
}
