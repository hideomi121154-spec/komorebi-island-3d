/* こもれび島 3D — 自動車産業地区: 工場→ヤード→自動車運搬船 */
(()=>{
'use strict';
const E=window.KomorebiExpansion,S=window.KomorebiSeaLine;
if(!E||!S||!E.extendedDistricts)throw Error('industry3d.js requires expanded islands');
const land={x:30,z:31,rx:25,rz:15};
const factory={x:21,z:27,w:15,d:11};
const dock={x:48,z:29.5};
const ship={x:69,z:29.5,length:32,beam:11};
const places=[
 {id:'industrialFactory',x:29.4,z:20.5,r:3.4,icon:'🏭',name:'こもれび自動車工場'},
 {id:'industrialPort',x:45.4,z:23.2,r:3.7,icon:'🚢',name:'完成車輸出港'}
];
const route=[
 {x:28.7,y:.31,z:26.0},{x:34,y:.31,z:26},
 {x:40,y:.31,z:26.6},{x:45.5,y:.31,z:29.5},
 {x:49.5,y:.31,z:29.5},{x:54.8,y:1.20,z:29.5},
 {x:60.5,y:1.20,z:29.5},{x:63,y:1.20,z:29.5}
];
const colors=['#f3f1e8','#d9e2e7','#485c68','#dc7967','#6d9cca','#efdfbd','#94b7aa','#ece6d9'];
const PERIOD=56000,STEP=5900;
const oldWalk=E.canWalk;
const inside=(x,z,b,pad=0)=>Math.abs(x-b.x)<b.w/2+pad&&Math.abs(z-b.z)<b.d/2+pad;
E.canWalk=(x,z)=>{
 // Keep the factory, construction and large ship solid (including overlaps).
 const blocked=[
  {x:factory.x,z:factory.z,w:factory.w,d:factory.d},
  {x:20,z:39,w:11,d:6.3},
  {x:69,z:29.5,w:32,d:11}
 ].some(rect=>inside(x,z,rect,.45));
 if(blocked)return false;
 if(oldWalk(x,z))return true;
 const nx=(x-land.x)/(land.rx-.50),nz=(z-land.z)/(land.rz-.50);
 return nx*nx+nz*nz<1;
};
function strip(b,x1,z1,x2,z2,width,color,y=.10){
 const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz)||1;
 const sx=-dz/len*width/2,sz=dx/len*width/2;
 b.quad([x1+sx,y,z1+sz],[x2+sx,y,z2+sz],[x2-sx,y,z2-sz],[x1-sx,y,z1-sz],color);
}
const prevTerrain=S.drawTerrain;
S.drawTerrain=b=>{
 prevTerrain(b);
 // Connected land reclamation: the west rim overlaps the existing east coast.
 b.ellipseDisc(land.x,-.17,land.z,land.rx+1,land.rz+1,'#e7d2a8',48);
 b.ellipseDisc(land.x,-.042,land.z,land.rx,land.rz,'#99cf93',48);
 // Paved yard and reinforced jetty.
 b.box(37,.055,30,19,.16,14,'#a9afb0');
 b.box(dock.x,.045,dock.z,12,.26,16,'#b6bcb5');
 b.box(17,.035,39,14,.12,9,'#d5c6aa');
};
const prevGround=E.ground;
E.ground=b=>{
 prevGround(b);
 strip(b,8.8,19.3,29.2,20.5,2.2,'#e5d4b4');
 strip(b,29.2,20.5,29.2,25.6,2.4,'#c5c6bd');
 strip(b,28,26,40,26.6,3.1,'#7f969e');
 strip(b,40,26.6,45.5,29.5,3.1,'#7f969e');
 strip(b,45.5,29.5,50,29.5,3.2,'#7f969e');
 for(let i=0;i<8;i++)b.box(31+i*1.95,.163,26.2+i*.04,.65,.015,.075,'#e8d9ab');
 // Vehicle waiting lanes, spaces and a marked route up the quay.
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){
  const x=31.3+j*2.55,z=32.5+i*1.8;
  b.box(x,.153,z+0.67,2.0,.015,.06,'#eef0e5');
  b.box(x-1.03,.155,z, .055,.015,1.3,'#eef0e5');
 }
 for(let i=0;i<8;i++)b.box(43.5+i*1.55,.185,22,.50,.015,.12,i%2?'#f7b45f':'#f8e7ac');
 for(let i=0;i<7;i++){
  b.box(43.0+i*1.8,.28,21.45,.18,.70,.18,'#a0b6b9');
  b.box(43.0+i*1.8,.67,21.45,.22,.07,.22,'#f7d884');
 }
};
function windowBand(b,x,y,z,w,step,count){
 for(let i=0;i<count;i++)b.box(x-w/2+step/2+i*step,y,z,step*.72,.72,.11,'#92bed0');
}
function drawFactory(b){
 const {x,z,w,d}=factory;
 b.box(x,3.15,z,w,6.25,d,'#e4e9e4');
 b.box(x,6.42,z,w+.5,.30,d+.5,'#859eaf');
 b.box(x,4.6,z-d/2-.09,w,.35,.12,'#d6e9e9');
 windowBand(b,x,4.75,z+d/2+.08,12,1.6,7);
 // Opening facing the highway: dark bay with three glass garage doors.
 b.box(x+w/2+.10,1.60,z-1.2,.20,3.1,4.6,'#354b53');
 for(let i=0;i<3;i++){
  b.box(x+w/2+.23,1.6,z-2.65+i*1.45,.10,2.70,1.22,'#78949a');
  b.box(x+w/2+.29,2.25,z-2.65+i*1.45,.11,.46,1.06,'#b4d6dc');
 }
 for(let i=0;i<5;i++)b.box(x-w/2+1.3+i*2.5,3.7,z+d/2+.08,1.35,1.05,.12,'#97c9d3');
 for(let i=0;i<7;i++)b.box(x-w/2+1.1+i*2.0,6.65,z-.8,.9,.33,1.7,'#aab9c0');
 b.box(x,5.95,z+d/2+.27,4.1,.46,.08,'#6a9cc0');
 for(let i=0;i<4;i++)b.box(x+7.8,.9+i*.57,z-3,.24,.11,4.7,'#dae3d9');
 // Warehouse/loading annex, concrete dock and loading conveyors.
 b.box(x-5.1,1.35,z-7,6.3,2.65,3.6,'#d6e0dc');
 b.box(x-5.1,2.76,z-7,6.6,.21,4.0,'#93abb4');
 for(let i=0;i<4;i++)b.box(x-7.4+i*1.5,.90,z-5.1,1.22,1.40,.09,'#9ab6b6');
 b.box(29.2,.16,25.6,4.2,.19,4.4,'#ddd2b9');
}
function drawConstruction(b){
 const x=20,z=39;
 // Visible unfinished steel grid behind the completed car plant.
 b.box(x,.06,z,12.6,.15,8.2,'#e0cdb2');
 for(let i=0;i<=6;i++)for(let side of[-1,1]){
  const px=x-5.4+i*1.8,pz=z+side*3.15;
  b.box(px,3.8,pz,.21,7.6,.21,'#b58272');
 }
 for(let h of[2.25,4.65,7.3]){
  b.box(x,h,z-3.15,11.3,.22,.24,'#aa8078');
  b.box(x,h,z+3.15,11.3,.22,.24,'#aa8078');
  for(let j=0;j<7;j++)b.box(x-5.4+j*1.8,h,z,.13,.16,6.3,'#aab8bb');
 }
 for(let i=0;i<3;i++)b.box(x-5.8+i*3.6,.42,z+4.5,2.6,.62,1.0,'#c4ab83');
 // Large crane mast and suspended girder.
 b.box(27.2,6.7,40.8,.46,13.4,.48,'#e5b35d');
 for(let i=0;i<7;i++)b.box(27.2,i*1.8+.65,40.8,.66,.14,.62,'#f4d37a');
 b.box(22.6,13.3,40.8,12.4,.26,.32,'#e8b55a');
 b.box(19.5,11.4,40.8,.09,3.9,.08,'#b8babb');
 b.box(19.5,9.65,40.8,3.2,.26,.30,'#9ca8a8');
 // Small site workers with colored safety helmets.
 for(const [wx,wz] of [[14.4,38],[16.1,42.5],[25.7,43.0]]){
  b.box(wx,.85,wz,.55,1.07,.42,'#77a9ae');
  b.sphere(wx,1.52,wz,.30,.30,.27,'#e5c4a0',4,6);
  b.box(wx,1.82,wz,.72,.16,.63,'#f2c66d');
 }
}
function drawYard(b){
 // Parked finished cars as in the reference image.
 for(let i=0;i<7;i++){
  const x=31.0+(i%4)*2.35,z=34+Math.floor(i/4)*2.35;
  vehicle(b,x,.20,z,0,colors[(i+2)%colors.length],.72);
 }
 for(let i=0;i<5;i++){
  const x=30.1+i*3.6;
  b.box(x,2.1,20.85,.14,4.15,.14,'#b4bdb6');
  b.box(x,4.21,20.85,.70,.22,.55,'#f6e4ba');
 }
 // Port office and two modest container stacks.
 b.box(43.9,1.70,36.5,5.0,3.35,3.3,'#edf1e9');
 b.box(43.9,3.48,36.5,5.35,.23,3.65,'#7fa9bc');
 for(let i=0;i<3;i++)b.box(42.6+i*1.25,1.95,34.8,.75,.78,.11,'#9bc7d8');
 for(const [cx,cz,col] of [[41.5,39.9,'#b56f5e'],[44.6,40,'#7199b2'],[47.9,40,'#d8aa73']]){
  b.box(cx,.83,cz,2.8,1.60,1.90,col);
  for(let i=0;i<5;i++)b.box(cx-1.2+i*.6,.82,cz+.98,.045,1.42,.06,'#e6cfb8');
 }
 // Pier bollards, dock floodlights and yellow safety rails.
 for(let i=0;i<5;i++){
  const z=23.5+i*3.1;
  b.cylinder(50.9,.34,z,.30,.57,8,'#ddad55');
  b.box(50.9,.65,z,.72,.15,.72,'#eddb9c');
 }
 for(const [x,z] of [[43,23],[49.3,23],[48.5,38]]){
  b.box(x,2.5,z,.18,4.9,.18,'#b8bfbc');
  b.box(x,5.01,z,.85,.23,.44,'#fff1c6');
 }
}
function vehicle(b,x,y,z,yaw,col,scale=1){
 b.setTransform(x,y,z,yaw);
 const p=(v)=>v*scale;
 b.box(0,p(.26),0,p(1.24),p(.34),p(2.22),col);
 b.box(0,p(.61),p(-.15),p(1.05),p(.39),p(1.23),col);
 for(const zz of[-.71,.75])for(const xx of[-.62,.62])
  b.box(p(xx),p(.13),p(zz),p(.23),p(.25),p(.48),'#3c4851');
 b.box(0,p(.60),p(.52),p(.93),p(.26),p(.035),'#b7d8e0');
 b.box(0,p(.60),p(-.77),p(.92),p(.24),p(.035),'#a7c8d6');
 b.box(p(.55),p(.55),p(-.18),p(.04),p(.25),p(.80),'#bedce4');
 b.box(p(-.55),p(.55),p(-.18),p(.04),p(.25),p(.80),'#bedce4');
 for(const xx of[-.43,.43]){
  b.box(p(xx),p(.25),p(1.12),p(.18),p(.11),p(.04),'#f7e0b1');
  b.box(p(xx),p(.26),p(-1.12),p(.18),p(.11),p(.04),'#d7786a');
 }
 b.clearTransform();
}
function drawShip(b){
 const x=ship.x,z=ship.z;
 // Large deep-water Ro-Ro car carrier, stern opening faces the land.
 b.box(x,1.13,z,ship.length,3.42,ship.beam,'#4d84a4');
 b.box(x,.04,z,ship.length,1.15,ship.beam+.35,'#a85e60');
 b.box(x,5.58,z,ship.length-1,6.2,ship.beam-.35,'#e4e9e6');
 b.box(x,8.75,z,ship.length-1,.27,ship.beam,'#b9c7ca');
 b.box(x,7.8,z-5.39,ship.length-1,.45,.14,'#77a1b4');
 for(let i=0;i<14;i++){
  const px=x-13.2+i*1.98;
  b.box(px,7.10,z+5.24,.63,.72,.10,'#86b4c9');
  b.box(px,6.06,z-5.25,.63,.65,.10,'#86b4c9');
  b.box(px,8.93,z,1.15,.45,1.25,'#f3f4eb');
 }
 // Bridge, funnel, mast, railings and mooring gear.
 b.box(x+10,10.25,z,5.1,2.8,8.2,'#f0f3ee');
 for(let i=0;i<5;i++)b.box(x+8.1+i*.93,10.55,z+4.16,.73,.57,.10,'#85bed3');
 b.box(x-5.8,10.30,z-2.6,2.3,2.9,2.1,'#598cae');
 b.box(x-5.8,11.6,z-2.6,2.45,.45,2.2,'#f5f1df');
 b.box(x+12,12.1,z,.12,2.2,.12,'#d3d9cf');
 b.sphere(x+12,13.2,z,.19,.17,.20,'#ece4d3',4,6);
 // Car-themed logo silhouette on the visible broadside.
 b.box(x+1.5,5.0,z+5.41,5.4,.38,.07,'#7e9caf');
 b.box(x+1.5,5.3,z+5.41,2.6,.65,.07,'#7e9caf');
 // Stern loading hatch and illuminated ramp entrance.
 b.box(53.05,2.25,z,.24,3.35,4.20,'#344f60');
 b.box(53.0,4.05,z,1.0,.33,4.78,'#cbd4d0');
 for(const side of[-1,1])b.box(52.96,2.1,z+side*2.25,.25,3.9,.35,'#eff0e8');
 b.box(54.8,1.05,z,3.6,.25,3.25,'#c5b6a5');
 // 3D sloping loading ramp: starts at pier and meets the cargo deck.
 b.quad([49.1,.20,z-1.75],[56.2,1.40,z-1.75],
        [56.2,1.40,z+1.75],[49.1,.20,z+1.75],'#e4d5b0');
 for(const zz of[z-1.73,z+1.73])strip(b,49.1,zz,56.3,zz,.11,'#f4c765',.48);
 for(let i=0;i<5;i++)b.box(49.7+i*1.45,.32+i*.19,z-1.45,.65,.045,.08,'#f5e4a2');
}
const oldObjects=E.objects;
E.objects=b=>{oldObjects(b);drawFactory(b);drawConstruction(b);drawYard(b);drawShip(b);};
function interpolateRoute(progress){
 const t=Math.max(0,Math.min(.99999,progress))*(route.length-1),i=Math.floor(t);
 const a=route[i],end=route[Math.min(route.length-1,i+1)],fraction=t-i;
 const lerp=(a,b)=>a+(b-a)*fraction;
 return {x:lerp(a.x,end.x),y:lerp(a.y,end.y),z:lerp(a.z,end.z),
  yaw:Math.atan2(end.x-a.x,end.z-a.z)};
}
function metrics(now){
 const t=Math.max(0,Number(now)||0);
 return {inTransit:9,loaded:Math.floor(t/STEP),cycleMs:PERIOD};
}
function drawDynamic(b,now){
 // Nine cars are produced on staggered loops, and disappear inside the ship.
 const t=((Number(now)||0)%PERIOD+PERIOD)%PERIOD;
 for(let i=0;i<9;i++){
  const phase=((t+i*STEP)%PERIOD)/PERIOD;
  if(phase>.96)continue;
  const p=interpolateRoute(phase/.96);
  vehicle(b,p.x,p.y,p.z,p.yaw,colors[i%colors.length],.79);
 }
 // Tiny animated dock-worker signaling to the incoming convoy.
 const a=Math.sin(now*.003)*.30;
 b.box(48.1,.76,25.3,.47,.98,.44,'#e5ac69');
 b.sphere(48.1,1.44,25.3,.26,.26,.25,'#e9cda7',4,6);
 b.box(48.1,1.72,25.3,.6,.13,.55,'#f4d077');
 b.box(48.54,1.14+a,25.3,.15,.85,.16,'#ebd5b5');
}
window.KomorebiIndustry={land,factory,dock,ship,places,route,drawDynamic,drawShip,interpolateRoute,metrics};
})();