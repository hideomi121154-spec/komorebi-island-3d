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
 g.setIndex(idx);g.computeVertexNormals();
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
 const paint=MAT(color,.38,.24);
 const frame=mesh(shell,CAR_BODY,paint,0,.47,0);frame.receiveShadow=true;frame.castShadow=true;
 const hood=mesh(shell,new THREE.CapsuleGeometry(.59,.55,8,16),paint,0,.59,.70);hood.rotation.x=Math.PI/2;hood.scale.set(1,.55,.8);
 rect(shell,1.55,.18,.31,CHROME,0,.38,-1.03);
 rect(shell,1.47,.12,.21,'#fff5e4',0,.39,1.12);
 // Sculpted fenders, front lights, side panels, exhaust and sporty seat.
 for(const x of[-.73,.73]){
  const f=mesh(shell,new THREE.SphereGeometry(.46,16,12),paint,x,.53,.68);f.scale.set(.52,.50,1);
  ball(shell,.14,'#fff5d4',x*.80,.57,1.20);
  rect(shell,.17,.19,.68,'#f6e5cb',x*.73,.58,-.35);
  rect(shell,.19,.14,.45,'#c9d0d6',x*.65,.33,-1.25);
 }
 rect(shell,.88,.73,.75,'#26394b',0,.91,-.51);
 rect(shell,.93,.22,.50,'#172e46',0,.62,-.17);
 // Wheels have rubber tires and metal hubs; they spin independently.
 const wheels=[];
 for(const x of[-.93,.93])for(const z of[-.77,.77]){
  const spin=new THREE.Group();spin.position.set(x,.33,z);shell.add(spin);
  const tire=mesh(spin,new THREE.TorusGeometry(.32,.135,9,20),RUBBER);tire.rotation.y=Math.PI/2;
  const hub=mesh(spin,new THREE.CylinderGeometry(.19,.19,.07,16),CHROME);
  hub.rotation.z=Math.PI/2;hub.position.x=x>0?.06:-.06;
  ball(spin,.08,'#ffdc8b',x>0?.12:-.12,0,0);
  wheels.push(spin);
 }
 // Highly readable seated driver, expressive face, raised helmet, gloves.
 const torso=mesh(shell,new THREE.CapsuleGeometry(.36,.30,5,12),suit,0,1.21,-.46);torso.rotation.x=-.10;
 ball(shell,.41,'#f4cba5',0,1.91,-.38,20);
 const cap=mesh(shell,new THREE.SphereGeometry(.48,22,14),helmet,0,2.00,-.38);
 cap.scale.set(1.15,1.02,1.08);cap.castShadow=true;
 const visor=mesh(shell,new THREE.SphereGeometry(.45,18,10),MAT('#29455b',.12,.10),0,2.01,.003);
 visor.scale.set(.94,.43,.22);
 for(const x of[-.155,.155]){
  ball(shell,.057,'#1a3348',x,1.88,.140,10);
  ball(shell,.023,'#fdf9ed',x-.017,1.902,.182,8);
  const arm=mesh(shell,new THREE.CapsuleGeometry(.14,.34,5,10),suit,x<0?-.43:.43,1.23,.07);
  arm.rotation.x=.82;arm.rotation.z=x<0?-.35:.35;
  ball(shell,.15,'#fff8e6',x<0?-.44:.44,.94,.25,12);
 }
 const wheel=mesh(shell,new THREE.TorusGeometry(.36,.06,8,18),RUBBER,0,.92,.41);wheel.rotation.x=.75;
 ball(shell,.19,'#e2b76a',0,2.41,-.42,14);
 const visorL=mesh(shell,new THREE.SphereGeometry(.14,12,8),helmet,-.36,2.0,-.13);visorL.scale.set(.5,1.0,1.0);
 const visorR=visorL.clone();visorR.position.x=.36;shell.add(visorR);
 // Power-up effect has its own lightweight transparent shield.
 const bubble=mesh(root,new THREE.SphereGeometry(1.61,24,16),new THREE.MeshPhysicalMaterial({color:'#b5f5ed',roughness:.12,metalness:0,transparent:true,opacity:.21,side:THREE.FrontSide,depthWrite:false}),0,1.13,-.06,false);
 bubble.visible=false;bubble.castShadow=false;
 const turbo=[];
 for(const x of[-.47,.47]){
  const flame=mesh(shell,new THREE.ConeGeometry(.22,.72,10),new THREE.MeshBasicMaterial({color:'#ffc36c'}),x,.35,-1.50,false);
  flame.rotation.x=-Math.PI/2;flame.visible=false;turbo.push(flame);
 }
 shell.rotation.order='YXZ';
 return {root,shell,wheels,bubble,turbo};
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
  }
 }
 rect(root,9.0,.23,25,'#ffe9b7',0,3.63,0);
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
   const k=kartModels[i],s=k.root;
   s.visible=true;s.position.set(p.x,Math.sin(now*.003+i)*.009,p.z);
   s.rotation.y=p.yaw;
   const lifted=i===0&&state.jumpTimer>0?Math.sin(Math.PI*(1-state.jumpTimer))*1.14:0;
   k.shell.position.y=lifted;
   k.shell.rotation.z=i===0?Math.max(-.11,Math.min(.11,p.drift*.065)):0;
   const boost=i===0&&p.boost>0;
   k.turbo.forEach(flame=>{flame.visible=boost;flame.scale.y=.7+Math.abs(Math.sin(now*.023));});
   k.bubble.visible=i===0&&state.shield>0;
   for(const wheel of k.wheels)wheel.rotation.x+=Math.max(0,p.speed||0)*dt*.52;
  });
  items.forEach(({group,base,id})=>{
   group.rotation.y+=dt*1.45;
   group.position.y=base+Math.sin(now*.0027+id)*.19;
  });
  cheers.forEach(({flag,index})=>{
   flag.rotation.z=Math.sin(now*.004+index)*.13;
  });
  clouds.forEach(c=>{c.group.position.x+=dt*(.15+(c.index%5)*.06);if(c.group.position.x>170)c.group.position.x=-123;});
  const actors=[state.player,...state.opponents];
  const focus=spectatorCamera==='drive'?state.player:actors.reduce((a,b)=>a.distance>b.distance?a:b);
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
  }
  const alpha=1-Math.exp(-Math.max(dt,.0001)*6.6);
  camera.position.lerp(target,alpha);
  camera.lookAt(look);
  camera.fov=spectatorCamera==='overhead'?65:spectatorCamera==='leader'?72:66+Math.min(8,speed*.30);camera.updateProjectionMatrix();
  sun.position.set(p.x-35,66,p.z+35);sun.target.position.set(p.x,0,p.z);sun.target.updateMatrixWorld();
 }
 function render(){if(active)renderer.render(scene,camera);}
 function dispose(){active=false;renderer.dispose();window.removeEventListener('resize',resize);}
 return {update,render,resize,setQuality,dispose,camera,scene,renderer,setSpectatorCamera:mode=>{spectatorCamera=['drive','leader','overhead'].includes(mode)?mode:'drive';},getQuality:()=>quality};
}
