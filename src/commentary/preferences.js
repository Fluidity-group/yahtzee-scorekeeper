import {createProfile} from './profiles.js';
const storageKey='dice-clubhouse:commentary-preferences:v1';
const defaults=()=>({schemaVersion:1,profile:createProfile({enabled:false,profanityAllowed:true,humorIntensity:'dark',frequency:'balanced',voiceOption:'rachel'}),listenerMuted:false});
export function readCommentaryPreferences(storage=globalThis.localStorage){try{const raw=storage.getItem(storageKey);if(!raw)return defaults();const value=JSON.parse(raw);if(value.schemaVersion!==1||typeof value.listenerMuted!=='boolean')return defaults();return {schemaVersion:1,profile:createProfile(value.profile),listenerMuted:value.listenerMuted};}catch{return defaults();}}
export function saveCommentaryPreferences(value,storage=globalThis.localStorage){const saved={schemaVersion:1,profile:createProfile(value.profile),listenerMuted:value.listenerMuted===true};storage.setItem(storageKey,JSON.stringify(saved));return saved;}
export function persistCommentaryPatch({profile,listenerMuted}={}){const prior=readCommentaryPreferences();return saveCommentaryPreferences({profile:profile||prior.profile,listenerMuted:listenerMuted??prior.listenerMuted});}

const playersKey='dice-clubhouse:local-players:v1';
export function readLocalPlayerDefaults(){try{const saved=JSON.parse(localStorage.getItem(playersKey)||'[]');return validatePlayers(saved);}catch{return [];}}
function validatePlayers(players){if(!Array.isArray(players)||players.length>8)throw Error('At most eight saved local players.');return players.map(p=>{const displayName=String(p.displayName||'').trim(),blurb=String(p.blurb||'').trim(),gender=p.gender||'';if(displayName.length>24||blurb.length>240||!['','woman','man','nonbinary','another'].includes(gender)||/[\u0000-\u001f\u007f]/.test(displayName+blurb))throw Error('Check saved player details.');return {displayName,gender,blurb};});}
export function saveLocalPlayerDefaults(players){const next=validatePlayers(players),prior=readLocalPlayerDefaults(),merged=[...next,...prior.slice(next.length)];localStorage.setItem(playersKey,JSON.stringify(merged));return merged;}
