// Server-only routing: client submits a validated option, never a provider ID or URL.
// Owner selected Rachel after the Victor audition; provider generation is configured separately.
const routes=Object.freeze({
 rachel:Object.freeze({voiceOption:'rachel',voiceId:'TYKLc7ViOIGE13dSZYlK'}),
 victor:Object.freeze({voiceOption:'victor',voiceId:'cPoqAvGWCPfCfyPMwe4z'}),
 ditzy:Object.freeze({voiceOption:'ditzy',voiceId:'JVVJ6VsnUPJAdfGmEBGP'}),
});
export function resolveCommentaryVoice(voiceOption='rachel'){
 if(typeof voiceOption!=='string'||!Object.hasOwn(routes,voiceOption))throw Error('Unsupported commentary voice option');
 return routes[voiceOption];
}

