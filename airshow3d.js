/* Komorebi Island's original six-aircraft sky show.
 * Lightweight geometry for the existing MeshBuilder; no external models,
 * no official squadron marks or copyrighted aircraft textures. */
(() => {
'use strict';
const TOTAL_MS=19000,FLY_MS=14500,TAIL_MS=3900;
const DEG=Math.PI/180,BLUE='#346eab',DARK_BLUE='#24558b';
const OFFSETS=[
 [0,0,0],[-3.5,0,-4.8],[3.5,0,-4.8],
 [-7.0,0,-9.2],[7.0,0,-9.2],[0,.7,-13.2]
];
const WHITE=['#f8fcfc','#e3f4f6','#d7eaf1','#c6ddeb'];
const BLUE_SMOKE=['#b8ddec','#c7e7ed','#dbf0f2','#edf7f7'];
const RAINBOW=['#f1a9b8','#f6d8a4','#b8d6f2','#b1e3d1','#ead0f4','#ffebc6'];
let launchedAt=null,showNumber=0,showVariant='normal';
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const ease=t=>{const v=clamp(t);return v*v*(3-2*v);};
function isDay(minutes){return Number.isFinite(minutes)&&minutes>=7*60&&minutes<18*60+30;}
function basePath(u){
 const t=clamp(u);
 return {x:-85+170*t,z:-42+53*t+4*Math.sin(t*Math.PI),y:40+7*Math.sin(Math.PI*t)+3*t};
}
function headingAt(u){
 const t=clamp(u);
 return Math.atan2(170,53+4*Math.PI*Math.cos(t*Math.PI));
}
function offsets(index,u){
 const base=OFFSETS[index];
 const fan=ease((u-.51)/.29),split=ease((u-.77)/.17);
 const side=Math.sign(base[0]);
 // Close V-formation during approach; gradually fan out, then finish level.
 return {x:base[0]*(1+fan*.82+split*.55),
  y:base[1]+side*(fan*1.9)+split*(index%2?2:-1.5),
  z:base[2]*(1-.25*fan)};
}
function position(index,u){
 const t=clamp(u),p=basePath(t),yaw=headingAt(t),o=offsets(index,t);
 return {x:p.x+Math.cos(yaw)*o.x+Math.sin(yaw)*o.z,
  z:p.z-Math.sin(yaw)*o.x+Math.cos(yaw)*o.z,
  y:p.y+o.y,yaw};
}
function phase(now){
 if(launchedAt===null)return{active:false,progress:0,elapsed:0,lead:null,look:0,variant:showVariant};
 const elapsed=Math.max(0,Number(now)-launchedAt);
 if(!Number.isFinite(elapsed)||elapsed>=TOTAL_MS){
  launchedAt=null;
  return{active:false,progress:1,elapsed:TOTAL_MS,lead:null,look:0,variant:showVariant};
 }
 const u=clamp(elapsed/FLY_MS);
 // The rear wingmen trail well behind the leader. Aim at the CENTER of all
 // six planes so the whole V formation fits on a narrow iPhone display.
 const leader=position(0,u);
 const six=Array.from({length:6},(_,i)=>position(i,u));
 const cameraTarget={
  x:six.reduce((sum,p)=>sum+p.x,0)/6,
  y:six.reduce((sum,p)=>sum+p.y,0)/6,
  z:six.reduce((sum,p)=>sum+p.z,0)/6
 };
 // Only the line of sight moves; the visitor never teleports.
 const look=ease(elapsed/2100)*(1-ease((elapsed-(FLY_MS-500))/3600));
 return {active:true,elapsed,progress:u,look,lead:leader,cameraTarget,variant:showVariant,
  aircraftVisible:elapsed<FLY_MS,smokeVisible:elapsed<FLY_MS+TAIL_MS};
}
function start(now,minutes,{preview=false,rainbow=false,previewElapsed=0}={}){
 if(!preview&&!isDay(minutes))return false;
 if(phase(now).active)return false;
 if(!Number.isFinite(now))return false;
 launchedAt=now-(preview?clamp(previewElapsed,0,FLY_MS-1000):0);showNumber++;
 showVariant=rainbow||Math.random()<.125?'rainbow':'normal';
 return true;
}
function cancel(){launchedAt=null;}
function jet(b,index,p,scale=1){
 const s=scale;
 b.setTransform(p.x,p.y,p.z,p.yaw);
 // Distinctive original white and blue stunt plane, with a streamlined nose,
 // slender fuselage, delta wings, tail and twin exhausts.
 b.box(0,0,0,.64*s,.37*s,3.85*s,'#f3f7f7');
 b.box(0,.085*s,-.08*s,.68*s,.12*s,2.65*s,BLUE);
 b.tri([-.31*s,0,1.43*s],[.31*s,0,1.43*s],[0,.02*s,2.42*s],'#eefafc');
 b.tri([-.31*s,.07*s,1.43*s],[0,.23*s,2.25*s],[.31*s,.07*s,1.43*s],'#eefafc');
 b.tri([-.29*s,.03*s,.84*s],[-2.37*s,-.065*s,-.64*s],[-.26*s,.02*s,-.35*s],'#f4fbfb');
 b.tri([.29*s,.03*s,.84*s],[2.37*s,-.065*s,-.64*s],[.26*s,.02*s,-.35*s],'#f4fbfb');
 b.tri([-.42*s,.06*s,.54*s],[-2.20*s,.03*s,-.53*s],[-.40*s,.075*s,-.12*s],BLUE);
 b.tri([.42*s,.06*s,.54*s],[2.20*s,.03*s,-.53*s],[.40*s,.075*s,-.12*s],BLUE);
 b.tri([-.23*s,.12*s,-1.22*s],[-1.18*s,.13*s,-2.01*s],[-.20*s,.11*s,-1.90*s],'#e1eff5');
 b.tri([.23*s,.12*s,-1.22*s],[1.18*s,.13*s,-2.01*s],[.20*s,.11*s,-1.90*s],'#e1eff5');
 // Thin vertical fin with a custom navy insignia stripe, not the real unit emblem.
 b.tri([0,.12*s,-1.27*s],[0,1.12*s,-1.96*s],[0,.15*s,-2.07*s],DARK_BLUE);
 b.tri([-.02*s,.28*s,-1.45*s],[-.02*s,.87*s,-1.87*s],[-.02*s,.24*s,-1.96*s],'#eaf6f8');
 b.sphere(0,.35*s,.47*s,.24*s,.22*s,.58*s,'#466d87',4,7);
 for(const side of[-1,1]){
  b.box(side*.22*s,-.18*s,-1.76*s,.21*s,.16*s,.44*s,'#b7c5d0');
  b.box(side*.22*s,-.18*s,-1.98*s,.12*s,.10*s,.035*s,'#577d98');
 }
 b.clearTransform();
}
function smoke(b,age,index,variant){
 if(age<300||age>FLY_MS+TAIL_MS)return;
 const current=Math.min(FLY_MS,age);
 const pieces=16,step=195;
 // Two aerodynamic trails per aircraft, drawn as only four quads per segment.
 for(const side of[-1,1]){
  for(let j=1;j<=pieces;j++){
   const newer=current-(j-1)*step,older=current-j*step;
   if(older<0||newer>FLY_MS+300)continue;
   const from=position(index,older/FLY_MS),to=position(index,newer/FLY_MS);
   const trail=(p)=>({
    x:p.x+Math.cos(p.yaw)*side*.20-Math.sin(p.yaw)*1.95,
    y:p.y-.17,
    z:p.z-Math.sin(p.yaw)*side*.20-Math.cos(p.yaw)*1.95
   });
   const a=trail(from),c=trail(to);
   const w0=.15+j*.045,w1=.15+(j-1)*.045;
   let color=variant==='rainbow'?
    RAINBOW[index]:side===1?WHITE[Math.min(3,Math.floor(j/5))]:BLUE_SMOKE[Math.min(3,Math.floor(j/5))];
   // Soften the far end of each ribbon into the daytime sky.
   if(age>FLY_MS)color=WHITE[Math.min(3,Math.floor(j/5))];
   b.quad([a.x-w0,a.y,a.z],[a.x+w0,a.y,a.z],
    [c.x+w1,c.y,c.z],[c.x-w1,c.y,c.z],color);
   b.quad([a.x,a.y-w0*.67,a.z],[a.x,a.y+w0*.67,a.z],
    [c.x,c.y+w1*.67,c.z],[c.x,c.y-w1*.67,c.z],color);
  }
 }
}
function draw(b,now,{reducedMotion=false}={}){
 const p=phase(now);
 if(!p.active||!p.smokeVisible)return;
 // Older trails first, aircraft on top. Reduced motion draws fewer segments.
 for(let i=0;i<6;i++){
  if(!reducedMotion||i<3)smoke(b,p.elapsed,i,p.variant);
 }
 if(p.aircraftVisible){
  const scale=1.24;
  for(let i=0;i<6;i++)jet(b,i,position(i,p.progress),scale);
 }
}
function active(now){return phase(now).active;}
window.KomorebiAirshow={TOTAL_MS,FLY_MS,TAIL_MS,COUNT:6,isDay,start,cancel,phase,active,
 position,basePath,headingAt,draw,variant:()=>showVariant,
 // Test support only; release input is never stored in the island save.
 reset:()=>{launchedAt=null;showNumber=0;showVariant='normal';}};
})();
