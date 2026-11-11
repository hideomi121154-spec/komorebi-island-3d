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
 const x=16.45,z=-7.05,towerHeight=12.8,crane='#efae30';
 b.box(x,towerHeight/2,z,.43,towerHeight,.43,crane);
 for(let y=.6;y<towerHeight;y+=1.1){
  b.box(x,y,z,.86,.10,.78,'#f6c15a');
  boxBeam(b,x-.28,y-.5,z+.35,x+.28,y+.5,z+.35,.045,'#d38e30');
  boxBeam(b,x+.28,y-.5,z-.35,x-.28,y+.5,z-.35,.045,'#cf8733');
 }
 b.box(x,towerHeight+.15,z,1.1,.35,1.1,'#e5a532');
 b.box(x+.45,towerHeight-.56,z,.83,.66,.68,'#fff1ca');
 b.box(x+.88,towerHeight-.48,z,.08,.47,.53,'#91c3cd');
 // Fixed upper jib, several X-trusses and a counterweight.
 const y=towerHeight+.25;
 b.box(x-.75,y,z,8.2,.16,.25,crane);
 b.box(x+1.60,y,z,3.20,.10,.25,'#de9333');
 for(let xx=x-4.65;xx<x+3.6;xx+=.65){
  boxBeam(b,xx,y,z,xx+.6,y+.47,z,.07,'#e6ac3b');
  boxBeam(b,xx,y+.47,z,xx+.6,y,z,.07,'#e8ae3c');
 }
 boxBeam(b,x,y+.6,z,x-4.7,y+.18,z,.065,'#b99363');
 boxBeam(b,x,y+.6,z,x+3.4,y+.18,z,.065,'#b99363');
 b.box(x+3.27,y-.39,z,1.1,.73,.60,'#c3c9b5');
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
function drawStatic(b,progress){
 paintedRoad(b);
 b.box(site.x,.04,site.z,site.width,.16,site.depth,'#c2bfb5');
 b.box(site.x,.125,site.z,site.width-.24,.12,site.depth-.24,'#d2c9b4');
 building(b,progress);
 if(progress<100){craneStatic(b);supplies(b);}
 fence(b,progress>=100);
}
function worker(b,x,z,now,offset){
 const bob=.035*Math.sin(now*.003+offset);
 b.cylinder(x,.4+bob,z,.15,.65,5,'#457d96');
 b.sphere(x,.91+bob,z,.18,.19,.18,'#f0ccb0',5,7);
 b.sphere(x,1.09+bob,z,.23,.11,.23,'#f6c748',5,7);
 for(const dx of[-.1,.1])b.box(x+dx,.13+bob,z,.1,.23,.14,'#697e80');
}
function drawDynamic(b,now,progress){
 if(progress>=100)return;
 const t=now*.00022,cx=16.45,cz=-7.05,top=13.05;
 // A real rotating jib hook would require another crane; on this crane the hoist
 // travels smoothly along its fixed beam, keeping the materials within the site.
 const hookX=14.8+1.25*Math.sin(t),hang=7.7+.65*Math.sin(t*1.4);
 b.box(hookX,(top+hang)/2,cz,.035,top-hang,.035,'#6f7b79');
 b.box(hookX,hang-.1,cz,.46,.11,.39,'#b7ab9b');
 b.box(hookX,hang-.46,cz,1.02,.56,.81,'#c8c9c7');
 for(const off of[-.35,.35])boxBeam(b,hookX,hang,cz,hookX+off,hang-.29,cz,.03,'#8c8e87');
 // Moving excavator arm and tiny crew.
 const angle=.42+.32*Math.sin(now*.00075);
 boxBeam(b,16.25,1.2,-4.3,16.0-angle,2.0+angle,-3.9,.17,'#dba13c');
 boxBeam(b,16.0-angle,2.0+angle,-3.9,15.35-angle,1.08,-3.60,.15,'#e8a438');
 b.box(15.35-angle,1.05,-3.6,.45,.34,.50,'#8c9389');
 worker(b,11.45,-3.7,now,0);
 worker(b,16.92,-4.0,now,2.1);
}
function stage(progress){
 const p=clamp(progress);
 return p>=100?'完成・まちびらき':p>=70?'外装・仕上げ工事':p>=35?'躯体を建設中':'基礎・低層階を建設中';
}
function advance(current,days=0){return clamp(clamp(current)+Math.max(0,Math.floor(days))*2);}
window.KomorebiRedevelopment={
 site,marker,clamp,within,clearTrees,completedFloors,drawStatic,drawDynamic,stage,advance
};
})();