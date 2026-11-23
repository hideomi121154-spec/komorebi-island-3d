/* Komorebi Island's original six-aircraft sky show.
 * Lightweight geometry for the existing MeshBuilder; no external models,
 * no official squadron marks or copyrighted aircraft textures. */
(() => {
'use strict';
const TOTAL_MS=26000,FLY_MS=21500,TAIL_MS=3900;
const DEG=Math.PI/180,BLUE='#346eab',DARK_BLUE='#24558b';
const OFFSETS=[
 [0,0,0],[-3.5,0,-4.8],[3.5,0,-4.8],
 [-7.0,0,-9.2],[7.0,0,-9.2],[0,.7,-13.2]
];
const WHITE=['#f8fcfc','#e3f4f6','#d7eaf1','#c6ddeb'];
const BLUE_SMOKE=['#b8ddec','#c7e7ed','#dbf0f2','#edf7f7'];
const RAINBOW=['#ff4054','#ff9a26','#ffe34a','#36d77c','#32a5ff','#bd64f5'];
let launchedAt=null,showNumber=0,showVariant='normal';
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const ease=t=>{const v=clamp(t);return v*v*(3-2*v);};
function isDay(minutes){return Number.isFinite(minutes)&&minutes>=7*60&&minutes<18*60+30;}
function basePath(u){
 const t=clamp(u);
 if(t<.45){const q=t/.45;return {x:-85+170*q,z:-42+53*q,y:40+7*Math.sin(Math.PI*q)};}
 if(t<.83){const a=(t-.45)/.38*Math.PI*2;return {x:85+24*Math.sin(a),z:11+24*(1-Math.cos(a)),y:43+4*Math.sin(a)};}
 const q=(t-.83)/.17;return {x:85+110*q,z:11+36*q,y:43+8*q};
}
function headingAt(u){
 const t=clamp(u);
 if(t<.45)return Math.atan2(170,53);
 if(t<.83){const a=(t-.45)/.38*Math.PI*2;return Math.atan2(Math.cos(a),Math.sin(a));}
 return Math.atan2(110,36);
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
 showVariant='rainbow';
 return true;
}
function cancel(){launchedAt=null;}
function jet(b,index,p,scale=1){
 const s=scale,c=RAINBOW[index],cream='#fff5da';
 b.setTransform(p.x,p.y,p.z,p.yaw);
 // Original 1930s-inspired single-propeller floatplane; each aircraft has its own paint.
 b.box(0,0,0,.9*s,.55*s,3.65*s,c);
 b.box(0,.27*s,.15*s,.72*s,.13*s,2.5*s,cream);
 b.tri([-.36*s,.04*s,1.25*s],[.36*s,.04*s,1.25*s],[0,0,2.23*s],c);
 for(const side of[-1,1]){
  b.tri([side*.3*s,.17*s,.8*s],[side*2.55*s,.13*s,-.35*s],[side*.3*s,.17*s,-.55*s],c);
  b.tri([side*.32*s,.22*s,.6*s],[side*2.35*s,.18*s,-.32*s],[side*.32*s,.22*s,-.36*s],cream);
  b.tri([side*.2*s,.12*s,-1.2*s],[side*1.2*s,.12*s,-1.98*s],[side*.2*s,.12*s,-1.9*s],c);
  b.box(side*.86*s,-.72*s,.05*s,.33*s,.28*s,2.35*s,c);
  b.box(side*.86*s,-.54*s,.05*s,.08*s,.5*s,.08*s,'#b6c2c7');
 }
 b.tri([0,.2*s,-1.28*s],[0,1.13*s,-2.03*s],[0,.2*s,-2.1*s],c);
 b.sphere(0,.43*s,.35*s,.33*s,.25*s,.48*s,'#456d86',5,8);
 b.sphere(0,0,1.95*s,.34*s,.34*s,.42*s,'#d4dce0',6,8);
 // Pale spinning propeller disc, visible from multiple viewing angles.
 b.box(0,0,2.35*s,.1*s,1.55*s,.08*s,'#d6eaf0');
 b.box(0,0,2.36*s,1.1*s,.1*s,.08*s,'#eaf7fb');
 b.clearTransform();
}
function smoke(b,age,index,variant){
 if(age<300||age>FLY_MS+TAIL_MS)return;
 const current=Math.min(FLY_MS,age);
 const pieces=22,step=220;
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
   if(age>FLY_MS&&variant!=='rainbow')color=WHITE[Math.min(3,Math.floor(j/5))];
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
  smoke(b,p.elapsed,i,p.variant);
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
