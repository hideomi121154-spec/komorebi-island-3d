/* Resolution management for mobile Safari and desktop WebGL.
 * Auto mode increases clarity when the device can keep up, but never renders
 * more than the safe pixel budget. Only changes canvas dimensions, not save data.
 */
(() => {
'use strict';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function create(options={}){
 const mode=['auto','ultra','balanced','battery'].includes(options.mode)?options.mode:'auto';
 const budget=Number.isFinite(options.pixelBudget)?options.pixelBudget:2200000;
 let limit=mode==='ultra'?2.5:mode==='balanced'?1.6:mode==='battery'?1:2.1;
 let last=0,frames=0,sum=0,lastChange=0,interactive=false;
 function observe(now){
  if(!Number.isFinite(now))return;
  if(last>0&&mode==='auto'){
   const delta=now-last;
   // Background tab, debugger pauses and first frame must not downshift quality.
   if(delta>0&&delta<180){frames++;sum+=delta;}
   if(frames>=120&&now-lastChange>=4500){
    const avg=sum/frames;
    if(avg>28)limit=clamp(limit-.22,1.15,2.15);
    else if(avg<18.7)limit=clamp(limit+.10,1.15,2.15);
    lastChange=now;frames=0;sum=0;
   }
  }
  last=now;
 }
 function setInteractive(value){interactive=Boolean(value);}
 function ratio(width,height,deviceRatio=1){
  const w=Math.max(1,width),h=Math.max(1,height);
  const pixelCap=Math.sqrt(budget/(w*h));
  // Reduce pixel fill *while fingers are touching the 3D canvas*.
  // Restores clarity immediately on release without changing the camera or saves.
  const gestureCap=interactive?1.14:3;
  return clamp(Math.min(deviceRatio||1,limit,pixelCap,gestureCap),.75,3);
 }
 function current(){return {mode,limit,pixelBudget:budget};}
 return {observe,ratio,current,setInteractive,isInteractive:()=>interactive};
}
function modeFromSearch(search=''){
 try {
  const mode=new URLSearchParams(search).get('quality')||'auto';
  return ['auto','ultra','balanced','battery'].includes(mode)?mode:'auto';
 } catch{return 'auto';}
}
window.KomorebiRenderQuality={create,modeFromSearch};
})();