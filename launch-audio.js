/* Native synthesised countdown and rocket-engine rumble, no downloaded audio assets. */
(()=>{
 'use strict';
 const KEY='komorebi_launch_sound_enabled';
 let active=true,ctx=null,sources=[];
 try{active=window.localStorage?.getItem(KEY)!=='off';}catch{}
 function enabled(){return active;}
 function setEnabled(value){
  active=Boolean(value);
  try{window.localStorage?.setItem(KEY,active?'on':'off');}catch{}
  if(!active)stop();
  return active;
 }
 function stop(){
  for(const node of sources.splice(0)){try{node.stop()}catch{}}
 }
 function play(){
  if(!active)return false;
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return false; // Other game systems remain functional.
  try{
   if(!ctx||ctx.state==='closed')ctx=new Audio();
   if(ctx.state==='suspended')ctx.resume()?.catch?.(()=>{});
   stop();
   const start=ctx.currentTime+.06,launch=start+6;
   // Moderate master volume to protect mobile listeners.
   const master=ctx.createGain();
   master.gain.setValueAtTime(.16,start);
   master.connect(ctx.destination);
   // Six short quiet countdown beeps.
   for(let i=0;i<6;i++){
    const osc=ctx.createOscillator(),gain=ctx.createGain(),at=start+i;
    osc.type='sine';osc.frequency.setValueAtTime(i===5?950:740,at);
    gain.gain.setValueAtTime(0,at);
    gain.gain.linearRampToValueAtTime(.16,at+.015);
    gain.gain.exponentialRampToValueAtTime(.001,at+.18);
    osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+.20);
    sources.push(osc);
   }
   // Bass engine, with a rising frequency and fading tail.
   const bass=ctx.createOscillator(),bassGain=ctx.createGain();
   bass.type='sawtooth';bass.frequency.setValueAtTime(40,launch);
   bass.frequency.exponentialRampToValueAtTime(68,launch+6);
   bassGain.gain.setValueAtTime(.001,launch);
   bassGain.gain.linearRampToValueAtTime(.24,launch+.60);
   bassGain.gain.setValueAtTime(.24,launch+4);
   bassGain.gain.exponentialRampToValueAtTime(.001,launch+14);
   const bassFilter=ctx.createBiquadFilter();
   bassFilter.type='lowpass';bassFilter.frequency.value=180;
   bass.connect(bassFilter);bassFilter.connect(bassGain);bassGain.connect(master);
   bass.start(launch);bass.stop(launch+14.1);sources.push(bass);
   // Looping low-passed noise sounds like the rocket's jet plume.
   const sr=ctx.sampleRate,length=Math.round(sr*.85);
   const buffer=ctx.createBuffer(1,length,sr),samples=buffer.getChannelData(0);
   let seed=731;
   for(let i=0;i<length;i++){
    seed=(seed*1664525+1013904223)>>>0;
    samples[i]=((seed/4294967295)*2-1)*.7;
   }
   const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   noise.buffer=buffer;noise.loop=true;
   filter.type='lowpass';filter.frequency.setValueAtTime(210,launch);
   filter.frequency.exponentialRampToValueAtTime(440,launch+3);
   gain.gain.setValueAtTime(.001,launch);
   gain.gain.linearRampToValueAtTime(.20,launch+.4);
   gain.gain.exponentialRampToValueAtTime(.001,launch+12.8);
   noise.connect(filter);filter.connect(gain);gain.connect(master);
   noise.start(launch);noise.stop(launch+13);sources.push(noise);
   return true;
  }catch(error){stop();return false;}
 }
 window.KomorebiLaunchAudio={play,enabled,setEnabled,stop};
})();
