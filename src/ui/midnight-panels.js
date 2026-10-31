import{playCasinoSound}from'./casino-sounds.js';
import buildInfo from'../../build-info.json';
import{renderPortraitFlow,bindPortraitFlow,saveAccountPreset}from'./portrait-panel.js';
import{renderAvatar}from'../profile/avatar-view.js';
import {renderVenueReel,bindVenueReel} from './venue-reel.js';
import {MIDNIGHT_LOCATIONS,MIDNIGHT_PRESETS,renderMidnightCity,renderMidnightPortrait,locationById} from './midnight-art.js';
import {readMidnight,saveMidnight} from './midnight-profile.js';
export const playMidnightSound=playCasinoSound;
export function renderMidnightTools({account,theme='dark'}={}){const p=readMidnight(),name=account?.status==='ready'?account.user?.name||'Your player':'Your player';const safe=String(name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return `<nav class="midnight-tools home-ribbon" aria-label="Home, player, venue and settings"><button class="home-ribbon-home" data-action="home" aria-label="Home"><span aria-hidden="true">⌂</span><small>Home</small></button><button class="ribbon-profile-button" data-action="home-profile" aria-label="${safe} · Player and stats"><span class="ribbon-player-avatar" aria-hidden="true">${renderAvatar({ownPlayer:true,preset:p.avatar,name})}</span><span class="ribbon-player-copy"><span class="ribbon-player-name" title="${safe}">${name==='Your account'?'Account':safe}</span><small>Stats</small></span></button><button data-action="midnight-locations" aria-label="Location and venue: ${locationById(p.location).name}"><span>${locationById(p.location).name}</span><small>Venue</small></button><button data-action="midnight-settings"><span>Settings</span><small>${p.muted?'Sound Off':'Sound On'}</small></button><button class="home-theme-toggle" data-action="theme" aria-label="Switch to ${theme==='dark'?'light':'dark'} mode" title="Switch to ${theme==='dark'?'light':'dark'} mode"><span aria-hidden="true">${theme==='dark'?'☀':'☾'}</span></button></nav>`;}
export function renderMidnightCover(){const p=readMidnight();return `<section class="midnight-cover" aria-label="YAHTZ"><div class="midnight-city-backdrop">${renderMidnightCity(p.location)}</div><svg class="cover-sparkles" viewBox="0 0 640 300" fill="none" aria-hidden="true"><path d="m33 43 3 9 9 3-9 3-3 9-3-9-9-3 9-3zm418 4 4 13 13 4-13 4-4 13-4-13-13-4 13-4zm101 37 3 8 8 3-8 3-3 8-3-8-8-3 8-3zm-169 41 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ffe8a6"/><path d="m143 234 3 9 9 3-9 3-3 9-3-9-9-3 9-3zm385-45 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#f4a7d2"/></svg><div class="midnight-cover-label"><p>Dan and Amber Present...</p><h1>YAHTZ</h1></div><button class="midnight-cover-person" data-action="midnight-avatar" aria-label="Choose your avatar">${renderAvatar({ownPlayer:true,preset:p.avatar})}</button><span class="midnight-location-stamp">${locationById(p.location).name}</span></section>`;}
export function renderMidnightPanel(kind){
 const p=readMidnight();
 if(kind==='locations')return renderVenueReel();
 if(kind==='avatar')return `<div class="midnight-panel-heading"><small>YOUR SEAT AT THE TABLE</small><h2>Choose your avatar</h2></div><p class="core-muted">Choose an illustrated preset or create a portrait. Signed-in choices follow your account across phones and tournaments; guest presets stay on this device.</p><div class="midnight-avatar-grid">${MIDNIGHT_PRESETS.map((id,i)=>`<button data-midnight="preset" data-value="${id}" aria-pressed="${p.avatar===id}">${renderMidnightPortrait(id)}<span>Character ${i+1}</span></button>`).join('')}</div><button class="bigbtn score core-primary" data-midnight="confirm-avatar">Use selected avatar</button><p data-midnight-status role="status"></p>${renderPortraitFlow()}<button class="all-scores" data-action="close">Back</button>`;
 return `<div class="midnight-panel-heading"><small>MIDNIGHT CASINO</small><h2>Game settings</h2></div><button class="midnight-sound-toggle" data-midnight="sound" aria-pressed="${!p.muted}">${p.muted?'Sound off · enable effects':'Sound on · mute effects'}</button><p class="core-muted">Saved on this device. No looping ambience. Sound starts only after you choose to enable it.</p><div class="midnight-settings-links"><button data-action="game-menu">All game controls</button><button data-action="midnight-avatar">Change avatar</button><button data-action="midnight-locations">Change location</button><button data-action="scorecard-display">Scorecard text size</button><button data-action="theme">Switch light / dark appearance</button></div><p class="core-muted">Reduced motion follows your device preference. Your signed-in avatar follows your account across phones.</p><p class="core-muted" data-build-info>Version ${buildInfo.version} · Build ${buildInfo.build} (${buildInfo.release})</p><button class="all-scores" data-action="close">Back</button>`;
}
export function bindMidnightPanel(dialog,kind,onChange){
 if(kind==='locations')return bindVenueReel(dialog,onChange);
 let selected=readMidnight().avatar,closed=false,saving=false;
 const cleanupPortrait=kind==='avatar'?bindPortraitFlow(dialog,()=>{}):()=>{};
 const click=async event=>{const button=event.target.closest('[data-midnight]');if(!button||button.disabled||saving)return;
 try{
  if(button.dataset.midnight==='preset'){selected=button.dataset.value;dialog.querySelectorAll('[data-midnight="preset"]').forEach(e=>e.setAttribute('aria-pressed',String(e===button)));}
  if(button.dataset.midnight==='confirm-avatar'){saving=true;button.disabled=true;await saveAccountPreset(selected);if(!closed)onChange(null);}
  if(button.dataset.midnight==='sound'){const prefs=saveMidnight({muted:!readMidnight().muted});if(!prefs.muted)playMidnightSound();onChange(kind);}
 }catch(error){if(!closed){const box=dialog.querySelector('[data-midnight-status]');if(box)box.textContent=error.message;}}
 finally{saving=false;if(!closed)button.disabled=false;}
 };
 dialog.addEventListener('click',click);return()=>{closed=true;cleanupPortrait();dialog.removeEventListener('click',click);};
}
