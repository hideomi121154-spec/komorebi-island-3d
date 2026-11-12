/* こもれび島 v1.1 — island-side redevelopment, original animated low-poly construction. */
(() => {
'use strict';
const site={x:14.05,z:-5.75,width:6.15,depth:4.95};
const marker={id:'redevelopment',x:10.5,z:-2.45,r:2.1,icon:'🏗️',name:'島の再開発現場'};
const clamp=n=>Math.max(0,Math.min(100,Math.round(Number.isFinite(+n)?+n:32)));
function completedFloors(progress){return progress>=100?9:Math.max(1,Math.min(8,Math.ceil(clamp(progress)/12)+1));}
function within(x,z){return Math.abs(x-site.x)<site.width/2+.18&&Math.abs(z-site.z)<site.depth/2+.15;}
function clearTrees(trees){
 // Move only the trees physically located inside the redevelopment fence.
 // Keep array order stable, so historical save indexes remain valid.
 const spots=[[18.2,1.75],[16.7,2.55],[8.7,-12.8],[16.1,3.4]];
 let next=0;
 for(const t of trees)if(Math.abs(t.x-site.x)<site.width/2+.9&&Math.abs(t.z-site.z)<site.depth/2+.9){
  const p=spots[next++%spots.length];t.x=p[0];t.z=p[1];
 }
}
function paintedRoad(b){
 // New access road connects the established village to the side construction district.
 b.box(9.4,.025,-3.42,5.25,.095,.85,'#b6bab2');
 b.box(12.4,.025,-3.36,1.3,.095,1.2,'#b6bab2');
 for(let i=0;i<5;i++)b.box(7.7+i*.95,.082,-3.42,.42,.012,.08,'#f5eccf');
}
function boxBeam(b,ax,ay,az,bx,by,bz,w,col){
 // A diagonal beam with two crossed flat faces keeps WebGL1 and software renderer compatible.
 const vx=bx-ax,vy=by-ay,vz=bz-az;
 const p=[-vz,0,vx],length=Math.hypot(...p)||1;
 const nx=p[0]/length*w/2,nz=p[2]/length*w/2;
 b.quad([ax-nx,ay,az-nz],[bx-nx,by,bz-nz],[bx+nx,by,bz+nz],[ax+nx,ay,az+nz],col);
 b.quad([ax,ay-w/2,az],[bx,by-w/2,bz],[bx,by+w/2,bz],[ax,ay+w/2,az],col);
}
function fence(b,done){
 const metal=done?'#e0e9d9':'#d9e3e5',post=done?'#89aa92':'#a7b4b8';
 const x0=site.x-site.width/2,x1=site.x+site.width/2;
 const z0=site.z-site.depth/2,z1=site.z+site.depth/2;
 // Open entrance at front-left: there is no pass-through while the site is active.
 for(let x=x0;x<=x1+.01;x+=.85){
  for(const z of[z0,z1]){
   b.box(x,.7,z,.095,1.36,.10,post);
   if(x<x1-.5)b.box(x+.42,.61,z,.74,1.04,.07,metal);
  }
 }
 for(let z=z0;z<=z1+.01;z+=.83){
  for(const x of[x0,x1]){
   b.box(x,.7,z,.1,1.36,.095,post);
   if(z<z1-.6)b.box(x,.61,z+.39,.07,1.04,.7,metal);
  }
 }
 // Safety panels and warning stripe at the gate.
 b.box(x0+.83,.95,z1+.08,1.6,.65,.10,'#f5fff0');
 b.box(x0+.83,.66,z1+.15,1.25,.1,.05,'#77ae7c');
 b.box(x0+.83,.44,z1+.15,1.25,.09,.05,'#7f9a9a');
 for(let i=0;i<5;i++){const x=x0+.35+i*.75,z=z1+.62;
  b.cylinder(x,.28,z,.14,.46,6,'#ef9050',.04);
  b.box(x,.09,z,.35,.09,.35,'#eee8d0');
 }
}
function floorFrame(b,x,z,level,finished,top){
 const y=level*1.28,concrete='#e3e2d8',frame='#b8bdbb';
 b.box(x,y,z,3.25,.20,3.12,concrete);
 for(const dx of[-1.44,1.44])for(const dz of[-1.35,1.35])
  b.box(x+dx,y+.60,z+dz,.19,1.10,.19,frame);
 if(finished){
  // Recessed panels and light-blue balcony windows.
  for(const dx of[-1.03,0,1.03]){
   b.box(x+dx,y+.58,z+1.58,.80,.85,.08,'#f7f2e6');
   b.box(x+dx,y+.61,z+1.64,.62,.66,.09,'#92cbd0');
   b.box(x+dx,y+.37,z+1.74,.86,.08,.11,'#d9e6e3');
   b.box(x+dx,y+.24,z+1.79,.86,.23,.05,'#a5c5c6');
  }
  for(const dz of[-.85,.32,1.05]){
   b.box(x+1.66,y+.60,z+dz,.06,.68,.65,'#96c6d1');
  }
 }else{
  // Scaffolding with bright safety-orange rails on exposed top floors.
  for(const zz of[z-1.76,z+1.76]){
   b.box(x,y+.38,zz,3.75,.06,.065,'#f0a168');
   b.box(x,y+1.02,zz,3.75,.06,.065,'#f0a168');
  }
  for(const xx of[x-1.76,x+1.76]){
   b.box(xx,y+.55,z,.065,.07,3.75,'#ed965b');
   for(const zz of[z-1.73,z+1.73])b.box(xx,y+.55,zz,.07,1.0,.07,'#8b9697');
  }
  if(top)for(const dx of[-1.44,1.44])for(const dz of[-1.35,1.35]){
   b.box(x+dx,y+1.25,z+dz,.07,.60,.07,'#967e71');
  }
 }
}
function building(b,progress){
 const p=clamp(progress),n=completedFloors(p),cx=13.9,cz=-5.9;
 b.box(cx,.13,cz,4.05,.30,3.9,'#c2c5c2');
 for(let i=0;i<n;i++)floorFrame(b,cx,cz,i+1,true,false);
 if(p<100){
  floorFrame(b,cx,cz,n+1,false,true);
  // Outer vertical scaffolding and tied walkways beside the tower.
  for(const xx of[cx-2.04,cx+2.04])for(const zz of[cz-1.92,cz+1.92]){
   b.box(xx,(n+2)*.68,zz,.10,(n+2)*1.36,.10,'#91a0a1');
  }
  for(let i=1;i<=n+1;i++){
   const y=i*1.28;
   b.box(cx,y,cz+1.92,4.25,.055,.14,'#dd925d');
   b.box(cx,y+.55,cz+1.92,4.25,.055,.06,'#e8a268');
   b.box(cx-2.04,y,cz,.10,.08,3.95,'#9ba8a9');
  }
  // Blue debris net over the right facade.
  b.box(cx+2.11,(n+1)*.66,cz,.035,(n+1)*1.32,3.95,'#6da8bd');
 }else{
  b.box(cx,9*1.28+1.22,cz,3.72,.21,3.58,'#e6e5dd');
  b.box(cx,9*1.28+1.42,cz,2.85,.14,2.85,'#9bc5a0');
  for(const dx of[-1.2,1.2])b.box(cx+dx,9*1.28+1.5,cz,.16,.22,2.5,'#eff8ed');
 }
}
function craneStatic(b){
 // The mast never rotates, while the complete jib, trolley and cargo move in drawDynamic.
 const x=16.15,z=-7.05,towerHeight=12.8,crane='#efae30';
 b.box(x,towerHeight/2,z,.43,towerHeight,.43,crane);
 for(let y=.6;y<towerHeight;y+=1.1){
  b.box(x,y,z,.86,.10,.78,'#f6c15a');
  boxBeam(b,x-.28,y-.5,z+.35,x+.28,y+.5,z+.35,.045,'#d38e30');
  boxBeam(b,x+.28,y-.5,z-.35,x-.28,y+.5,z-.35,.045,'#cf8733');
 }
 b.box(x,towerHeight+.15,z,1.08,.32,1.08,'#e5a532');
}
function supplies(b){
 // Organized materials, a safety hut and compact excavator inside the side lot.
 b.box(11.85,.33,-7.6,1.25,.62,1.25,'#f0ead7');
 b.box(11.85,.75,-7.6,1.34,.12,1.34,'#9cae9a');
 for(let i=0;i<4;i++){
  b.box(11.22+i*.26,.26,-4.15,.20,.36,.86,'#d6b593');
 }
 for(let i=0;i<4;i++)b.cylinder(11.75+i*.24,.19,-4.85,.13,1.1,6,'#b5c1c5');
 b.box(16.1,.54,-4.55,1.37,.68,1.15,'#edb03b');
 b.box(16.1,.25,-4.55,1.62,.32,1.32,'#6f756a');
 for(const dx of[-.62,.62])for(const dz of[-.48,.48])
  b.sphere(16.1+dx,.17,-4.55+dz,.21,.19,.21,'#525958',5,6);
 b.box(16.25,.99,-4.55,.65,.43,.78,'#e6bf69');
}
function finishedApartments(b){
 // Low-rise residential buildings set behind the construction site for depth,
 // making redevelopment look like a district, not a lone tower.
 const x=7.95,z=-12.45;
 b.box(x,2.38,z,2.7,4.68,2.15,'#e6e5dc');
 for(let floor=0;floor<4;floor++){
  const y=.86+floor*1.05;
  for(const offset of[-.78,0,.78]){
   b.box(x+offset,y,z+1.11,.62,.72,.075,'#fff5df');
   b.box(x+offset,y,z+1.17,.50,.59,.055,'#91ccda');
   b.box(x+offset,y-.30,z+1.30,.72,.11,.42,'#e2e8e5');
   b.box(x+offset,y-.13,z+1.52,.72,.12,.06,'#b8ddd3');
  }
  b.box(x+1.39,y,z,.055,.65,1.42,'#9ac2cd');
 }
 b.box(x,4.76,z,2.92,.20,2.35,'#f4f2e8');
 for(const xx of[x-1.05,x+1.05]){
  b.box(xx,4.95,z,.25,.30,1.84,'#93bca5');
  for(const zz of[z-.7,z+.7])b.sphere(xx,5.10,zz,.26,.23,.28,'#7db47b',4,6);
 }
 // A second small apartment wing reads as a real neighborhood at distance.
 const sx=3.2,sz=-12.75;
 b.box(sx,1.78,sz,2.32,3.53,1.95,'#f4e7cc');
 for(let i=0;i<3;i++){
  const y=.70+i*1.06;
  for(const xx of[sx-.62,sx+.62]){
   b.box(xx,y,sz+1.02,.67,.65,.08,'#fff9eb');
   b.box(xx,y,sz+1.09,.51,.52,.07,'#a2cdd0');
  }
  b.box(sx,y-.42,sz+1.17,2.33,.08,.26,'#dcc0a0');
 }
 b.box(sx,3.62,sz,2.57,.22,2.19,'#e1d1af');
}
function scenicDetails(b){
 // Soft white 2D billboards avoid the dark, stone-like shading of a 3D sphere.
 // They are still world-space geometry, so camera movement retains parallax.
 const puff=(x,y,z,rx,ry)=>{
  const white=[1.34,1.34,1.30],segments=12;
  for(let i=0;i<segments;i++){
   const a=i*Math.PI*2/segments,n=(i+1)*Math.PI*2/segments;
   b.tri([x,y,z],[x+rx*Math.cos(a),y+ry*Math.sin(a),z],
      [x+rx*Math.cos(n),y+ry*Math.sin(n),z],white);
  }
 };
 for(const [x,y,z,s] of [[-12,12,-29,1.1],[3,13,-28,1.2],[20,14,-28,1.04]]){
  puff(x,y,z,1.75*s,.36*s);
  puff(x-.89*s,y+.35*s,z,.96*s,.72*s);
  puff(x+.69*s,y+.26*s,z,1.12*s,.65*s);
 }
 // Delicate sea foam around the shoreline, without covering the beach.
 for(let i=0;i<44;i++){
  const angle=i*Math.PI*2/44;
  const radius=1.11+.018*Math.sin(i*2.41);
  const x=21.2*radius*Math.cos(angle),z=17.25*radius*Math.sin(angle);
  b.ellipseDisc(x,-.554,z,.44,.075,i%3?'#acd9da':'#daf2e5',7);
 }
}
function drawStatic(b,progress){
 paintedRoad(b);
 finishedApartments(b);
 scenicDetails(b);
 b.box(site.x,.04,site.z,site.width,.16,site.depth,'#c2bfb5');
 b.box(site.x,.125,site.z,site.width-.24,.12,site.depth-.24,'#d2c9b4');
 building(b,progress);
 if(progress<100){craneStatic(b);supplies(b);}
 fence(b,progress>=100);
}
// All construction motion is derived from elapsed time and saved progress:
// no new save keys, no timers and no frame-dependent state.
function constructionPose(now,progress){
 const t=Math.max(0,Number(now)||0)*.001,p=clamp(progress);
 const scaffoldLevel=(completedFloors(p)+1)*1.28+.14;
 const maxHook=Math.min(11.18,Math.max(7.90,scaffoldLevel+1.62));
 return {
  boomAngle:.29*Math.sin(t*.48),
  trolleyX:-2.68+.98*Math.sin(t*.36+1.15),
  hookY:maxHook+.32*Math.sin(t*.92+.6),
  carrierX:11.32+1.24*(.5+.5*Math.sin(t*.84)),
  carrierStep:Math.sin(t*5.2)*.095,
  scaffoldLevel,
  hammerPhase:Math.sin(t*5.6),
  signalPhase:Math.sin(t*1.6)
 };
}
function rotatedBox(b,at,x,y,z,w,h,d,color){
 // A proper oriented mesh: the crane jib turns in world space, not just a flat sprite.
 const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
 const a=at(x0,y0,z0),bb=at(x1,y0,z0),c=at(x1,y0,z1),dd=at(x0,y0,z1);
 const e=at(x0,y1,z0),f=at(x1,y1,z0),g=at(x1,y1,z1),h0=at(x0,y1,z1);
 b.quad(e,h0,g,f,color);b.quad(a,bb,c,dd,color);
 b.quad(h0,dd,c,g,color);b.quad(f,bb,a,e,color);
 b.quad(e,a,dd,h0,color);b.quad(g,c,bb,f,color);
}
function drawCrane(b,pose,now){
 const cx=16.15,cz=-7.05,y=13.05;
 const a=pose.boomAngle,cs=Math.cos(a),sn=Math.sin(a);
 const at=(x,yy,z)=>[cx+x*cs+z*sn,yy,cz-x*sn+z*cs];
 rotatedBox(b,at,-.72,y,0,8.14,.16,.28,'#e8a42c');
 rotatedBox(b,at,-.72,y+.48,0,8.12,.10,.15,'#f4bf55');
 // Truss bracing: the jib and its counterweight yaw together above the mast.
 for(let x=-4.73;x<3.12;x+=.68){
  const p=at(x,y,.02),q=at(Math.min(x+.65,3.42),y+.48,.02);
  const u=at(x,y+.48,.02),v=at(Math.min(x+.65,3.42),y,.02);
  boxBeam(b,...p,...q,.065,'#d88e31');
  boxBeam(b,...u,...v,.065,'#efb746');
 }
 const stay0=at(0,y+.69,0),stay1=at(-4.72,y+.06,0),stay2=at(3.27,y+.08,0);
 boxBeam(b,...stay0,...stay1,.065,'#ad8b5d');
 boxBeam(b,...stay0,...stay2,.065,'#ad8b5d');
 rotatedBox(b,at,.44,y-.62,.04,.83,.65,.70,'#f4e1a5');
 rotatedBox(b,at,.54,y-.57,.40,.62,.42,.06,'#93c3d7');
 rotatedBox(b,at,3.17,y-.45,0,1.05,.76,.66,'#bfc4ba');
 // A motor trolley travels along the jib; wire length and sling change with progress.
 const trolley=at(pose.trolleyX,y-.19,0),hy=pose.hookY;
 rotatedBox(b,at,pose.trolleyX,y-.26,0,.48,.28,.42,'#e5b347');
 const cableLength=trolley[1]-hy;
 b.box(trolley[0],hy+cableLength*.5,trolley[2],.040,cableLength,.040,'#5e6a70');
 b.box(trolley[0],hy-.11,trolley[2],.22,.18,.23,'#d7a536');
 const sway=.07*Math.sin(now*.0017);
 const bottom=hy-.79;
 b.box(trolley[0]+sway,bottom,trolley[2],1.00,.60,.86,'#c8d0d0');
 b.box(trolley[0]+sway,bottom+.33,trolley[2],1.04,.075,.90,'#8a9c9c');
 for(const dx of[-.36,.36]){
  boxBeam(b,trolley[0],hy-.13,trolley[2],
   trolley[0]+dx+sway,bottom+.30,trolley[2],.035,'#68747a');
 }
 // Top warning beacon, flashes more visibly in the dark.
 if((now%1800)<930)b.sphere(cx,y+.83,cz,.17,.15,.17,'#ffc05a',5,7);
}
function drawCrew(b,x,y,z,now,role,id){
 // Chibi-scale 3D workers deliberately match the island's low-poly characters.
 const t=now*.001,step=role==='carry'?Math.sin(t*5.2+id)*.105:role==='scaffold'?Math.sin(t*2.6+id)*.045:0;
 const bob=role==='carry'?Math.abs(Math.sin(t*5.2+id))*.035:0;
 const skin='#eec7a5',hardHat=id%2?'#f6cc43':'#f9d44e';
 const vest=id%2?'#ed9449':'#e98545',pants='#426075',boot='#344650';
 const by=y+bob;
 // Alternating knees and boots create visible walk cycles, without moving off the walkway.
 for(const side of[-1,1]){
  const legY=by+.25+(side===1?step:-step);
  b.box(x+side*.115,legY,z,.15,.46,.17,pants);
  b.box(x+side*.115,by+.075+(side===1?step:-step),z+.06,.19,.14,.27,boot);
 }
 b.box(x,by+.76,z,.50,.66,.30,'#3b7290');
 b.box(x,by+.78,z+.165,.46,.55,.065,vest);
 b.box(x,by+.92,z+.206,.37,.065,.025,'#f7e5b1');
 b.box(x,by+.69,z+.206,.37,.055,.025,'#f9e9b6');
 b.box(x,by+1.18,z,.14,.15,.15,skin);
 b.sphere(x,by+1.38,z,.22,.22,.21,skin,5,8);
 b.sphere(x,by+1.56,z,.27,.115,.24,hardHat,5,8);
 b.box(x,by+1.52,z+.19,.54,.063,.14,hardHat);
 const armSwing=role==='hammer'?.17*Math.sin(t*5.6):role==='signal'?.20*Math.sin(t*2.1):role==='scaffold'?.12*Math.sin(t*4.0):.10*Math.sin(t*5.2);
 b.box(x-.32,by+.87+(role==='carry'?.07:0),z+.02,.14,.48,.17,skin);
 b.box(x+.32,by+.87+armSwing,z+.02,.14,.48,.17,skin);
 if(role==='carry'){
  // Worker holds a short length of steel and actually transports it across the site.
  b.box(x,by+.67,z+.29,.72,.18,.30,'#bcc4c3');
  b.box(x,by+.67,z+.32,.71,.065,.36,'#8b9b9b');
 } else if(role==='hammer'||role==='scaffold'){
  const swing=Math.sin(t*5.6+id)*.22;
  b.box(x+.40,by+1.18+swing,z+.09,.06,.36,.08,'#8e7451');
  b.box(x+.40,by+1.38+swing,z+.09,.25,.12,.16,'#849597');
 }else if(role==='signal'){
  // The banksman's luminous wand swings when the crane changes direction.
  b.box(x+.37,by+1.16+armSwing,z+.07,.085,.42,.09,'#fb8c44');
  b.box(x+.37,by+1.36+armSwing,z+.07,.105,.12,.12,'#fff1bc');
 }
}
function drawDust(b,now,px,pz){
 const cycle=((now*.00028)%1+1)%1;
 // Fine pale puffs reappear near active material handling and the building entrance.
 for(let i=0;i<5;i++){
  const t=(cycle+i*.21)%1;
  const size=.10+.18*t;
  const drift=Math.sin(i*2.1+now*.00045)*.21;
  const x=px+(i-2)*.17+drift,y=.20+t*.67,z=pz+.15*Math.sin(i*2.6);
  const shade=t>.72?'#d6d8cf':i%2?'#e4ddd0':'#d9d5c8';
  b.sphere(x,y,z,size,size*.57,size,shade,3,5);
 }
}
function drawSiteActivity(b,now,progress){
 const p=clamp(progress),pose=constructionPose(now,p);
 drawCrane(b,pose,now);
 // Ground crew stays inside the existing fenced area and clear of the main building.
 drawCrew(b,pose.carrierX,.10,-3.73,now,'carry',0);
 drawCrew(b,12.70,.10,-3.74,now,'hammer',1);
 drawCrew(b,16.79,.10,-3.71,now,'signal',2);
 // Scaffolder always follows the current exposed floor as construction progresses.
 const scaffoldX=13.70+.30*Math.sin(now*.00047);
 drawCrew(b,scaffoldX,pose.scaffoldLevel,-3.94,now,'scaffold',3);
 if(p>=55)drawCrew(b,14.72,pose.scaffoldLevel,-3.94,now,'scaffold',4);
 const hammerPulse=.5+.5*Math.sin(now*.0056);
 b.box(12.97,.21,-3.55,.62,.24,.48,'#aeb9bb');
 if(hammerPulse>.89)for(let i=0;i<3;i++){
  const a=(now*.007+i*2.1),x=12.82+Math.cos(a)*(.13+i*.05);
  b.sphere(x,.43+Math.abs(Math.sin(a))*.28,-3.47,.045,.056,.045,'#ffd17a',3,4);
 }
 drawDust(b,now,12.40,-3.58);
 drawDust(b,now+870,16.5,-3.79);
}
function drawDynamic(b,now,progress){
 if(clamp(progress)>=100)return;
 const t=now*.00075,angle=.42+.32*Math.sin(t),pose=constructionPose(now,progress);
 // Animated excavator remains independent of the rotating tower crane.
 boxBeam(b,16.25,1.2,-4.3,16.0-angle,2.0+angle,-3.9,.17,'#dba13c');
 boxBeam(b,16.0-angle,2.0+angle,-3.9,15.35-angle,1.08,-3.60,.15,'#e8a438');
 b.box(15.35-angle,1.05,-3.6,.45,.34,.50,'#8c9389');
 drawSiteActivity(b,now,progress);
}
function stage(progress){
 const p=clamp(progress);
 return p>=100?'完成・まちびらき':p>=70?'外装・仕上げ工事':p>=35?'躯体を建設中':'基礎・低層階を建設中';
}
function advance(current,days=0){return clamp(clamp(current)+Math.max(0,Math.floor(days))*2);}
window.KomorebiRedevelopment={
 site,marker,clamp,within,clearTrees,completedFloors,constructionPose,drawStatic,drawDynamic,stage,advance
};
})();