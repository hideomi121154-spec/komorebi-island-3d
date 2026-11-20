/* Resolution management for mobile Safari and desktop WebGL.
 * Auto mode increases clarity when the device can keep up, but never renders
 * more than the safe pixel budget. Only changes canvas dimensions, not save data.
 */
(() => {
'use strict';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function create(options={}){
 const mode=['auto','ultra','balanced','battery'].includes(options.mode)?options.mode:'auto';
 const budget=Number.isFinite(options.pixelBudget)?options.pixelBudget:4200000;
 let limit=mode==='ultra'?3.6:mode==='balanced'?1.65:mode==='battery'?1:2.15;
 let last=0,frames=0,sum=0,lastChange=0,interactive=false;
 let revision=0;
 function observe(now){
  if(!Number.isFinite(now))return;
  if(last>0&&mode==='auto'){
   const delta=now-last;
   // Background tab, debugger pauses and first frame must not downshift quality.
   if(delta>0&&delta<180){frames++;sum+=delta;}
   if(frames>=120&&now-lastChange>=4500){
    const avg=sum/frames;
    const before=limit;
    if(avg>28)limit=clamp(limit-.18,1.2,2.4);
    else if(avg<18.7)limit=clamp(limit+.12,1.2,2.4);
    if(limit!==before)revision++;
    lastChange=now;frames=0;sum=0;
   }
  }
  last=now;
 }
 function setInteractive(value){interactive=Boolean(value);}
 function ratio(width,height,deviceRatio=1){
  const w=Math.max(1,width),h=Math.max(1,height);
  const pixelCap=Math.sqrt(budget/(w*h));
  // Keep the canvas dimensions stable while dragging: resizing the WebGL
  // drawing buffer at touchstart/touchend produces visible stalls on iOS.
  // Auto already uses a moderately lower resolution budget for mobile GPUs.
  return clamp(Math.min(mode==='ultra'?Math.max(1,deviceRatio||1)*1.18:(deviceRatio||1),limit,pixelCap),.75,3.6);
 }
 function current(){return {mode,limit,pixelBudget:budget,interactive,revision};}
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