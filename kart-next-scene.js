/* Komorebi Grand Prix: dedicated Three.js PBR scene, independent of the island renderer.
   Original geometry and fictional branding. The existing race simulation owns physics/items.
   Release 0.1: artist-asset pipeline prepared, graceful fallback to classic mode. */
import * as THREE from 'three';

const PALETTE=['#ffc45a','#ef6d82','#70c3d4','#b3a0ef','#7dcc9a','#f0a66c','#72c1c1','#d5b674'];
const BRANDS=['KOMO MOTOR','MINT ENERGY','NOVA TECH','WAVE MARINE','SUN BAKERY'];
const MAT=(color,roughness=.75,metalness=.0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const GREEN=MAT('#85c997'),SAND=MAT('#f5d9a1'),SEA=MAT('#63bed4',.25,.12);
const WHITE=MAT('#fff5df'),RUBBER=MAT('#273442',.9),CHROME=MAT('#b7d5e1',.28,.65);
const ROAD=MAT('#4c6070',.97),ROAD_TRIM=MAT('#d7e9e6',.78);
const geometryCache=new Map(),materialCache=new Map();
function box(w,h,d){const key='b'+w+','+h+','+d;if(!geometryCache.has(key))geometryCache.set(key,new THREE.BoxGeometry(w,h,d));return geometryCache.get(key);}
function sphere(r=1,seg=14){const key='s'+r+','+seg;if(!geometryCache.has(key))geometryCache.set(key,new THREE.SphereGeometry(r,seg,Math.max(8,Math.round(seg*.7))));return geometryCache.get(key);}
function material(color){if(!materialCache.has(color))materialCache.set(color,MAT(color));return materialCache.get(color);}
function mesh(parent,geo,mat,x=0,y=0,z=0,shadow=false){
 const obj=new THREE.Mesh(geo,typeof mat==='string'?material(mat):mat);obj.position.set(x,y,z);
 obj.castShadow=!!shadow;obj.receiveShadow=true;parent.add(obj);return obj;
}
function rect(parent,w,h,d,color,x=0,y=0,z=0){return mesh(parent,box(w,h,d),color,x,y,z);}
function ball(parent,r,color,x=0,y=0,z=0,seg=16){return mesh(parent,sphere(r,seg),color,x,y,z);}
function colorBillboard(title,color,secondary){
 const c=document.createElement('canvas');c.width=512;c.height=168;const ctx=c.getContext('2d');
 ctx.fillStyle=color;ctx.fillRect(0,0,512,168);
 ctx.fillStyle=secondary;ctx.fillRect(0,0,512,12);ctx.fillRect(0,155,512,13);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#0e263d88';ctx.shadowBlur=9;
 ctx.font='bold 59px system-ui, sans-serif';ctx.fillStyle='#fffaf0';ctx.fillText(title,256,90,475);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
 return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide,transparent:true});
}
function trackStrip(kart,offsetIn,offsetOut,mat,samples=480,vertexColors=false){
 const data=[],norm=[],uv=[],colors=[],idx=[];const length=kart.length;
 for(let i=0;i<=samples;i++){
  const p=kart.at(length*i/samples),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
  for(let edge=0;edge<2;edge++){
   const offset=edge===0?offsetIn:offsetOut;
   data.push(p.x+nx*offset,.08+(Math.abs(offset)>kart.WIDTH?.007:0),p.z+nz*offset);
   norm.push(0,1,0);uv.push(i/samples*38,edge);
   const c=new THREE.Color((Math.floor(i/7)+Math.abs(Math.round(offset)))%2===0?'#f9f4e8':'#e06460');
   colors.push(c.r,c.g,c.b);
  }
  if(i<samples){const p=i*2;idx.push(p,p+2,p+1,p+1,p+2,p+3);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 if(vertexColors)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setIndex(idx);
 const result=new THREE.Mesh(g,mat);result.receiveShadow=true;result.frustumCulled=false;return result;
}
function makeIsland(scene,x,z,rx,rz,tint){
 const under=mesh(scene,new THREE.CylinderGeometry(1,1.07,1.2,48),SAND,x,-.83,z,false);under.scale.set(rx,.75,rz);
 const top=mesh(scene,new THREE.CylinderGeometry(1,1,.13,48),material(tint),x,-.14,z,false);top.scale.set(rx,1,rz);
}
function roundedCarGeometry(){
 const shape=new THREE.Shape();
 shape.moveTo(-.76,-1.15);shape.quadraticCurveTo(-.92,-1.1,-.89,-.8);
 shape.lineTo(-.89,.74);shape.quadraticCurveTo(-.88,1.13,-.52,1.2);
 shape.lineTo(.52,1.2);shape.quadraticCurveTo(.88,1.13,.89,.74);
 shape.lineTo(.89,-.82);shape.quadraticCurveTo(.85,-1.15,.54,-1.15);shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.39,bevelEnabled:true,steps:1,bevelSegments:3,curveSegments:10,bevelSize:.10,bevelThickness:.095});
 g.rotateX(Math.PI/2);g.computeVertexNormals();return g;
}
const CAR_BODY=roundedCarGeometry(),ROUND=sphere(1,20);
function makeDriverKart(color,index){
 const root=new THREE.Group(),shell=new THREE.Group();root.add(shell);
 const suit=material(index===0?'#ed6e56':['#6a9ee0','#9d91d8','#79c6a0','#e1b068','#d888aa','#8fc8d4','#98b77d'][index%7]);
 const helmet=material(index===0?'#ffe18a':['#bce2f3','#e0c6ed','#b9ebcf','#f9dda6','#f3b9d1','#c6e8e5','#e6edb4'][index%7]);
 const paint=new THREE.MeshPhysicalMaterial({color,roughness:.3,metalness:.22,clearcoat:.8,clearcoatRoughness:.2});
 const frame=mesh(shell,CAR_BODY,paint,0,.47,0);frame.receiveShadow=true;frame.castShadow=true;
 const hood=mesh(shell,new THREE.CapsuleGeometry(.59,.55,8,16),paint,0,.59,.70);hood.rotation.x=Math.PI/2;hood.scale.set(1,.55,.8);
 rect(shell,1.55,.18,.31,CHROME,0,.38,-1.03);
 for(const x of [-.55,.55]){
  rect(shell,.26,.12,.37,RUBBER,x,.35,-1.26);
  const exhaust=mesh(shell,new THREE.CylinderGeometry(.095,.12,.38,12),CHROME,x,.42,-1.24);exhaust.rotation.x=Math.PI/2;
  rect(shell,.10,.035,.85,CHROME,x,.68,.18);
 }
 rect(shell,.56,.045,.68,WHITE,0,.68,.48);
 rect(shell,1.47,.12,.21,'#fff5e4',0,.39,1.12);
 // Sculpted fenders, front lights, side panels, exhaust and sporty seat.
 for(const x of[-.73,.73]){
  const f=mesh(shell,new THREE.SphereGeometry(.46,16,12),paint,x,.53,.68);f.scale.set(.52,.50,1);
  ball(shell,.14,new THREE.MeshStandardMaterial({color:'#fff5d4',emissive:'#ffdb91',emissiveIntensity:.8}),x*.80,.57,1.20);
  rect(shell,.24,.14,.08,new THREE.MeshStandardMaterial({color:'#ff5960',emissive:'#ff202a',emissiveIntensity:.7}),x*.8,.52,-1.19);
  rect(shell,.17,.19,.68,'#f6e5cb',x*.73,.58,-.35);
  rect(shell,.19,.14,.45,'#c9d0d6',x*.65,.33,-1.25);
 }
 rect(shell,.88,.73,.75,'#26394b',0,.91,-.51);
 rect(shell,.93,.22,.50,'#172e46',0,.62,-.17);
 // Wheels have rubber tires and metal hubs; they spin independently.
 const wheels=[],steering=[];
 for(const x of[-.93,.93])for(const z of[-.77,.77]){
  const spin=new THREE.Group();const pivot=new THREE.Group();pivot.position.set(x,.33,z);shell.add(pivot);pivot.add(spin);if(z>0)steering.push(pivot);
  const tire=mesh(spin,new THREE.TorusGeometry(.32,.135,9,20),RUBBER);tire.rotation.y=Math.PI/2;
  const hub=mesh(spin,new THREE.CylinderGeometry(.19,.19,.07,16),CHROME);
  hub.rotation.z=Math.PI/2;hub.position.x=x>0?.06:-.06;
  ball(spin,.08,'#ffdc8b',x>0?.12:-.12,0,0);
  wheels.push(spin);
 }
 // Highly readable seated driver, expressive face, raised helmet, gloves.
 const driver=new THREE.Group();shell.add(driver);
 const torso=mesh(driver,new THREE.CapsuleGeometry(.36,.30,5,12),suit,0,1.21,-.46);torso.rotation.x=-.10;
 ball(driver,.41,'#f4cba5',0,1.91,-.38,20);
 const cap=mesh(driver,new THREE.SphereGeometry(.48,22,14),helmet,0,2.00,-.38);
 cap.scale.set(1.15,1.02,1.08);cap.castShadow=true;
 const visor=mesh(driver,new THREE.SphereGeometry(.45,18,10),MAT('#29455b',.12,.10),0,2.01,.003);
 visor.scale.set(.94,.43,.22);
 for(const x of[-.155,.155]){
  ball(driver,.057,'#1a3348',x,1.88,.140,10);
  ball(driver,.023,'#fdf9ed',x-.017,1.902,.182,8);
  const arm=mesh(driver,new THREE.CapsuleGeometry(.14,.34,5,10),suit,x<0?-.43:.43,1.23,.07);
  arm.rotation.x=.82;arm.rotation.z=x<0?-.35:.35;
  ball(driver,.15,'#fff8e6',x<0?-.44:.44,.94,.25,12);
 }
 const wheel=mesh(driver,new THREE.TorusGeometry(.36,.06,8,18),RUBBER,0,.92,.41);wheel.rotation.x=.75;
 ball(driver,.19,'#e2b76a',0,2.41,-.42,14);
 const visorL=mesh(driver,new THREE.SphereGeometry(.14,12,8),helmet,-.36,2.0,-.13);visorL.scale.set(.5,1.0,1.0);
 const visorR=visorL.clone();visorR.position.x=.36;driver.add(visorR);
 // Power-up effect has its own lightweight transparent shield.
 const bubble=mesh(root,new THREE.SphereGeometry(1.61,24,16),new THREE.MeshPhysicalMaterial({color:'#b5f5ed',roughness:.12,metalness:0,transparent:true,opacity:.21,side:THREE.FrontSide,depthWrite:false}),0,1.13,-.06,false);
 bubble.visible=false;bubble.castShadow=false;
 const turbo=[];
 for(const x of[-.47,.47]){
  const flame=mesh(shell,new THREE.ConeGeometry(.22,.72,10),new THREE.MeshBasicMaterial({color:'#ffc36c'}),x,.35,-1.50,false);
  flame.rotation.x=-Math.PI/2;flame.visible=false;turbo.push(flame);
 }
 shell.rotation.order='YXZ';
 return {root,shell,wheels,steering,driver,bubble,turbo,lastYaw:null,lastSpeed:null,turn:0,pitch:0};
}
function billboard(scene,x,z,yaw,text,bg,accent,w=6.8,h=2.25){
 const holder=new THREE.Group();holder.position.set(x,0,z);holder.rotation.y=yaw;scene.add(holder);
 for(const sx of[-w*.43,w*.43])rect(holder,.24,4.5,.25,'#c0d1cb',sx,2.27,0);
 const signMaterial=colorBillboard(text,bg,accent);
 const front=mesh(holder,new THREE.PlaneGeometry(w,h),signMaterial,0,5.05,.14,false);
 const back=mesh(holder,new THREE.PlaneGeometry(w,h),signMaterial,0,5.05,-.14,false);
 back.rotation.y=Math.PI;front.castShadow=false;back.castShadow=false;
 return holder;
}
function overheadGantry(scene,kart,p,text,bg,accent,w=11.5){
 const root=new THREE.Group();root.position.set(p.x,0,p.z);root.rotation.y=p.yaw;scene.add(root);
 const h=2.0,center=6.4,span=kart.WIDTH+1.4;
 for(const side of[-1,1]){
  rect(root,.24,6.0,.28,'#c1d5d3',side*span,3.0,0);
  rect(root,.70,.34,.82,accent,side*span,.20,0);
 }
 const m=colorBillboard(text,bg,accent);
 const front=mesh(root,new THREE.PlaneGeometry(w,h),m,0,center,.18,false);
 const back=mesh(root,new THREE.PlaneGeometry(w,h),m,0,center,-.18,false);
 back.rotation.y=Math.PI;
 rect(root,w+.1,.22,.32,accent,0,center+h/2+.11,0);
 const trim=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.45});
 rect(root,w+.1,.10,.22,trim,0,center-h/2-.06,.22);
 for(const side of [-1,1])for(let j=0;j<4;j++)rect(root,.48,.48,.08,(j+(side===1?1:0))%2?'#f8f2de':'#26364b',side*(w/2-.32),center-.72+j*.48,.24);
 return root;
}
function createStand(scene,kart,venue,index,cheers){
 const p=kart.venuePosition(venue);
 const root=new THREE.Group();root.position.set(p.x,0,p.z);root.rotation.y=p.yaw;scene.add(root);
 const side=venue.side;const theme=kart.SPONSORS[venue.brand];
 const base=rect(root,8.4,.83,24,'#bbc9c3',0,.26,0);
 for(let tier=0;tier<3;tier++){
  const x=(tier-1)*2.0*side,y=.85+tier*.52;
  rect(root,1.92,.43,22,tier===1?'#d0e3dd':'#a5cdd2',x,y-.20,0);
  for(let col=0;col<8;col++){
   const z=-9.4+col*2.65,shirt=['#ef9e86','#8bc8d7','#d9b3d9','#f3d277','#9eca97'][(index+col+tier)%5];
   const head=mesh(root,ROUND,material('#f2c7a2'),x,y+.62,z,false);head.scale.set(.30,.32,.30);
   const body=mesh(root,new THREE.CylinderGeometry(.33,.37,.66,9),material(shirt),x,y+.14,z,false);
   const cap=mesh(root,new THREE.SphereGeometry(.32,10,7),material(shirt),x,y+.87,z,false);cap.scale.y=.23;
   if(col%2===0)cheers.push({head,body,cap,baseY:y,index:index*24+tier*8+col});
  }
 }
 rect(root,9.0,.23,25,'#ffe9b7',0,3.63,0);
 const fascia=new THREE.MeshStandardMaterial({color:theme.accent,emissive:theme.accent,emissiveIntensity:.35});
 rect(root,.16,.28,25,fascia,-side*4.48,3.53,0);
 for(let j=0;j<6;j++){rect(root,.15,.8,.15,'#849ca5',-side*4.25,1.05,-10+j*4); }
 rect(root,.12,.12,22,CHROME,-side*4.25,1.48,0);
 for(const z of[-11,0,11])rect(root,.17,3.1,.18,'#aac6bd',0,2.05,z);
 // Banner and occasional animated flags, not 144 independent animations.
 const p2=kart.at(kart.length*venue.fraction);
 billboard(scene,p2.x-Math.cos(p2.yaw)*(kart.WIDTH+15)*side,p2.z+Math.sin(p2.yaw)*(kart.WIDTH+15)*side,p2.yaw,BRANDS[venue.brand],theme.color,theme.accent,5.8,1.8);
 for(let k=0;k<3;k++){
  const flag=new THREE.Group();flag.position.set((k-1)*2.4,3.72,-8+k*7.8);root.add(flag);
  rect(flag,.07,1.15,.08,'#cddad0',0,.58,0);
  rect(flag,.82,.44,.07,theme.accent,.46,1.05,0);
  cheers.push({flag,index:index*3+k});
 }
}


function surfaceTexture(water=false){
 const size=256, data=new Uint8Array(size*size*4);
 let seed=92317;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4;
  const v=water?128+30*Math.sin(x/size*Math.PI*16+2*Math.sin(y/size*Math.PI*4))+12*Math.sin(y/size*Math.PI*20):105+random()*65;
  data[i]=data[i+1]=data[i+2]=Math.round(v);data[i+3]=255;
 }
 const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
function createSurfaceEffects(scene,kart,renderer){
 const asphalt=surfaceTexture(),wave=surfaceTexture(true);
 asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;ROAD.side=THREE.DoubleSide;ROAD.map=asphalt;ROAD.bumpMap=asphalt;ROAD.bumpScale=.045;ROAD.roughness=.76;ROAD.needsUpdate=true;
 wave.repeat.set(45,36);SEA.bumpMap=wave;SEA.bumpScale=.13;SEA.roughness=.32;SEA.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer);
 const envScene=new THREE.Scene();envScene.background=new THREE.Color('#7086a4');
 const panelMat=new THREE.MeshBasicMaterial({color:new THREE.Color(2.5,1.9,1.2),side:THREE.DoubleSide});
 for(let i=0;i<4;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(5,3),panelMat);p.position.set(Math.cos(i*Math.PI/2)*8,5,Math.sin(i*Math.PI/2)*8);p.lookAt(0,0,0);envScene.add(p);}
 const env=pmrem.fromScene(envScene,.06);scene.environment=env.texture;scene.environmentIntensity=.35;
 envScene.children.forEach(p=>p.geometry.dispose());panelMat.dispose();pmrem.dispose();
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;
 const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(32,64,0,32,64,32);gradient.addColorStop(0,'rgba(255,219,151,0.9)');gradient.addColorStop(.25,'rgba(255,190,90,0.35)');gradient.addColorStop(1,'rgba(255,160,50,0)');ctx.save();ctx.translate(0,0);ctx.fillStyle=gradient;ctx.fillRect(0,0,64,128);ctx.restore();
 const glow=new THREE.CanvasTexture(canvas);glow.colorSpace=THREE.SRGBColorSpace;
 const roadMat=new THREE.MeshBasicMaterial({map:glow,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-1});
 const seaMat=roadMat.clone();
 const geo=new THREE.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);
 const roadGlows=new THREE.InstancedMesh(geo,roadMat,64),seaGlows=new THREE.InstancedMesh(geo,seaMat,64);
 const haloMat=new THREE.SpriteMaterial({map:glow,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
 const halos=[];const dummy=new THREE.Object3D();
 for(let i=0;i<64;i++){
  const p=kart.at(kart.length*Math.floor(i/2)/32),side=i%2?1:-1,nx=Math.cos(p.yaw)*side,nz=-Math.sin(p.yaw)*side;
  dummy.position.set(p.x+nx*(kart.WIDTH-1.4),.095,p.z+nz*(kart.WIDTH-1.4));dummy.rotation.set(0,p.yaw,0);dummy.scale.set(3.2,1,7);dummy.updateMatrix();roadGlows.setMatrixAt(i,dummy.matrix);
  dummy.position.set(p.x+nx*(kart.WIDTH+4),-1.275,p.z+nz*(kart.WIDTH+4));dummy.scale.set(3.8,1,12);dummy.updateMatrix();seaGlows.setMatrixAt(i,dummy.matrix);
  const halo=new THREE.Sprite(haloMat);halo.position.set(p.x+nx*(kart.WIDTH+1.5),3.7,p.z+nz*(kart.WIDTH+1.5));halo.scale.set(2.4,2.4,1);scene.add(halo);halos.push(halo);
 }
 scene.add(roadGlows,seaGlows);
 return {update(now,darkness,quality){
  wave.offset.set(now*.000013,now*.000009);
  ROAD.roughness=.76-.24*darkness;
  scene.environmentIntensity=.35+.25*darkness;
  roadMat.opacity=.55*darkness;seaMat.opacity=.40*darkness;haloMat.opacity=.75*darkness;
  roadGlows.visible=seaGlows.visible=darkness>.05;
  halos.forEach(h=>h.visible=darkness>.05&&quality!=='performance');
 },dispose(){env.dispose();asphalt.dispose();wave.dispose();glow.dispose();geo.dispose();roadMat.dispose();seaMat.dispose();haloMat.dispose();}};
}

function createNightWorld(scene,kart){
 const group=new THREE.Group();scene.add(group);
 const glow=new THREE.MeshBasicMaterial({color:0xffdb91});
 const pole=MAT('#526578',.5,.4);
 const lamps=new THREE.InstancedMesh(box(.25,3.6,.25),pole,64);
 const bulbs=new THREE.InstancedMesh(sphere(.28,10),glow,64);
 const dummy=new THREE.Object3D();
 for(let i=0;i<64;i++){
  const p=kart.at(kart.length*Math.floor(i/2)/32),side=i%2?1:-1;
  const x=p.x+Math.cos(p.yaw)*side*(kart.WIDTH+1.5),z=p.z-Math.sin(p.yaw)*side*(kart.WIDTH+1.5);
  dummy.position.set(x,1.8,z);dummy.updateMatrix();lamps.setMatrixAt(i,dummy.matrix);
  dummy.position.y=3.7;dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);
 }
 group.add(lamps,bulbs);
 const stars=new Float32Array(600*3);
 for(let i=0;i<600;i++){const a=i*2.399963,b=.15+((i*73)%599)/599*1.35;stars.set([Math.cos(a)*Math.cos(b)*180,Math.sin(b)*180,Math.sin(a)*Math.cos(b)*180],i*3);}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(stars,3));
 const sky=new THREE.Points(sg,new THREE.PointsMaterial({color:0xdceaff,size:.36,sizeAttenuation:true,fog:false}));group.add(sky);
 const moon=mesh(group,sphere(5,24),new THREE.MeshBasicMaterial({color:0xffedc6,fog:false}),-85,100,-105);
 const lights=Array.from({length:4},()=>{const l=new THREE.PointLight(0xffce86,65,24,2);group.add(l);return l;});
 const count=240,positions=new Float32Array(count*3),colors=new Float32Array(count*3);
 const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.BufferAttribute(positions,3));fg.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const fm=new THREE.PointsMaterial({size:.48,vertexColors:true,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
 const fireworks=new THREE.Points(fg,fm);fireworks.frustumCulled=false;group.add(fireworks);
 const palette=[0xffc45a,0xff658c,0x66aaff,0xd99aff].map(c=>new THREE.Color(c));
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 let last=-1,night=false,blend=0,initialized=false;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function update(now,dt,focus,quality){
  const sec=Math.floor(Date.now()/1000);
  if(sec!==last){last=sec;const p=clock.formatToParts(new Date());const get=k=>Number(p.find(x=>x.type===k)?.value||0);const h=get('hour')+get('minute')/60;night=h>=18||h<5;const target=h>=18.5||h<4.5?1:h>=17.5?Math.min(1,h-17.5):h<5.5?Math.max(0,5.5-h):0;blend=target;initialized=true;}
  group.visible=true;bulbs.visible=blend>.15;
  sky.visible=blend>.55;moon.visible=sky.visible;
  lights.forEach((l,i)=>{const p=kart.at(focus.distance+(i-1)*13);l.position.set(p.x+Math.cos(p.yaw)*(kart.WIDTH+1),3.7,p.z-Math.sin(p.yaw)*(kart.WIDTH+1));l.intensity=65*blend;l.visible=blend>.15&&quality!=='performance';});
  fireworks.visible=night&&!reduced;
  if(fireworks.visible){
   const n=quality==='performance'?120:count;fg.setDrawRange(0,n);
   for(let i=0;i<n;i++){const burst=Math.floor(i/60),j=i%60,t=((now*.001+burst*1.7)%6.8),a=j*2.399963, y=1-2*(j+.5)/60,rr=Math.sqrt(1-y*y),age=Math.max(0,t-1.15),r=age*7.5;const x=24+Math.cos(burst*1.9)*65,z=12+Math.sin(burst*1.9)*65;const fade=t<1.15?(j===0?1:0):Math.max(0,1-age/4.5);positions.set(t<1.15?[x,5+t*23,z]:[x+Math.cos(a)*rr*r,32+y*r-age*age*1.1,z+Math.sin(a)*rr*r],i*3);const c=palette[burst];colors.set([c.r*fade,c.g*fade,c.b*fade],i*3);}
   fg.attributes.position.needsUpdate=true;fg.attributes.color.needsUpdate=true;
  }
  return initialized?blend:0;
 }
 return {update};
}


function createResortLandmarks(scene){
 const group=new THREE.Group();scene.add(group);
 const ivory=MAT('#fff0d5',.48,.08),red=MAT('#ce5454',.5,.12),steel=MAT('#47647c',.32,.45);
 const gold=new THREE.MeshStandardMaterial({color:'#ffd58b',emissive:'#ffb24b',emissiveIntensity:.1});
 const neon=new THREE.MeshStandardMaterial({color:'#9ceaff',emissive:'#46cfff',emissiveIntensity:.1});
 const pink=new THREE.MeshStandardMaterial({color:'#ff9ad8',emissive:'#ff49a5',emissiveIntensity:.1});
 const lighthouse=new THREE.Group();lighthouse.position.set(-17,0,-8);group.add(lighthouse);
 for(let i=0;i<7;i++)mesh(lighthouse,new THREE.CylinderGeometry(1.8-i*.12,1.92-i*.12,1.7,24),i%2?red:ivory,0,.85+i*1.7,0);
 mesh(lighthouse,new THREE.CylinderGeometry(2,2,.35,24),steel,0,12.1,0);
 mesh(lighthouse,new THREE.CylinderGeometry(1.25,1.25,1.7,20),gold,0,13.1,0);
 mesh(lighthouse,new THREE.ConeGeometry(1.85,1.4,24),red,0,14.6,0);
 const wheelBase=new THREE.Group();wheelBase.position.set(48,0,5);group.add(wheelBase);
 for(const x of [-4,4]){const support=rect(wheelBase,.65,12,.65,steel,x,5.8,0);support.rotation.z=x>0?.38:-.38;}
 const wheel=new THREE.Group();wheel.position.y=11;wheelBase.add(wheel);
 for(const z of [-.65,.65])mesh(wheel,new THREE.TorusGeometry(8,.16,8,64),neon,0,0,z);
 const cabins=[];
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;const spoke=rect(wheel,.12,8,.12,steel,Math.sin(a)*4,Math.cos(a)*4,0);spoke.rotation.z=-a;
  const cabin=new THREE.Group();cabin.position.set(Math.sin(a)*8,Math.cos(a)*8,0);wheel.add(cabin);
  rect(cabin,1.45,1.1,1.35,i%2?pink:gold,0,-.65,0);
  rect(cabin,1.22,.48,1.37,steel,0,-.48,0);cabins.push(cabin);
 }
 const pavilion=new THREE.Group();pavilion.position.set(30,0,29);group.add(pavilion);
 rect(pavilion,13,.4,8,ivory,0,.2,0);
 for(const x of [-5.7,0,5.7])for(const z of [-3.3,3.3])rect(pavilion,.42,4,.42,ivory,x,2,z);
 rect(pavilion,13.5,.35,8.5,steel,0,4.2,0);
 for(let i=0;i<9;i++)rect(pavilion,.8,.16,.18,i%2?pink:gold,-5.2+i*1.3,4.05,4.25);
 return {update(now,darkness){wheel.rotation.z=now*.00012;for(const c of cabins)c.rotation.z=-wheel.rotation.z;for(const m of [gold,neon,pink])m.emissiveIntensity=.1+darkness*2.1;}};
}


function createRaceMotionFX(scene){
 const max=160,particles=Array.from({length:max},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,spark:false}));
 const pos=new Float32Array(max*3),col=new Float32Array(max*3);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
 const mat=new THREE.PointsMaterial({size:.25,vertexColors:true,transparent:true,opacity:.65,depthWrite:false});
 const points=new THREE.Points(geo,mat);points.frustumCulled=false;scene.add(points);
 let cursor=0,carry=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 return {update(actors,models,dt,quality){
  dt=Math.min(.05,Math.max(0,dt));carry+=dt;
  if(!reduced&&carry>.045){carry=0;actors.forEach((p,i)=>{
   const k=models[i];if(!k)return;if(Math.abs(k.turn)<.45&&Math.abs(p.drift||0)<.25)return;if((p.speed||0)<4)return;
   if(quality==='performance'&&i>0)return;
   for(const side of [-1,1]){const q=particles[cursor++%max];q.life=.55+Math.random()*.35;q.spark=Math.random()<.24;q.x=p.x+Math.cos(p.yaw)*side*.8-Math.sin(p.yaw)*.8;q.z=p.z-Math.sin(p.yaw)*side*.8-Math.cos(p.yaw)*.8;q.y=.22;q.vx=-Math.sin(p.yaw)*1.8+side*.3;q.vz=-Math.cos(p.yaw)*1.8;q.vy=q.spark?1.5:.45;}
  });}
  let n=0;for(const q of particles){if(q.life<=0)continue;q.life-=dt;q.x+=q.vx*dt;q.z+=q.vz*dt;q.y=Math.max(.12,q.y+q.vy*dt);q.vy-=dt*(q.spark?4:0);pos.set([q.x,q.y,q.z],n*3);const f=Math.max(0,q.life);col.set(q.spark?[f,.5*f,.08*f]:[.55*f,.6*f,.65*f],n*3);n++;}
  geo.setDrawRange(0,n);geo.attributes.position.needsUpdate=true;geo.attributes.color.needsUpdate=true;
 },dispose(){geo.dispose();mat.dispose();}};
}

export async function createRaceView(kart,canvas){
 if(!kart||!canvas)throw Error('レース情報または描画先がありません');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',stencil:false,depth:true});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.32;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#83cceb');
 scene.fog=new THREE.Fog('#b9e7f1',92,275);
 const camera=new THREE.PerspectiveCamera(64,1,.09,360);
 camera.position.set(24,5,55);
 const sun=new THREE.DirectionalLight('#fff2d0',3.0);sun.position.set(-42,83,45);sun.castShadow=true;
 sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-54;sun.shadow.camera.right=54;
 sun.shadow.camera.top=54;sun.shadow.camera.bottom=-54;sun.shadow.camera.near=1;sun.shadow.camera.far=215;
 sun.shadow.bias=-.001;sun.shadow.normalBias=.045;scene.add(sun,sun.target);
 const hemisphere=new THREE.HemisphereLight('#d9f6ff','#4a7c68',2.15);scene.add(hemisphere);
 const ambient=new THREE.AmbientLight('#fff2e3',.35);scene.add(ambient);
 const water=mesh(scene,new THREE.PlaneGeometry(520,440,30,25),SEA,27,-1.30,16,false);water.rotation.x=-Math.PI/2;
 const waterOverlay=mesh(scene,new THREE.PlaneGeometry(520,440),new THREE.MeshBasicMaterial({color:'#a2def4',transparent:true,opacity:.12,depthWrite:false}),27,-1.29,16,false);waterOverlay.rotation.x=-Math.PI/2;
 for(const isle of [[-6,0,31,24,'#84c48e'],[49,2,23,22,'#99d096'],[30,31,25,16,'#a4d394'],[44,58,26,22,'#92cc8f']])makeIsland(scene,...isle);
 // Race surface: smooth PBR track plus two-sided painted kerbs.
 scene.add(trackStrip(kart,-kart.WIDTH,kart.WIDTH,ROAD));
 for(const sign of[-1,1]){
  const curbMat=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.75});
  scene.add(trackStrip(kart,sign*(kart.WIDTH-.04),sign*(kart.WIDTH+.60),curbMat,400,true));
 }
 // Side boundary supports and railings.
 for(const sign of[-1,1]){
  const edge=[];
  for(let i=0;i<=200;i++){
   const p=kart.at(kart.length*i/200),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
   edge.push(new THREE.Vector3(p.x+nx*sign*(kart.WIDTH+.95),.68,p.z+nz*sign*(kart.WIDTH+.95)));
  }
  const curve=new THREE.CatmullRomCurve3(edge,true,'centripetal');
  const rail=mesh(scene,new THREE.TubeGeometry(curve,330,.075,5,true),CHROME,0,0,0,false);rail.castShadow=false;
 }
 // Start/finish grid and grand-prix graphic banners.
 const st=kart.at(3);
 overheadGantry(scene,kart,kart.at(kart.length*.037),'KOMOREBI GP','#167a93','#f6dc8d',kart.WIDTH*2+2.0);
 for(let i=0;i<5;i++){
  const p=kart.at(kart.length*(.12+i*.182)),theme=kart.SPONSORS[i];
  overheadGantry(scene,kart,p,BRANDS[i],theme.color,theme.accent,kart.WIDTH*2+2.0);
 }
 const cheers=[];
 for(let i=0;i<kart.VENUES.length;i++)createStand(scene,kart,kart.VENUES[i],i,cheers);
 // Highly readable item capsules and golden launch pads.
 const items=[];
 for(let i=0;i<kart.ITEM_DISTANCES.length;i++){
  const p=kart.at(kart.ITEM_DISTANCES[i]),group=new THREE.Group();group.position.set(p.x,1.66,p.z);scene.add(group);
  const core=mesh(group,new THREE.IcosahedronGeometry(.67,1),new THREE.MeshPhysicalMaterial({color:['#83dfe1','#ffd988','#d5b9fb'][i%3],roughness:.17,metalness:.12,transparent:true,opacity:.85}),0,0,0,false);
  const ring=mesh(group,new THREE.TorusGeometry(.78,.062,7,21),material('#fff3c6'),0,0,0,false);ring.rotation.y=.35;
  items.push({group,base:group.position.y,id:i});
 }
 for(const d of kart.JUMP_DISTANCES){
  const p=kart.at(d),g=new THREE.Group();g.position.set(p.x,.12,p.z);g.rotation.y=p.yaw;scene.add(g);
  rect(g,6,.20,3.4,'#f5b866',0,.10,0);
  for(let i=-2;i<=2;i++)rect(g,.30,.03,2.9,'#fff2bd',i*1.1,.23,0);
 }
 // Coherent, softly lit hills, clouds and floating original race mascots.
 const clouds=[];
 for(let i=0;i<17;i++){
  const g=new THREE.Group(),x=-105+(i*31)%265,z=-85+(i*47)%225;
  g.position.set(x,26+(i%5)*3,z);scene.add(g);
  const mat=material(i%3===0?'#f2fafc':'#ffffff');
  for(let j=0;j<3;j++){const c=mesh(g,ROUND,mat,j*3.1,Math.sin(j*1.7)*.7,0,false);c.scale.set(3.3+(j%2),1.4,1.8);}
  clouds.push({group:g,index:i});
 }
 // Palm-like decorative plants and balloon stems only well outside the track.
 for(let i=0;i<36;i++){
  const p=kart.at(kart.length*(i+.37)/36),side=(i%2?1:-1),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
  const x=p.x+nx*side*(kart.WIDTH+7+(i%3)*2),z=p.z+nz*side*(kart.WIDTH+7+(i%3)*2);
  if(i%3===0){
   rect(scene,.23,2.5,.23,'#b1a18b',x,1.1,z);
   const cap=mesh(scene,ROUND,material(['#d5b5e9','#a2dfbc','#efbb8f'][i%3]),x,2.7,z,false);cap.scale.set(1.3,.90,1.25);
  }else{
   rect(scene,.08,3.8,.08,'#b4ada0',x,1.9,z);
   const balloon=ball(scene,.70,['#f4b7a4','#f6d08f','#95dcd2','#c9b7ed'][i%4],x,4.0,z,14);
   balloon.scale.y=1.25;
  }
 }
 const kartModels=PALETTE.map((color,i)=>makeDriverKart(color,i));
 for(const k of kartModels)scene.add(k.root);
 const motionFX=createRaceMotionFX(scene);
 const landmarks=createResortLandmarks(scene);
 const nightWorld=createNightWorld(scene,kart);
 const surfaceEffects=createSurfaceEffects(scene,kart,renderer);
 const daySky=new THREE.Color('#83cceb'),nightSky=new THREE.Color('#08152e'),dayFog=new THREE.Color('#b9e7f1'),nightFog=new THREE.Color('#15233e');
 const target=new THREE.Vector3(),look=new THREE.Vector3();
 let quality='auto',active=true,prev=0,spectatorCamera='drive';
 function resize(){
  const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;
  const cap=quality==='performance'?1:quality==='quality'?1.7:1.35;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,cap));
  renderer.setSize(Math.max(1,w),Math.max(1,h),false);
  camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();
 }
 function setQuality(mode){
  quality=mode==='quality'||mode==='performance'?mode:'auto';
  renderer.shadowMap.enabled=quality!=='performance';
  resize();return quality;
 }
 window.addEventListener('resize',resize,{passive:true});resize();
 function update(state,now,dt){
  if(!state?.player)return;
  const actors=[state.player,...state.opponents];
  actors.forEach((p,i)=>{
   const k=kartModels[i];if(!k)return;const s=k.root;
   s.visible=true;s.position.set(p.x,Math.sin(now*.003+i)*.009,p.z);
   s.rotation.y=p.yaw;
   const lifted=i===0&&state.jumpTimer>0?Math.sin(Math.PI*(1-state.jumpTimer))*1.14:0;
   k.shell.position.y=lifted;
   const step=Math.max(.008,Math.min(.05,dt||.016));
   const yawDelta=k.lastYaw===null?0:Math.atan2(Math.sin(p.yaw-k.lastYaw),Math.cos(p.yaw-k.lastYaw));
   const accel=k.lastSpeed===null?0:((p.speed||0)-k.lastSpeed)/step;
   k.lastYaw=p.yaw;k.lastSpeed=p.speed||0;
   const smooth=1-Math.exp(-step*7);
   k.turn+=(THREE.MathUtils.clamp(yawDelta/step,-2,2)-k.turn)*smooth;
   k.pitch+=(THREE.MathUtils.clamp(-accel*.008,-.12,.12)-k.pitch)*smooth;
   k.shell.rotation.z=THREE.MathUtils.clamp(-k.turn*.09,-.18,.18);
   k.shell.rotation.x=k.pitch;
   k.driver.rotation.z=-k.turn*.045;
   k.driver.rotation.x=k.pitch*.45;
   k.steering.forEach(w=>w.rotation.y=THREE.MathUtils.clamp(k.turn*.23,-.45,.45));
   const boost=i===0&&p.boost>0;
   k.turbo.forEach(flame=>{flame.visible=boost;flame.scale.y=.7+Math.abs(Math.sin(now*.023));});
   k.bubble.visible=i===0&&state.shield>0;
   for(const wheel of k.wheels)wheel.rotation.x+=Math.max(0,p.speed||0)*dt*.52;
  });
  motionFX.update(actors,kartModels,dt,quality);
  items.forEach(({group,base,id})=>{
   group.rotation.y+=dt*1.45;
   group.position.y=base+Math.sin(now*.0027+id)*.19;
  });
  cheers.forEach(({flag,head,body,cap,baseY,index})=>{
   const wave=Math.sin(now*.004+index);
   if(flag)flag.rotation.z=wave*.19;
   else if(quality!=='performance'){const bounce=Math.max(0,wave)*.10;head.position.y=baseY+.62+bounce;body.position.y=baseY+.14+bounce;cap.position.y=baseY+.87+bounce;}
  });
  clouds.forEach(c=>{c.group.position.x+=dt*(.15+(c.index%5)*.06);if(c.group.position.x>170)c.group.position.x=-123;});
  const contenders=[state.player,...state.opponents];
  const focus=spectatorCamera==='drive'?state.player:contenders.reduce((a,b)=>a.distance>b.distance?a:b);
  const darkness=nightWorld.update(now,dt,focus,quality);
  surfaceEffects.update(now,darkness,quality);
  landmarks.update(now,darkness);
  scene.background.copy(daySky).lerp(nightSky,darkness);
  scene.fog.color.copy(dayFog).lerp(nightFog,darkness);
  sun.intensity=3*(1-darkness)+.35*darkness;
  hemisphere.intensity=2.15*(1-darkness)+.55*darkness;
  ambient.intensity=.35*(1-darkness)+.22*darkness;
  waterOverlay.material.opacity=.12*(1-darkness)+.025*darkness;
  const speed=Math.max(0,focus.speed||0);
  // Broadcast camera tracks the actual leading racer rather than the viewer.
  const behind=kart.at(focus.distance-(spectatorCamera==='drive'?9.5:16));
  const ahead=kart.at(focus.distance+(spectatorCamera==='drive'?17:27));
  if(spectatorCamera==='overhead'){
   target.set(focus.x,29,focus.z+12);
   look.set(focus.x,0,focus.z);
  }else{
   target.set(behind.x,spectatorCamera==='drive'?4.7+speed*.015:8.3,behind.z);
   look.set(ahead.x,spectatorCamera==='drive'?1.58+speed*.006:1.8,ahead.z);
   if(spectatorCamera==='leader'){const sweep=Math.sin(now*.00022)*2.2;target.x+=Math.cos(behind.yaw)*sweep;target.z-=Math.sin(behind.yaw)*sweep;}
  }
  const alpha=1-Math.exp(-Math.max(dt,.0001)*6.6);
  camera.position.lerp(target,alpha);
  camera.lookAt(look);
  camera.fov=spectatorCamera==='overhead'?65:spectatorCamera==='leader'?72:66+Math.min(8,speed*.30);camera.updateProjectionMatrix();
  sun.position.set(focus.x-35,66,focus.z+35);sun.target.position.set(focus.x,0,focus.z);sun.target.updateMatrixWorld();
 }
 function render(){if(active)renderer.render(scene,camera);}
 function dispose(){active=false;motionFX.dispose();surfaceEffects.dispose();renderer.dispose();window.removeEventListener('resize',resize);}
 return {update,render,resize,setQuality,dispose,camera,scene,renderer,setSpectatorCamera:mode=>{spectatorCamera=['drive','leader','overhead'].includes(mode)?mode:'drive';},getQuality:()=>quality};
}
