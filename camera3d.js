/* Gesture camera for Komorebi Island: swipe to orbit/look up, pinch or mouse-wheel to zoom.
 * Camera state is transient and never changes saved inventory or player progress.
 */
(() => {
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function create(){
 const state={zoom:1,orbitTilt:0,sky:false,pitch:1.28};
 function zoomTo(value){state.zoom=clamp(Number(value)||1,.48,2.6);return state.zoom;}
 function zoomBy(factor){return zoomTo(state.zoom*(Number(factor)||1));}
 function lookBy(dy){
  const move=Number(dy)||0;
  if(state.sky){state.pitch=clamp(state.pitch-move*.005,.02,1.54);}
  else {state.orbitTilt=clamp(state.orbitTilt-move*.005,-.45,1.20);
   // A long upward swipe naturally transitions into a viewpoint beneath the sky.
   if(state.orbitTilt>.96){state.sky=true;state.pitch=1.02;}}
  return snapshot();
 }
 function skyView(enabled){
  state.sky=!!enabled;
  if(enabled){state.pitch=1.32;state.orbitTilt=0;state.zoom=Math.max(1,state.zoom);}
  else {state.orbitTilt=0;state.zoom=1;}
  return snapshot();
 }
 function reset(){state.zoom=1;state.orbitTilt=0;state.sky=false;state.pitch=1.28;return snapshot();}
 function snapshot(){return {...state};}
 function calculate(eye,center,player,angle){
  if(state.sky){
   const origin=[player.x,10.8,player.z]; // Elevated spectator camera clears station canopies and nearby roofs.
   const cp=Math.cos(state.pitch);
   return {eye:origin,center:[
    origin[0]+Math.sin(angle)*cp*35,
    origin[1]+Math.sin(state.pitch)*35,
    origin[2]+Math.cos(angle)*cp*35
   ]};
  }
  const k=1/state.zoom;
  return {eye:[
   center[0]+(eye[0]-center[0])*k,
   center[1]+(eye[1]-center[1])*k,
   center[2]+(eye[2]-center[2])*k
  ],center:[center[0],center[1]+state.orbitTilt*32,center[2]]};
 }
 function fov(base){return state.sky?clamp(70/state.zoom,30,87):base;}
 return {snapshot,zoomBy,zoomTo,lookBy,skyView,reset,calculate,fov};
}
window.KomorebiCamera3D={create};
})();
