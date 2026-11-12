/* こもれび島 — 西南の埋立宇宙港。既存セーブと移動座標を維持。 */
(()=>{
'use strict';
const E=window.KomorebiExpansion;
if(!E||!E.extendedDistricts)throw Error('world-expansion-v23.js must load before spaceport3d.js');
const bounds={x:-6,z:-1,rx:31.6,rz:26.1};
const pad={x:-24,z:-13,r:4.55};
const marker={id:'spaceport',x:-24,z:-6.5,r:2.65,icon:'🚀',name:'こもれび宇宙港'};
const hangar={x:-32,z:-7.1,w:5.25,d:4.1};
const oldBounds=window.KomorebiWorldExpansion.homeBounds;
E.grass.splice(0,2,bounds.rx,bounds.rz);
E.sand.splice(0,2,bounds.rx+1.15,bounds.rz+1.15);
E.landCenter={x:bounds.x,z:bounds.z};
E.places.push(marker);
const oldWalk=E.canWalk;
E.canWalk=(x,z)=>{
 if(oldWalk(x,z))return true;
 // Do not undo the pre-existing village obstacles or house collisions.
 const ox=(x-oldBounds.x)/oldBounds.rx,oz=(z-oldBounds.z)/oldBounds.rz;
 if(ox*ox+oz*oz<=1.04)return false;
 const nx=(x-bounds.x)/(bounds.rx-.60),nz=(z-bounds.z)/(bounds.rz-.60);
 if(nx*nx+nz*nz>=1)return false;
 if(Math.hypot(x-pad.x,z-pad.z)<pad.r+0.35)return false;
 if(Math.abs(x-hangar.x)<hangar.w/2+.3&&Math.abs(z-hangar.z)<hangar.d/2+.3)return false;
 return true;
};
function road(b,ax,az,bx,bz,w,col){
 const dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz)||1,sx=-dz/L*w/2,sz=dx/L*w/2;
 b.quad([ax+sx,.084,az+sz],[bx+sx,.084,bz+sz],[bx-sx,.084,bz-sz],[ax-sx,.084,az-sz],col);
}
const oldGround=E.ground;
E.ground=b=>{
 oldGround(b);
 // Access road goes through the new land, not across the ocean.
 road(b,-21.0,-2.0,-23.0,-5.6,1.95,'#e0d3b4');
 road(b,-23.0,-5.6,-24.0,-9.1,2.55,'#bfc4c1');
 road(b,-24.0,-9.1,-24.0,-11.1,3.0,'#aeb5b2');
 // Reinforced foundation with an orange danger ring.
 b.ellipseDisc(pad.x,.100,pad.z,5.25,5.25,'#e8ddc7',40);
 b.ellipseDisc(pad.x,.117,pad.z,4.65,4.65,'#9ea8ad',40);
 b.ellipseDisc(pad.x,.133,pad.z,3.55,3.55,'#d3d8d5',40);
 b.ellipseDisc(pad.x,.146,pad.z,2.20,2.20,'#707b82',32);
 b.ellipseDisc(pad.x,.157,pad.z,1.35,1.35,'#3f5059',28);
 for(let i=0;i<20;i++){
  let a=i*Math.PI/10,r=4.2;
  b.box(pad.x+r*Math.cos(a),.151,pad.z+r*Math.sin(a),.56,.025,.18,i%2?'#f6c66e':'#e88e62');
 }
 // Observation plaza, launch control approach and a secondary helipad.
 road(b,-28.2,-6.6,-30.6,-7.1,1.45,'#d8c6a9');
 b.ellipseDisc(-31,.085,-3.9,1.95,1.95,'#cbd4d0',20);
 b.box(-31,.104,-3.9,1.9,.025,.15,'#eef8eb');
};
function facility(b){
 // Fixed tower and actual visible service arms next to the rocket.
 const tx=pad.x+3.65,tz=pad.z-1.25;
 for(const x of [tx-.53,tx+.53])for(const z of[tz-.50,tz+.50])
  b.box(x,8.25,z,.20,16.5,.20,'#cbd6d5');
 for(let y=2;y<17;y+=1.6){
  b.box(tx,y,tz,1.5,.16,1.36,'#a8b9be');
  b.box(tx,y+.53,tz+.63,1.38,.10,.10,'#e4a263');
  b.box(tx,y+.78,tz+.63,1.38,.10,.10,'#b1c4c4');
 }
 for(const y of[4.9,10.2,14.7]){
  b.box(tx-1.15,y,tz,.95,.18,.43,'#edb45f');
 }
 b.box(tx,16.65,tz,2.10,.28,1.85,'#f6edd3');
 b.box(tx,17.12,tz,.13,.74,.13,'#9ba8a9');
 b.sphere(tx,17.50,tz,.19,.18,.19,'#f27e56',5,7);
 // Hangar and control building stand apart from the rocket.
 b.box(hangar.x,2.0,hangar.z,hangar.w,3.9,hangar.d,'#e1e8e5');
 b.box(hangar.x,4.1,hangar.z,hangar.w+.4,.35,hangar.d+.4,'#7c9fa9');
 b.box(hangar.x,1.63,hangar.z+hangar.d/2+.12,3.25,2.9,.16,'#91a8ab');
 for(let i=0;i<5;i++)b.box(hangar.x-1.35+i*.68,1.63,hangar.z+hangar.d/2+.21,.08,2.9,.07,'#d8e8e4');
 b.box(-29.9,1.32,-3.15,4.1,2.55,2.3,'#eff0e4');
 b.box(-29.9,2.69,-3.15,4.35,.20,2.6,'#96b6bb');
 for(const x of[-31.1,-29.9,-28.7])b.box(x,1.53,-1.92,.72,.75,.10,'#8fbdd0');
 b.box(-29.8,.20,-1.25,1.25,.3,.9,'#d6c7aa');
 // Fence in the danger zone; entrance remains walkable to the visitor marker.
 for(let i=0;i<20;i++){
  const a=i*Math.PI/10,x=pad.x+5.1*Math.cos(a),z=pad.z+5.1*Math.sin(a);
  if(z>-8.25&&Math.abs(x-pad.x)<1.7)continue;
  b.box(x,.63,z,.11,1.16,.11,'#a3b6bb');
  b.box(x,.79,z,.25,.07,.25,'#f5c16a');
 }
 for(const [x,z] of [[-22,-6.7],[-25.0,-6.8],[-30,-10.0]]){
  b.cylinder(x,.44,z,.12,.72,6,'#e9a056');
  b.box(x,.13,z,.38,.13,.38,'#f8edd1');
 }
 // The human-sized viewing platform faces the launch area.
 b.box(-24,.20,-6.3,5.5,.28,2.4,'#e8d9b8');
 for(const x of[-26.6,-21.4])b.box(x,.70,-7.48,.13,1.00,.13,'#acc4c1');
 b.box(-24,.94,-7.48,5.4,.12,.12,'#acc4c1');
}
const oldObjects=E.objects;
E.objects=b=>{oldObjects(b);facility(b);};
let startedAt=-1;
const COUNTDOWN=6000,FLIGHT=17500,RESET=28000;
function phase(now){
 if(startedAt<0)return {active:false,countdown:0,lift:0,label:'発射準備完了'};
 const t=Math.max(0,now-startedAt);
 if(t>=RESET){startedAt=-1;return {active:false,countdown:0,lift:0,label:'発射準備完了'};}
 if(t<COUNTDOWN)return{active:true,countdown:Math.max(1,Math.ceil((COUNTDOWN-t)/1000)),lift:0,label:'発射まで '+Math.ceil((COUNTDOWN-t)/1000)+' 秒'};
 const flight=(t-COUNTDOWN)/1000;
 return{active:true,countdown:0,lift:Math.min(110,flight*flight*.72),label:flight<FLIGHT/1000?'ロケット上昇中！':'打ち上げ成功！'};
}
function startLaunch(now){
 if(phase(now).active)return false;
 startedAt=now;
 return true;
}
function rocket(b,now){
 const p=phase(now),elapsed=startedAt<0?0:now-startedAt;
 const hidden=p.active&&elapsed>COUNTDOWN+FLIGHT;
 if(hidden)return;
 const x=pad.x,y=p.lift,z=pad.z;
 // Single central fuselage, two side boosters, nosecone and four fins.
 b.cylinder(x,6.35+y,z,.92,10.65,14,'#faf8ed');
 b.cylinder(x,4.30+y,z,.96,1.05,14,'#eb775e');
 b.cylinder(x,10.8+y,z,.93,1.17,14,'#adc4d4');
 for(let i=0;i<14;i++){
  const a=i*2*Math.PI/14,n=(i+1)*2*Math.PI/14;
  b.tri([x+.89*Math.cos(a),11.7+y,z+.89*Math.sin(a)],
        [x+.89*Math.cos(n),11.7+y,z+.89*Math.sin(n)],
        [x,14.20+y,z],'#e6efef');
 }
 b.cylinder(x,14.28+y,z,.14,.22,10,'#ee8766');
 for(const dx of[-1.25,1.25]){
  b.cylinder(x+dx,4.8+y,z,.36,6.95,10,'#f3e1d0');
  b.cylinder(x+dx,7.7+y,z,.40,.78,10,'#e18f6d');
  b.sphere(x+dx,8.46+y,z,.36,.67,.36,'#f7eee3',5,8);
 }
 for(const s of[-1,1]){
  b.box(x+s*1.03,2.4+y,z,.76,2.35,.22,'#df7965');
  b.box(x,2.4+y,z+s*1.03,.22,2.35,.76,'#e8a476');
 }
 b.box(x,5.8+y,z+.94,.45,.36,.05,'#749fb5');
 if(p.active&&elapsed>=COUNTDOWN){
  const flame=2.5+1.1*Math.sin(now*.018);
  b.cylinder(x,1.1+y-flame*.50,z,.40,flame*1.7,10,'#ffba50',.06);
  b.cylinder(x,.65+y-flame*.80,z,.20,flame*1.25,10,'#fff2a0',.015);
  for(let i=0;i<5;i++){
   const a=i*6.28/5+now*.0008,rad=.4+((now*.001+i*.37)%1)*1.3;
   b.sphere(x+Math.cos(a)*rad,.25+((now*.001+i*.2)%1)*1.3,z+Math.sin(a)*rad,.27,.27,.27,'#e1d6ca',4,6);
  }
 }
}
function drawDynamic(b,now){rocket(b,now);}
window.KomorebiSpaceport={bounds,pad,marker,hangar,phase,startLaunch,drawDynamic,isActive:now=>phase(now).active,reset:()=>{startedAt=-1;}};
})();