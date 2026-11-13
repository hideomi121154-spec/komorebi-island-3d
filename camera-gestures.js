/* iOS Safari friendly 3D gesture control.
   Native TouchEvents on iOS, PointerEvents for mouse / pen / other browsers.
   Gestures use absolute baselines: no jump when a finger is added or removed. */
(()=>{
'use strict';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function create(canvas,options={}){
 const points=new Map();
 const nativeTouch=!!(window.TouchEvent||('ontouchstart' in window));
 const orbitSpeed=.010,tiltSpeed=.0085;
 let mode='',baseline=null,active=false;
 const point=e=>({x:Number(e.clientX)||0,y:Number(e.clientY)||0});
 const onGesture=next=>{if(active===next)return;active=next;options.onGesture?.(next);};
 function rebase(){
  const pts=[...points.values()];
  onGesture(pts.length>0);
  if(pts.length===0){mode='';baseline=null;return;}
  const state=options.get();
  if(pts.length===1){
   mode='orbit';baseline={x:pts[0].x,y:pts[0].y,yaw:state.yaw,pitch:state.pitch};
  }else{
   const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
   mode='pinch';baseline={
    distance:Math.max(10,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)),
    zoom:state.zoom,mid
   };
  }
 }
 function move(){
  const pts=[...points.values()];
  if(!pts.length)return;
  if(pts.length===1&&mode==='orbit'){
   const p=pts[0];
   options.set({
    yaw:baseline.yaw+(p.x-baseline.x)*orbitSpeed,
    pitch:clamp(baseline.pitch+(p.y-baseline.y)*tiltSpeed,-1.25,1.40)
   });
  }else if(pts.length>=2&&mode==='pinch'){
   const center={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
   const dist=Math.max(10,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));
   options.set({zoom:clamp(baseline.zoom*Math.pow(baseline.distance/dist,1.18),.34,3.1)});
   const dx=center.x-baseline.mid.x,dy=center.y-baseline.mid.y;
   baseline.mid=center;
   if(Math.abs(dx)+Math.abs(dy)>.00001)options.onPan?.(dx,dy);
  }
 }
 function noPageScroll(e){if(e.cancelable)e.preventDefault();}
 // On iOS, prefer native touch events and ignore parallel touch PointerEvents,
 // which Safari can cancel when a second finger comes down.
 canvas.addEventListener('touchstart',e=>{
  if(!nativeTouch||options.enabled?.()===false)return;
  noPageScroll(e);
  points.clear();
  for(const t of Array.from(e.touches).slice(0,2))points.set(t.identifier,point(t));
  rebase();
 },{passive:false});
 canvas.addEventListener('touchmove',e=>{
  if(!nativeTouch)return;
  noPageScroll(e);
  if(!points.size)return;
  for(const t of Array.from(e.touches).slice(0,2))points.set(t.identifier,point(t));
  for(const id of [...points.keys()])if(!Array.from(e.touches).some(t=>t.identifier===id))points.delete(id);
  if(points.size!== (mode==='pinch'?2:1))rebase();
  move();
 },{passive:false});
 const touchFinish=e=>{
  if(!nativeTouch)return;
  noPageScroll(e);
  points.clear();
  for(const t of Array.from(e.touches).slice(0,2))points.set(t.identifier,point(t));
  rebase();
 };
 canvas.addEventListener('touchend',touchFinish,{passive:false});
 canvas.addEventListener('touchcancel',touchFinish,{passive:false});
 canvas.addEventListener('pointerdown',e=>{
  if((nativeTouch&&e.pointerType==='touch')||options.enabled?.()===false)return;
  noPageScroll(e);
  points.set(e.pointerId,point(e));
  try{canvas.setPointerCapture(e.pointerId)}catch{}
  rebase();
 });
 canvas.addEventListener('pointermove',e=>{
  if(nativeTouch&&e.pointerType==='touch')return;
  if(!points.has(e.pointerId))return;
  noPageScroll(e);
  points.set(e.pointerId,point(e));
  move();
 });
 const release=e=>{
  if(nativeTouch&&e.pointerType==='touch')return;
  if(!points.has(e.pointerId))return;
  points.delete(e.pointerId);
  rebase();
 };
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,release);
 canvas.addEventListener('wheel',e=>{
  if(options.enabled?.()===false)return;
  noPageScroll(e);
  const delta=Number(e.deltaY)||0;
  options.set({zoom:clamp(options.get().zoom*Math.exp(delta*.0018),.34,3.1)});
 },{passive:false});
 const reset=()=>{points.clear();rebase()};
 window.addEventListener?.('blur',reset);
 window.addEventListener?.('pagehide',reset);
 return {reset,isActive:()=>active,activePointers:()=>points.size};
}
window.KomorebiCameraGestures={create};
})();
