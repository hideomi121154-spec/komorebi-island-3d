/* こもれび島3D kart circuit — dependency-free 8-kart racing on the same island scene. */
(()=>{
'use strict';
const E=window.KomorebiExpansion;
if(!E) throw Error('kart3d.js requires expansion3d.js');
const CENTER={x:44,z:58},LAND={x:44,z:58,rx:25,rz:21},WIDTH=3.35,AI_COUNT=7,LAPS=3;
const WAYPOINTS=[[30,58],[30,52],[37,47],[49,47],[57,52],[59,58],[55,65],[47,70],[37,69],[30,64]];
const COLORS=['#f8c65a','#ec7185','#70b8dc','#9f9ad9','#84c49a','#f3a76c','#69bec3','#d6bb77'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mod=(x,n)=>((x%n)+n)%n;
function spline(i,t) {
 const n=WAYPOINTS.length,a=WAYPOINTS[mod(i-1,n)],b=WAYPOINTS[mod(i,n)],c=WAYPOINTS[mod(i+1,n)],d=WAYPOINTS[mod(i+2,n)];
 return {x:.5*((2*b[0])+(-a[0]+c[0])*t+(2*a[0]-5*b[0]+4*c[0]-d[0])*t*t+(-a[0]+3*b[0]-3*c[0]+d[0])*t*t*t),
         z:.5*((2*b[1])+(-a[1]+c[1])*t+(2*a[1]-5*b[1]+4*c[1]-d[1])*t*t+(-a[1]+3*b[1]-3*c[1]+d[1])*t*t*t)};
}
const STEPS=240,points=[];
for(let i=0;i<STEPS;i++)points.push(spline(Math.floor(i/STEPS*WAYPOINTS.length),(i/STEPS*WAYPOINTS.length)%1));
const cumulative=[0];for(let i=0;i<STEPS;i++){const a=points[i],b=points[(i+1)%STEPS];cumulative.push(cumulative[i]+Math.hypot(b.x-a.x,b.z-a.z));}
const length=cumulative[STEPS],START=3;
function at(distance){
 const d=mod(distance,length);let lo=0,hi=STEPS-1;
 while(lo<hi){const m=(lo+hi+1)>>1;if(cumulative[m]<=d)lo=m;else hi=m-1;}
 const i=lo,a=points[i],b=points[(i+1)%STEPS],t=(d-cumulative[i])/(cumulative[i+1]-cumulative[i]||1);
 const yaw=Math.atan2(b.x-a.x,b.z-a.z);
 return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,yaw};
}
function roadNearest(x,z){
 let best=Infinity,bestD=0;
 for(let i=0;i<STEPS;i++){
  const a=points[i],b=points[(i+1)%STEPS],dx=b.x-a.x,dz=b.z-a.z;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
  const px=a.x+dx*t,pz=a.z+dz*t,ds=(x-px)**2+(z-pz)**2;
  if(ds<best){best=ds;bestD=cumulative[i]+t*(cumulative[i+1]-cumulative[i]);}
 }
 return {distance:bestD,offset:Math.sqrt(best)};
}
function roadQuad(b,a,c,half,y,col){
 const dx=c.x-a.x,dz=c.z-a.z,m=Math.hypot(dx,dz)||1,nx=-dz/m*half,nz=dx/m*half;
 b.quad([a.x+nx,y,a.z+nz],[c.x+nx,y,c.z+nz],[c.x-nx,y,c.z-nz],[a.x-nx,y,a.z-nz],col);
}
const oldWalk=E.canWalk;
E.canWalk=(x,z)=>oldWalk(x,z)||((x-LAND.x)**2/(LAND.rx-.6)**2+(z-LAND.z)**2/(LAND.rz-.6)**2<1);
function drawTerrain(b){
 b.ellipseDisc(LAND.x,-.17,LAND.z,LAND.rx+1.2,LAND.rz+1.2,'#efdab2',48);
 b.ellipseDisc(LAND.x,-.041,LAND.z,LAND.rx,LAND.rz,'#9ccc91',48);
 // Ground route toward the industrial area, with an obvious visual link to the island.
 roadQuad(b,{x:36,z:43},{x:36,z:48},2.5,.045,'#c9bea4');
 for(let i=0;i<STEPS;i++){
  const a=points[i],c=points[(i+1)%STEPS];
  roadQuad(b,a,c,WIDTH+.38,.09,i%8<4?'#e7e3d0':'#e6d5ba');
  roadQuad(b,a,c,WIDTH,.105,'#59636c');
 }
 // Alternating kerbs are readable on iPhone, but use the existing lightweight mesh builder.
 for(let i=0;i<STEPS;i+=4){
  const a=points[i],c=points[(i+4)%STEPS],dx=c.x-a.x,dz=c.z-a.z,m=Math.hypot(dx,dz)||1;
  for(const side of[-1,1]){
   const nx=-dz/m*side*(WIDTH+.18),nz=dx/m*side*(WIDTH+.18);
   roadQuad(b,{x:a.x+nx,z:a.z+nz},{x:c.x+nx,z:c.z+nz},.24,.121,(i/4)%2?'#f9f8ef':'#e46e62');
  }
 }
 // Starting grid crosses the tangent, not the world's X axis.
 const st=at(START),nx=Math.cos(st.yaw),nz=-Math.sin(st.yaw);
 for(let j=0;j<8;j++){
  const side=j-3.5,c=side*.72;
  b.box(st.x+nx*c,.131,st.z+nz*c,.69,.018,.18,j%2?'#fcfaf1':'#202e36');
 }
}
function drawStatic(b){
 // Low grandstand, pits, lamp posts and arches stay away from the racing line.
 b.box(43,.42,76,17,.75,4.2,'#b7c9c6');
 b.box(43,1.25,77,17,1.1,1.75,'#d7dee1');
 b.box(43,2.18,77,17,.23,2.8,'#739bb6');
 for(let i=0;i<11;i++){const x=35+i*1.55;b.box(x,.72,75.6,1.2,.19,.55,i%2?'#ffe1a5':'#f3a49b');}
 b.box(44,1.12,80,10,2.2,2.2,'#f4e2c4');b.box(44,2.3,80,11,.3,2.6,'#9ec9b2');
 for(const x of[40.4,43,45.6,48])b.box(x,1.1,78.86,1.9,1.25,.09,'#84a9b4');
 for(const d of[START,START+length*.25,START+length*.50,START+length*.75]){
  const p=at(d),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
  for(const side of[-1,1]){const x=p.x+nx*side*(WIDTH+1.6),z=p.z+nz*side*(WIDTH+1.6);b.cylinder(x,2.25,z,.10,4.3,5,'#b2c4bb');b.sphere(x,4.51,z,.28,.28,.28,'#fff3b7',4,6);}
 }
 const gate=at(START);
 const gx=Math.cos(gate.yaw),gz=-Math.sin(gate.yaw);
 for(const side of[-1,1])b.box(gate.x+gx*side*(WIDTH+1.0),2.1,gate.z+gz*side*(WIDTH+1.0),.25,4.2,.25,'#f2d990');
 b.box(gate.x,4.30,gate.z,8.9,.58,.38,'#f3ca76');
 // Grandstand figures; fixed low-poly objects only.
 for(let i=0;i<12;i++)b.sphere(35+i*1.43,1.85,76.7,.20,.28,.19,i%3===0?'#ef9b7c':'#a2b6d4',4,5);
}
function drawKart(b,x,z,yaw,color,isPlayer=false,drift=false){
 b.setTransform(x,.11,z,yaw);
 b.box(0,.31,0,1.15,.31,1.95,color);
 b.box(0,.55,-.10,.83,.28,.92,'#fff0d2');
 b.box(0,.71,-.15,.63,.17,.45,'#8aaeca');
 b.box(0,.50,.75,1.12,.12,.27,'#fff0e4');
 for(const xx of[-.67,.67])for(const zz of[-.59,.65])b.box(xx,.22,zz,.26,.37,.37,'#2d3541');
 b.box(0,.38,-.99,.81,.10,.14,'#e7eaf0');
 b.box(0,.42,1.01,1.00,.13,.15,'#f7dc95');
 b.sphere(0,.97,-.07,.28,.26,.26,isPlayer?'#f9d68d':'#eee4d5',4,7);
 b.box(0,1.02,-.35,.38,.10,.16,isPlayer?'#b14e50':'#536779');
 if(drift){for(const xx of[-.42,.42])b.sphere(xx,.18,1.45,.29,.15,.33,'#d1d6d4',3,4);}
 b.clearTransform();
}
const controls={left:false,right:false,accelerate:false,brake:false,drift:false};
const race={active:false,finished:false,elapsed:0,countdown:0,player:null,opponents:[],lastHud:0,placement:1,finishPlace:0,autoDrive:true,offTrackTime:0,rescueFlash:0};
function spawn(offset,index){
 const distance=START-offset,p=at(distance),side=index%2===0?-.80:.80;
 return {x:p.x+Math.cos(p.yaw)*side,z:p.z-Math.sin(p.yaw)*side,yaw:p.yaw,speed:0,distance,drift:0,boost:0,place:index+1};
}
function start(){
 race.active=true;race.finished=false;race.elapsed=0;race.countdown=3.2;race.lastHud=0;race.placement=1;race.finishPlace=0;race.autoDrive=true;race.offTrackTime=0;race.rescueFlash=0;
 race.player=spawn(0,0);
 race.opponents=Array.from({length:AI_COUNT},(_,i)=>({...spawn(3.5*(i+1),i+1),targetSpeed:12.2+(i*13%5)*1.25,style:i}));
 Object.keys(controls).forEach(k=>controls[k]=false);
 const root=document.getElementById('app');root?.classList.add('kart-racing');
 const hud=document.getElementById('kartHud');if(hud)hud.hidden=false;
 const restart=document.getElementById('kartRestart');if(restart)restart.hidden=true;
 const auto=document.getElementById('kartAutoToggle');if(auto)auto.textContent='🚗 オート加速 ON';
 updateHud(true);
 return true;
}
function stop(){
 race.active=false;race.finished=false;race.player=null;race.opponents=[];
 Object.keys(controls).forEach(k=>controls[k]=false);
 document.getElementById('app')?.classList.remove('kart-racing');
 const hud=document.getElementById('kartHud');if(hud)hud.hidden=true;
}
function setInput(k,on){if(Object.prototype.hasOwnProperty.call(controls,k))controls[k]=!!on;}
function keyInput(code,on){
 const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'accelerate',KeyW:'accelerate',ArrowDown:'brake',KeyS:'brake',Space:'drift',ShiftLeft:'drift',ShiftRight:'drift'};
 if(keys[code]){setInput(keys[code],on);return true}
 return false;
}
function rescue(){
 if(!race.active||!race.player||race.finished)return false;
 const p=race.player,target=at(p.distance);
 p.x=target.x;p.z=target.z;p.yaw=target.yaw;p.speed=7;p.drift=0;p.boost=0;
 race.offTrackTime=0;race.rescueFlash=2;
 updateHud(true);return true;
}
function toggleAuto(){
 race.autoDrive=!race.autoDrive;
 const button=document.getElementById('kartAutoToggle');
 if(button)button.textContent=race.autoDrive?'🚗 オート加速 ON':'🎮 手動加速';
 return race.autoDrive;
}
function step(dt){
 if(!race.active||race.finished)return;
 dt=clamp(dt,0,.05);
 if(race.countdown>0){race.countdown=Math.max(0,race.countdown-dt);updateHud();return;}
 race.elapsed+=dt;race.rescueFlash=Math.max(0,race.rescueFlash-dt);
 const p=race.player,acc=race.autoDrive||controls.accelerate,brake=controls.brake,steer=Number(controls.right)-Number(controls.left);
 const drifting=controls.drift&&Math.abs(steer)>.2&&p.speed>5;
 const oldDrift=p.drift;
 if(drifting)p.drift=Math.min(2,p.drift+dt);
 else if(oldDrift>.65){p.boost=1.65;p.speed=Math.max(p.speed,16);p.drift=0;}
 else p.drift=0;
 if(p.boost>0)p.boost=Math.max(0,p.boost-dt);
 p.speed=clamp(p.speed+(acc?12:-6)*dt-(brake?22*dt:0),0,p.boost>0?21:13.7);
 // With our rear-follow camera, positive yaw points to screen-LEFT.
 // Thus RIGHT steering must DECREASE yaw (opposite the old version).
 p.yaw-=steer*(.95+p.speed*.093)*(drifting?1.22:1)*dt;
 p.x+=Math.sin(p.yaw)*p.speed*dt;
 p.z+=Math.cos(p.yaw)*p.speed*dt;
 const road=roadNearest(p.x,p.z);
 // Mario Kart-style smart steering: help the driver remain on asphalt.
 const ahead=at(road.distance+Math.max(3,p.speed*.48));
 const desired=Math.atan2(ahead.x-p.x,ahead.z-p.z);
 const error=mod(desired-p.yaw+Math.PI,Math.PI*2)-Math.PI;
 const assist=clamp((road.offset-WIDTH*.40)/(WIDTH*.9),0,1);
 if(!drifting&&assist>0){
  const pull=steer?assist*.50:assist*.95;
  p.yaw+=clamp(error,-dt*2.7,dt*2.7)*pull;
 }
 if(road.offset>WIDTH-.45){
  p.speed=Math.min(p.speed,road.offset>WIDTH+1.8?8.5:11.5);
 }
 // Keep the lap counter tied to real FORWARD travel near the road.
 // A jump in closest segment or being stationary can no longer add laps.
 let difference=road.distance-mod(p.distance,length);
 if(difference>length/2)difference-=length;
 if(difference< -length/2)difference+=length;
 const aligned=Math.cos(p.yaw-at(road.distance).yaw);
 const maxMove=Math.max(.03,p.speed*dt*1.4+.03);
 if(road.offset<WIDTH+1.1&&aligned>.20&&Math.abs(difference)<5&&p.speed>.30){
  p.distance+=clamp(difference,-maxMove,maxMove);
 }
 if(road.offset>WIDTH+1.8){race.offTrackTime+=dt;if(race.offTrackTime>1.10)rescue();}
 else race.offTrackTime=0;
 for(const ai of race.opponents){
  ai.distance+=ai.targetSpeed*dt;
  const path=at(ai.distance);
  const lane=((ai.style%3)-1)*.85+.16*Math.sin(ai.distance*.08+ai.style);
  ai.x=path.x+Math.cos(path.yaw)*lane;
  ai.z=path.z-Math.sin(path.yaw)*lane;
  ai.yaw=path.yaw;ai.speed=ai.targetSpeed;
  const dx=p.x-ai.x,dz=p.z-ai.z,d=Math.hypot(dx,dz);
  if(d<1.04&&d>.001){p.speed*=.96;p.x+=dx/d*.10;p.z+=dz/d*.10;}
 }
 race.placement=1+race.opponents.filter(ai=>ai.distance>p.distance).length;
 if(p.distance>=START+length*LAPS){
  race.finished=true;race.finishPlace=race.placement;
  const retry=document.getElementById('kartRestart');if(retry)retry.hidden=false;
 }
 updateHud();
}
function timeString(sec){const m=Math.floor(sec/60),s=Math.floor(sec%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function updateHud(force=false){
 if(!race.active)return;
 const now=typeof performance!=='undefined'?performance.now():Date.now();
 if(!force&&now-race.lastHud<85)return;
 race.lastHud=now;
 const p=race.player;const label=document.getElementById('kartStatus'),meta=document.getElementById('kartRaceMeta');
 const lap=Math.min(LAPS,Math.max(1,1+Math.floor((p.distance-START)/length)));
 if(label)label.textContent=race.finished?'🏁 GOAL！ '+race.finishPlace+'位 / 8台':race.countdown>0?'🏎️ '+Math.ceil(race.countdown)+'…':race.rescueFlash>0?'🔄 コースに復帰！':p.boost>0?'⚡ ターボ加速！':p.drift>.7?'💨 ドリフトチャージ！':'🏎️ こもれびカート';
 if(meta)meta.textContent='順位 '+race.placement+'/8 · '+lap+'/'+LAPS+'周 · '+Math.round(p.speed*9)+' km/h · '+timeString(race.elapsed);
 drawMiniMap();
}
function drawMiniMap(){
 const canvas=document.getElementById('kartMiniMap');
 if(!canvas||typeof canvas.getContext!=='function'||!race.player)return;
 const c=canvas.getContext('2d');if(!c)return;
 const W=canvas.width,H=canvas.height,s=Math.min(W/(LAND.rx*2+15),H/(LAND.rz*2+13));
 const xy=(x,z)=>[W/2+(x-LAND.x)*s,H/2+(z-LAND.z)*s];
 c.clearRect(0,0,W,H);
 c.lineJoin='round';c.lineCap='round';c.strokeStyle='#b9e3e3';c.lineWidth=11;
 c.beginPath();points.forEach((p,i)=>{const [x,y]=xy(p.x,p.z);if(!i)c.moveTo(x,y);else c.lineTo(x,y)});c.closePath();c.stroke();
 c.strokeStyle='#4e626f';c.lineWidth=6;c.stroke();
 for(const ai of race.opponents){const [x,y]=xy(ai.x,ai.z);c.fillStyle='#f7b69d';c.beginPath();c.arc(x,y,2.6,0,Math.PI*2);c.fill();}
 const p=race.player,[x,y]=xy(p.x,p.z);
 c.save();c.translate(x,y);c.rotate(-p.yaw);c.fillStyle='#ffe16f';c.strokeStyle='#172b37';c.lineWidth=1.7;c.beginPath();c.moveTo(0,-7);c.lineTo(-5,6);c.lineTo(5,6);c.closePath();c.fill();c.stroke();c.restore();
}
function drawDynamic(b){
 if(!race.active)return;
 for(let i=0;i<race.opponents.length;i++){const a=race.opponents[i];drawKart(b,a.x,a.z,a.yaw,COLORS[i+1]);}
 const p=race.player;drawKart(b,p.x,p.z,p.yaw,COLORS[0],true,p.drift>.7);
}
function camera(){
 if(!race.active||!race.player)return null;
 const p=race.player,si=Math.sin(p.yaw),co=Math.cos(p.yaw);
 return {eye:[p.x-si*10,5.4,p.z-co*10],center:[p.x+si*7,1.4,p.z+co*7],fov:60};
}
function bindControls(onQuit){
 const names={kartSteerLeft:'left',kartSteerRight:'right',kartBrake:'brake',kartDrift:'drift'};
 for(const [id,k] of Object.entries(names)){
  const btn=document.getElementById(id);if(!btn)continue;
  btn.addEventListener('pointerdown',e=>{if(!race.active)return;e.preventDefault();setInput(k,true);btn.classList.add('pressed');try{btn.setPointerCapture(e.pointerId)}catch{}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(event,()=>{setInput(k,false);btn.classList.remove('pressed');});
 }
 document.getElementById('kartRescue')?.addEventListener('click',rescue);
 document.getElementById('kartAutoToggle')?.addEventListener('click',toggleAuto);
 document.getElementById('kartQuit')?.addEventListener('click',onQuit);
 document.getElementById('kartRestart')?.addEventListener('click',start);
 if(typeof window!=='undefined')window.addEventListener('blur',()=>Object.keys(controls).forEach(k=>controls[k]=false));
}
const places=[{id:'kartTrack',x:36,z:46,r:3.0,icon:'🏎️',name:'こもれびサーキット'}];
window.KomorebiKart={CENTER,LAND,WIDTH,LAPS,length,places,at,roadNearest,drawTerrain,drawStatic,drawDynamic,start,stop,rescue,toggleAuto,setInput,active:()=>race.active,finished:()=>race.finished,camera,step,bindControls,keyInput,getState:()=>({active:race.active,finished:race.finished,lap:race.player?Math.min(LAPS,1+Math.floor((race.player.distance-START)/length)):0,autoDrive:race.autoDrive,offTrackTime:race.offTrackTime,place:race.placement,elapsed:race.elapsed,player:race.player&&{...race.player},opponents:race.opponents.map(a=>({...a}))})};
})();
