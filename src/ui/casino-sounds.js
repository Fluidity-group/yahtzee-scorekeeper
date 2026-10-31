import{readMidnight}from'./midnight-profile.js';
let context=null;
export function playCasinoSound(kind='tap'){
 if(readMidnight().muted)return false;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return false;
 try{if(!context||context.state==='closed')context=new Audio();void context.resume()?.catch(()=>{});const notes=kind==='tap'?[220]:kind==='scratch'?[190,145,95]:[330,440,550,660];
  notes.forEach((frequency,i)=>{const oscillator=context.createOscillator(),gain=context.createGain(),t=context.currentTime+i*.12;oscillator.type='triangle';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(kind==='tap'?.02:.035,t+.01);gain.gain.exponentialRampToValueAtTime(.0001,t+.13);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(t);oscillator.stop(t+.14);});return true;
 }catch{return false;}
}
