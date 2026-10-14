import {it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {resolveCommentaryVoice} from '../server/commentary/voice-routing.js';
import {createProfile,updateProfile} from '../src/commentary/profiles.js';
it('routes only the two selected voices and refuses IDs, URLs and arbitrary text',()=>{
 expect(resolveCommentaryVoice()).toEqual({voiceOption:'victor',voiceId:'cPoqAvGWCPfCfyPMwe4z'});expect(resolveCommentaryVoice('ditzy').voiceId).toBe('JVVJ6VsnUPJAdfGmEBGP');
 for(const value of ['cPoqAvGWCPfCfyPMwe4z','https://example.invalid','say this',{},null,'constructor','__proto__'])expect(()=>resolveCommentaryVoice(value)).toThrow('Unsupported');
 expect(Object.isFrozen(resolveCommentaryVoice())).toBe(true);
});
it('voice choice is independent of every selectable humor/cadence setting',()=>{
 const p=createProfile({profanityAllowed:false,humorIntensity:'playful',frequency:'highlights'});expect(p.voiceOption).toBe('victor');expect(updateProfile(p,{voiceOption:'ditzy'})).toMatchObject({...p,version:2,voiceOption:'ditzy'});
 expect(updateProfile(p,{humorIntensity:'dark',profanityAllowed:true,frequency:'lively'}).voiceOption).toBe('victor');expect(()=>createProfile({...p,voiceOption:'unknown'})).toThrow('settings');expect(()=>createProfile({profanityAllowed:true,humorIntensity:'dark',voiceOption:'victor'})).toThrow('settings');
});
it('client source imports neither provider routing nor selected provider identifiers',()=>{
 function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(resolve(path,entry.name)):[resolve(path,entry.name)]);}
 for(const file of files(resolve('src')).filter(f=>/\.(?:js|css|html)$/.test(f))){const text=readFileSync(file,'utf8');expect(text).not.toMatch(/server\/commentary\/voice-routing|cPoqAvGWCPfCfyPMwe4z|JVVJ6VsnUPJAdfGmEBGP/);}
});
