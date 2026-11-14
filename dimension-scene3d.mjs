import * as THREE from 'three';
// Independent stylized 3D festival plaza. It never touches the island save file.
const mat=(color,roughness=.83)=>new THREE.MeshStandardMaterial({color,roughness});
const COLORS=['#f7ac83','#84ccce','#c5a6f0','#a0d5a2','#f4c96f','#e3a9bc'];
function makeOrb(parent,r,color,x,y,z,seg=14){
 const o=new THREE.Mesh(new THREE.SphereGeometry(r,seg,10),mat(color));
 o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;
}
function makeBox(parent,w,h,d,color,x,y,z){
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
 o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function cylinder(parent,top,bottom,height,color,x,y,z){
 const o=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,12),mat(color));
 o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;
}
function labelTexture(text,bg='#2e8092'){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
 ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);
 ctx.strokeStyle='#ffe9b0';ctx.lineWidth=8;ctx.strokeRect(8,8,496,112);
 ctx.fillStyle='#fff7d5';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 44px sans-serif';ctx.fillText(text,256,66,480);
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return tx;
}
function sign(parent,text,x,y,z,scale=4,color='#2e8092'){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(scale,scale/4),new THREE.MeshBasicMaterial({map:labelTexture(text,color),side:THREE.DoubleSide}));
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function avatar(color,index){
 const root=new THREE.Group();
 // body, backpack, large face, eyes and mittens; matching 2D avatar palette.
 const jacket=COLORS[index%COLORS.length]||COLORS[0];
 cylinder(root,.40,.49,.91,jacket,0,.78,0);
 cylinder(root,.31,.30,.18,'#f5d4ab',0,1.26,0);
 const face=makeOrb(root,.50,'#f2d2b8',0,1.61,0);
 const cap=makeOrb(root,.48,color||jacket,0,1.96,-.10);
 cap.scale.y=.37;cap.scale.z=1.06;
 for(const x of[-.16,.16]){
  makeOrb(root,.065,'#2d4954',x,1.63,.455,10);
  makeOrb(root,.026,'#ffffff',x-.015,1.66,.505,8);
  const arm=makeOrb(root,.20,jacket,x<0?-.52:.52,.88,.08);arm.scale.set(.8,1.35,.8);
  const boot=makeBox(root,.25,.22,.36,'#476778',x<0?-.22:.22,.13,.1);
 }
 const bag=makeBox(root,.57,.62,.26,'#f0cfa1',0,.86,-.45);
 sign(root,'⭐',0,2.75,0,.77,'#477e8f');
 root.userData={feet:0};
 return root;
}
export function createDimension3D(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'default'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.48;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#a8d9eb');scene.fog=new THREE.Fog('#b4e4f1',38,110);
 const camera=new THREE.PerspectiveCamera(53,1,.1,140);
 const sun=new THREE.DirectionalLight('#ffe3b2',2.9);sun.position.set(14,27,17);scene.add(sun);
 const light=new THREE.HemisphereLight('#e4f9ff','#669c8c',2.35);scene.add(light);
 const ground=cylinder(scene,34,34,1.9,'#9bcf9d',0,-1.08,0);
 ground.scale.z=.85;ground.receiveShadow=true;ground.castShadow=false;
 const trim=cylinder(scene,34.5,34.8,.45,'#f3d7a0',0,-2.20,0);trim.scale.z=.85;
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(190,170),new THREE.MeshStandardMaterial({color:'#74c4d7',roughness:.22,metalness:.11}));
 sea.rotation.x=-Math.PI/2;sea.position.y=-2.55;scene.add(sea);
 // Broad crossing promenade, flowerbeds, lanterns and ocean viewpoint.
 makeBox(scene,5.8,.16,46,'#f2dcaf',0,.035,0);
 makeBox(scene,43,.13,4.5,'#ead2a3',0,.052,0);
 for(let i=-4;i<=4;i++){
  const zz=i*5.5;
  for(const side of[-1,1]){
   const x=side*5.25;
   cylinder(scene,.17,.21,3.05,'#d6b88d',x,1.52,zz);
   makeOrb(scene,.43,i%2?'#ffd49a':'#f9e9c3',x,3.08,zz);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.50,.075,8,16),mat('#e6ad6f'));
   ring.position.set(x,3.08,zz);ring.rotation.x=Math.PI/2;scene.add(ring);
  }
 }
 // Symbolic violet dimension gate at the far end of the plaza.
 const gate=new THREE.Group();gate.position.set(0,0,-13);scene.add(gate);
 for(const xx of[-2.1,2.1]){
  cylinder(gate,.31,.46,5.7,'#baa4e9',xx,2.8,0);
  makeOrb(gate,.57,'#ffe4a3',xx,5.6,0);
 }
 const arc=new THREE.Mesh(new THREE.TorusGeometry(2.26,.42,12,36,Math.PI),mat('#d3b5ed',.35));
 arc.rotation.z=0;arc.position.y=5.45;gate.add(arc);
 const glow=new THREE.Mesh(new THREE.CircleGeometry(1.9,36),new THREE.MeshBasicMaterial({color:'#9ae4e9',transparent:true,opacity:.40,side:THREE.DoubleSide,depthWrite:false}));
 glow.position.set(0,2.8,0);gate.add(glow);
 const portalName=sign(gate,'2D ドットの庭へ',0,7.12,0,4.7,'#817ab5');
 const particles=[];
 for(let i=0;i<22;i++){
  const a=i*2.399,x=Math.cos(a)*(1.2+i%3*.27),y=2.5+(i%7)*.49;
  const o=makeOrb(gate,.09+(i%2)*.05,i%2?'#fff5bb':'#e7fcff',x,y,.18,8);
  particles.push({o,i,origin:y});
 }
 // Coffee stall, sweets cart, seating; stylized art independent of the legacy island.
 for(const side of[-1,1]){
  const g=new THREE.Group();g.position.set(side*16,0,10);scene.add(g);
  makeBox(g,6,3.3,5,'#f4e8cd',0,1.65,0);
  makeBox(g,6.8,.37,5.8,side>0?'#efaf9c':'#9ccbd2',0,3.45,0);
  for(let j=-2;j<=2;j++){
   makeBox(g,.96,.95,.13,'#8ed0da',j*1.14,2.14,2.56);
  }
  makeBox(g,1.1,1.9,.11,'#987e7b',0,1.05,2.56);
  sign(g,side>0?'こもれびカフェ':'星空のお店',0,4.37,2.66,5.4,side>0?'#d99481':'#72a5b8');
 }
 for(let i=0;i<28;i++){
  const ang=(i/28)*Math.PI*2,x=Math.cos(ang)*22.0,z=Math.sin(ang)*15.5;
  cylinder(scene,.14,.18,1.35,'#819d74',x,.73,z);
  const col=['#edb5c5','#e5c47e','#abb5df','#f0a58d'][i%4];
  makeOrb(scene,.55,col,x,1.65,z,10);
  makeOrb(scene,.19,'#f6efc1',x,2.13,z,8);
 }
 // Fountain marks the center of the 3D world.
 cylinder(scene,2.5,2.7,.53,'#ead4a9',0,.27,0);
 cylinder(scene,2.05,2.15,.20,'#91d8de',0,.62,0);
 cylinder(scene,.48,.55,1.5,'#dfc0a3',0,1.16,0);
 const waterTop=makeOrb(scene,.58,'#b4f2f6',0,2.1,0);
 const self=avatar('#ffd591',0);scene.add(self);
 const others=new Map();
 let currentW=0,currentH=0;
 function resize(){
  const w=Math.max(1,canvas.clientWidth||window.innerWidth),h=Math.max(1,canvas.clientHeight||window.innerHeight);
  if(w===currentW&&h===currentH)return;currentW=w;currentH=h;
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 }
 function render(player,peers,time,dt){
  resize();
  self.position.set(player.x,0,player.z);
  self.rotation.y=player.facing||0;
  self.position.y=Math.sin(time*.006)*.04;
  const targetIds=new Set();
  for(const peer of peers){
   if(peer.world!=='plaza3d')continue;
   targetIds.add(peer.id);
   if(!others.has(peer.id)){
    const o=avatar(COLORS[peer.color%COLORS.length],peer.color||0);scene.add(o);others.set(peer.id,o);
   }
   const o=others.get(peer.id);
   o.position.lerp(new THREE.Vector3(peer.x,0,peer.z),Math.min(1,Math.max(.08,dt*9)));
   o.position.y=Math.sin(time*.006+(peer.color||0))*0.045;
  }
  for(const [id,o] of others)if(!targetIds.has(id)){scene.remove(o);others.delete(id);}
  glow.material.opacity=.32+.15*Math.sin(time*.002);
  for(const p of particles)p.o.position.y=p.origin+.14*Math.sin(time*.0017+p.i);
  waterTop.scale.y=1+.16*Math.sin(time*.002);
  const look=new THREE.Vector3(player.x,1.6,player.z),eye=new THREE.Vector3(player.x+11,15,player.z+17);
  camera.position.lerp(eye,Math.min(1,Math.max(.02,dt*4)));
  camera.lookAt(look);renderer.render(scene,camera);
 }
 function dispose(){renderer.dispose();for(const [,obj]of others)scene.remove(obj);}
 return {render,resize,dispose};
}
