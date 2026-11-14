/* Komorebi Island — procedural night festival effects.
 * Draws BEHIND opaque 3D geometry, not on top of buildings or HUD.
 * WebGL1 point sprites + Canvas2D fallback. No textures, external assets, or save changes.
 */
(() => {
'use strict';
const TWO_PI=Math.PI*2;
const CYCLE=2850;
const ROCKET_MS=850;
const BURST_MS=1850;
const palette=[
 [1.00,.68,.24], [1.00,.40,.65], [.41,.80,1.00],
 [.59,1.00,.74], [.78,.58,1.00], [1.00,.84,.54]
];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function random(seed){
 let n=(Math.imul(seed|0,1664525)+1013904223)|0;
 n^=n>>>16;n=Math.imul(n,2246822507);n^=n>>>13;
 return (n>>>0)/4294967296;
}
const stars=Array.from({length:112},(_,i)=>({
 x:.028+random(i*101+3)*.944,
 y:.035+random(i*181+7)*.53,
 radius:.65+random(i*73+11)*1.55,
 phase:random(i*59+9)*TWO_PI,
 tint:i%11===0?[1,.84,.56]:i%7===0?[.67,.81,1]:[.92,.96,1]
}));
function fireworkAt(index){
 const variety=((index%palette.length)+palette.length)%palette.length;
 return {x:.15+.69*random(index*71+19),y:.20+.25*random(index*131+31),
  spread:.068+.049*random(index*191+41),color:palette[variety],kind:index%3};
}
function eventsAt(ms){
 const slot=Math.floor(Math.max(0,ms)/CYCLE);
 const events=[];
 for(let i=Math.max(0,slot-1);i<=slot;i++){
  const age=ms-i*CYCLE;
  if(age>=0&&age<=ROCKET_MS+BURST_MS)events.push({index:i,age,...fireworkAt(i)});
 }
 return events;
}
function makeParticles(ms,intensity,reducedMotion=false,starsOnly=false){
 if(intensity<=.005)return new Float32Array(0);
 const result=[];
 function point(x,y,size,color,alpha){
  if(x<-.03||x>1.03||y<-.03||y>1.03||alpha<.015)return;
  result.push(x,y,size,color[0],color[1],color[2],clamp(alpha));
 }
 for(const star of stars){
  const flicker=reducedMotion?.85:(.73+.27*Math.sin(ms*.0015+star.phase*2));
  point(star.x,star.y,star.radius,star.tint,intensity*flicker*.82);
 }
 if(reducedMotion||starsOnly)return new Float32Array(result);
 for(const e of eventsAt(ms)){
  if(e.age<ROCKET_MS){
   const t=clamp(e.age/ROCKET_MS);
   const tipY=.77+((e.y-.77)*t*t*(3-2*t));
   for(let j=0;j<10;j++){
    const trail=j/10;
    point(e.x+Math.sin(e.index*13+j)*.0014,tipY+trail*.075,
     1.2+2.0*(1-trail),e.color,(.92-trail*.82)*intensity);
   }
   point(e.x,tipY,5.7,[1,1,.84],intensity);
  } else {
   const age=e.age-ROCKET_MS;
   const t=clamp(age/BURST_MS);
   const expansion=Math.pow(t,.62)*e.spread;
   const fall=.036*t*t;
   const fade=Math.pow(1-t,1.16)*intensity;
   if(t<.12)point(e.x,e.y,12,[1,1,.86],fade*(1-t/.12));
   for(let spoke=0;spoke<62;spoke++){
    const angle=TWO_PI*spoke/62+(e.kind===1?.085*spoke:0);
    const length=.65+random(e.index*227+spoke*79)*.63;
    const bend=e.kind===2?.32*Math.sin(angle*3):0;
    for(let trail=0;trail<3;trail++){
     const f=1-trail*.14;
     const radius=expansion*length*f;
     const x=e.x+Math.cos(angle+bend*t)*radius;
     const y=e.y+Math.sin(angle+bend*t)*radius+fall*(.55+random(spoke+e.index*27));
     const spark=trail===0?[1,1,.88]:e.color;
     point(x,y,trail===0?2.9:1.75,spark,fade*(1-trail*.22));
    }
   }
  }
 }
 return new Float32Array(result);
}
function createShader(gl,type,src){
 const shader=gl.createShader(type);
 gl.shaderSource(shader,src);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
  const message=gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);throw new Error('Festival shader: '+message);
 }
 return shader;
}
function createRenderer(gl){
 const vertex="attribute vec3 aParticle;attribute vec4 aTint;uniform float uScale;varying vec4 vTint;void main(){vec2 xy=aParticle.xy*vec2(2.0,-2.0)+vec2(-1.0,1.0);gl_Position=vec4(xy,.999,1.0);gl_PointSize=clamp(aParticle.z*uScale,1.0,28.0);vTint=aTint;}";
 const fragment="precision mediump float;varying vec4 vTint;void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;float halo=1.0-smoothstep(.06,1.0,d);float core=1.0-smoothstep(.0,.33,d);gl_FragColor=vec4(vTint.rgb,vTint.a*(halo*.66+core*.34));}";
 const program=gl.createProgram();
 const vs=createShader(gl,gl.VERTEX_SHADER,vertex),fs=createShader(gl,gl.FRAGMENT_SHADER,fragment);
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Festival linking: '+gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer();
 const aParticle=gl.getAttribLocation(program,'aParticle'),aTint=gl.getAttribLocation(program,'aTint');
 const uScale=gl.getUniformLocation(program,'uScale');
 return {
  draw(ms,intensity,pixelRatio,reducedMotion=false){
   if(intensity<=.005)return;
   const points=makeParticles(ms,intensity,reducedMotion,true);
   if(!points.length)return;
   gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,points,gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(aParticle);
   gl.vertexAttribPointer(aParticle,3,gl.FLOAT,false,28,0);
   gl.enableVertexAttribArray(aTint);
   gl.vertexAttribPointer(aTint,4,gl.FLOAT,false,28,12);
   gl.uniform1f(uScale,Math.max(1,pixelRatio||1));
   // Draw sky first, with depth writing disabled; the actual island covers it.
   gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
   gl.drawArrays(gl.POINTS,0,points.length/7);
   gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
   gl.disableVertexAttribArray(aParticle);gl.disableVertexAttribArray(aTint);
  },
  destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program);}
 };
}

/* Main festival: orchestrated like a real fireworks show, not one ring of dots.
 * All coordinates are REAL world coordinates. The same animation can be watched
 * from the shore, by looking up, or from the overhead camera. Deterministic
 * seeded explosions avoid network textures and heavy audio/video downloads.
 */
const SHOW_CYCLE=6800;
const showPattern=[
 {at:140,x:0,y:26,z:-3,r:5.7,color:[1,.72,.31],rays:248,life:5450,kind:'gold'},
 {at:500,x:1,y:17,z:2,r:4.1,color:[1,.23,.32],rays:185,life:4520,kind:'red'},
 {at:760,x:-3.9,y:20,z:0,r:1.9,color:[1,.30,.72],rays:83,life:3600,kind:'pink'},
 {at:970,x:-3.0,y:17,z:-2,r:1.6,color:[.38,1,.63],rays:70,life:3420,kind:'green'},
 {at:1250,x:-4.5,y:15,z:1,r:1.9,color:[1,.40,.67],rays:76,life:3670,kind:'pink'},
 {at:590,x:4.0,y:21,z:-4,r:2.1,color:[.42,1,.67],rays:86,life:3900,kind:'green'},
 {at:1780,x:4.9,y:19,z:1,r:2.4,color:[1,.64,.32],rays:93,life:4150,kind:'gold'},
 {at:2050,x:-2.0,y:23,z:3,r:1.8,color:[1,.32,.71],rays:78,life:3320,kind:'pink'},
 {at:2540,x:3.2,y:14,z:-1,r:1.8,color:[.35,.94,1],rays:73,life:3200,kind:'green'},
 {at:3030,x:-4.5,y:23,z:-4,r:2.1,color:[1,.75,.38],rays:82,life:3630,kind:'gold'}
];
const showPalette={gold:[1,.72,.31],red:[1,.23,.32],pink:[1,.30,.72],green:[.38,1,.63]};
// Exactly one surprise in each group of ten launches, at a seeded random
// position. This avoids dry spells without inflating the stated 10% frequency.
const FACE_KINDS=['face-round','face-bunny','face-cat'];
const faceColors={outline:[1,.93,.72],eye:[.57,.91,1],blush:[1,.46,.65],mouth:[1,.76,.85],spark:[.87,1,.9]};
function rareAtCycle(cycle){return {slot:2+Math.floor(random(cycle*14033+791)*8),kind:FACE_KINDS[cycle%3]};}
function faceShape(kind){
 const pts=[],put=(x,y,c='outline',size=1)=>pts.push({x,y,color:faceColors[c],size});
 const oval=(x,y,rx,ry,n,c='outline')=>{for(let i=0;i<n;i++){let a=TWO_PI*i/n;put(x+rx*Math.cos(a),y+ry*Math.sin(a),c);}};
 const line=(ax,ay,bx,by,n,c='outline')=>{for(let i=0;i<=n;i++){let t=i/n;put(ax+(bx-ax)*t,ay+(by-ay)*t,c);}};
 const bend=(a,b,c,n,color='outline')=>{for(let i=0;i<=n;i++){let t=i/n,u=1-t;put(u*u*a[0]+2*u*t*b[0]+t*t*c[0],u*u*a[1]+2*u*t*b[1]+t*t*c[1],color);}};
 oval(0,0,.68,.64,94);
 for(const x of[-.23,.23]){oval(x,-.10,.073,.095,13,'eye');put(x-.02,-.13,'spark',1.7);}
 for(const x of[-.40,.40])oval(x,.21,.10,.05,13,'blush');
 bend([-.10,.26],[0,.40],[.10,.26],16,'mouth');
 if(kind==='face-bunny'){
  for(const side of[-1,1]){
   bend([side*.30,-.54],[side*.62,-1.43],[side*.26,-1.31],31);
   bend([side*.26,-1.31],[side*.09,-1.30],[side*.08,-.60],25);
   bend([side*.25,-.67],[side*.30,-1.07],[side*.24,-1.17],15,'blush');
  }
 }else if(kind==='face-cat'){
  for(const side of[-1,1]){
   line(side*.38,-.51,side*.68,-1.00,17);
   line(side*.68,-1.00,side*.12,-.62,18);
   line(side*.39,-.67,side*.53,-.84,10,'blush');
   for(let i=-1;i<=1;i++)line(side*.44,.25+i*.04,side*.80,.23+i*.09,7,'mouth');
  }
 }else{for(const side of[-1,1])oval(side*.61,-.46,.11,.11,16,'spark');}
 for(let i=0;i<20;i++){let a=TWO_PI*i/20,r=1.02+(i%3)*.055;put(Math.cos(a)*r,Math.sin(a)*r*.8,'spark',i%5===0?1.3:.70);}
 return pts;
}
const FACE_SHAPES=Object.fromEntries(FACE_KINDS.map(k=>[k,faceShape(k)]));
function renderFaceTexture(ctx,kind){
 ctx.clearRect(0,0,512,512);ctx.save();ctx.translate(256,282);
 for(const p of FACE_SHAPES[kind]){
  const rgb=p.color.map(n=>Math.round(n*255)).join(','),x=p.x*178,y=p.y*178;
  ctx.shadowBlur=11;ctx.shadowColor='rgba('+rgb+',.98)';
  ctx.fillStyle='rgba('+rgb+',.48)';ctx.beginPath();ctx.arc(x,y,3.0*p.size,0,TWO_PI);ctx.fill();
  ctx.shadowBlur=3;ctx.fillStyle='rgba(255,255,240,.95)';
  ctx.beginPath();ctx.arc(x,y,Math.max(.9,1.35*p.size),0,TWO_PI);ctx.fill();
 }
 ctx.restore();
}

function spectacleEventsAt(ms){
 const t=Math.max(0,ms),cycle=Math.floor(t/SHOW_CYCLE),phase=t%SHOW_CYCLE;
 const rare=rareAtCycle(cycle);
 return showPattern.flatMap((base,index)=>{
  if(phase<base.at-580||phase>=base.at+base.life)return [];
  const spec=index===rare.slot?
   {...base,r:Math.max(3.5,base.r*1.55),y:Math.max(21,base.y+3.5),color:[1,.91,.78],kind:'face',faceType:rare.kind}:base;
  return [{spec,age:phase-base.at,index,cycle}];
 });
}
function burstLighting(ms,intensity){
 if(intensity<=.02)return {strength:0,color:[1,.8,.5]};
 let brightness=0,tint=[1,.8,.5];
 for(const {spec,age} of spectacleEventsAt(ms)){
  if(age>=0&&age<spec.life){
   const pulse=Math.pow(1-age/spec.life,2.4)*(spec.kind==='gold'?1:.83);
   if(pulse>brightness){brightness=pulse;tint=spec.color;}
  }
 }
 return {strength:Math.min(.20,brightness*.18*intensity),color:tint};
}
function worldParticles(ms,intensity,origin=[5,-3],reducedMotion=false,detail=1,lineSegments=null){
 if(intensity<=.005||reducedMotion)return new Float32Array(0);
 const output=[],active=spectacleEventsAt(ms);
 const density=clamp(detail,.45,1);
 const maxPoints=Math.ceil(11000*density);
 function add(x,y,z,size,col,alpha){
  if(alpha<.025||output.length>=maxPoints*8)return;
  output.push(x,y,z,size,col[0],col[1],col[2],clamp(alpha));
 }
 // Two near-white launch fountains continuously spray from the shore.
 // The spark jets are staggered so the lower scene never looks static.
 const phase=(Math.max(0,ms)%SHOW_CYCLE)*.001;
 for(let fountain=0;fountain<3;fountain++){
  const fx=origin[0]+(fountain-1)*2.25-1.9,fz=origin[1]+4.2;
  for(let j=0;j<100*density;j++){
   const fraction=(phase*.37+j*.6180339887+fountain*.29)%1;
   const age=fraction;
   const spread=(.18+1.05*age*age)*(random(j*191+fountain*73)-.5);
   const y=1+age*16.2-3.8*age*age;
   const alpha=(1-age*.77)*intensity*(.68+.32*random(j*97+fountain*9));
   add(fx+spread,y,fz+.30*Math.sin(j*4.8),j%9===0?7.6:3.8,
     j%5===0?[1,1,.96]:[1,.83,.48],alpha);
  }
 }
 for(const {spec,age} of active){
  const centerX=origin[0]+spec.x,centerZ=origin[1]+spec.z;
  const seed=showPattern.indexOf(spec)+12;
  // White-hot launch rocket rises before the opening. Its glitter trail curls.
  if(age<0){
   const t=clamp(1+age/580),head=1+(spec.y-1)*t*t*(3-2*t);
   if(t<=0)continue;
   for(let i=0;i<22;i++){
    const u=i/22,dy=u*(2.5+5*t);
    const a=.95*(1-u)*intensity;
    add(centerX+.19*Math.sin(seed+i*1.5+t*3),Math.max(.07,head-dy),centerZ,
      i===0?13:4.0,i%4===0?[1,1,.96]:[1,.72,.35],a);
   }
   continue;
  }
  if(spec.kind==='face'){
   const t=clamp(age/spec.life),grow=.32+.68*Math.pow(Math.min(1,t*2.3),.63);
   const fade=Math.pow(1-t,.65)*intensity;
   for(const p of FACE_SHAPES[spec.faceType]){
    // Spark-particle companion to the camera-facing glow texture.
    add(centerX+p.x*spec.r*grow,spec.y-p.y*spec.r*grow-.8*t*t,centerZ,
     5.8*p.size,p.color,fade*(.85+.15*Math.sin(age*.008+p.x*31)));
   }
   for(let j=0;j<35;j++){
    const a=TWO_PI*j/35,r=spec.r*(.80+.25*random(seed+j*47))*grow;
    add(centerX+Math.cos(a)*r,spec.y+Math.sin(a)*r-.8*t*t,
      centerZ+.35*Math.sin(a*3),3.5,faceColors.spark,fade*.62);
   }
   continue;
  }
  // A complete spherical shell projected through the camera. Radial trails,
  // gravity, changing radii, colored sparks and twinkling tips create
  // gold willow, crimson chrysanthemum and smaller flower bursts.
  const t=clamp(age/spec.life);
  const fade=Math.pow(1-t,spec.kind==='gold'?.72:.95)*intensity;
  const expand=spec.r*Math.pow(Math.min(1,t*1.70),.57)*(1+.09*t);
  const fall=(spec.kind==='gold'?5.3:2.8)*t*t;
  const rays=Math.max(32,Math.floor(spec.rays*density));
  const trails=spec.kind==='gold'?12:spec.kind==='red'?10:8;
  if(t<.19)add(centerX,spec.y,centerZ,27,[1,1,.9],fade*(1-t/.19));
  for(let j=0;j<rays;j++){
   const latitude=1-2*((j+.5)/rays);
   const latitudeRadius=Math.sqrt(Math.max(0,1-latitude*latitude));
   const angle=j*2.399963229728653+random(seed*113+j*17)*.22;
   const ux=Math.cos(angle)*latitudeRadius;
   const uz=Math.sin(angle)*latitudeRadius*.84;
   const uy=latitude;
   const variation=.74+.49*random(seed*381+j*67);
   const arc=spec.kind==='gold'?1.0:1.0;
   const radius=expand*variation*arc;
   const flicker=.76+.24*Math.sin(age*.010+j*3.41);
   let previousTrailPoint=null;
   for(let k=0;k<trails;k++){
    const relative=1-k*(spec.kind==='gold'?.045:spec.kind==='red'?.060:.071);
    const x=centerX+ux*radius*relative;
    const z=centerZ+uz*radius*relative;
    const gravity=fall*(1+(1-relative)*.36);
    const y=spec.y+uy*radius*relative-gravity;
    const twinkle=(k===0?flicker:1)*(.98-k*.078);
    const white=k===0||j%17===0&&k<2;
    const color=white?[1,1,.87]:spec.color;
    const pointSize=k===0?(spec.kind==='gold'?12.4:11.5):spec.kind==='gold'?7.4:6.7;
    const alpha=fade*twinkle;
    add(x,y,z,pointSize,color,alpha);
    // Real connected ribbons, so the long golden/red tails never look like a dotted ring.
    if(lineSegments&&previousTrailPoint&&lineSegments.length<maxPoints*16){
     const p=previousTrailPoint,brightness=clamp(alpha*1.45);
     lineSegments.push(p[0],p[1],p[2],1,spec.color[0],spec.color[1],spec.color[2],brightness);
     lineSegments.push(x,y,z,1,spec.color[0],spec.color[1],spec.color[2],brightness);
    }
    previousTrailPoint=[x,y,z];
   }
   // Glitter falls slightly behind the long golden willow tips.
   if(spec.kind==='gold'&&j%3===0){
    const a=.54+.32*random(j*31+seed);
    add(centerX+ux*radius*a,spec.y+uy*radius*a-fall-1.4*t,centerZ+uz*radius*a,
      3.0,[1,.87,.54],fade*(.50+.3*random(j*47)));
   }
  }
 }
 return new Float32Array(output);
}
/* Procedurally generated transparent glow sprites.
 * Standard VFX technique: animated camera-facing quads are positioned in the
 * same 3D world as the glowing streaks, so they also work from overhead.
 * No external textures, copyright assets, images or network calls required.
 */
function createBurstBillboards(gl){
 if(typeof document==='undefined'||!document.createElement)return null;
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=512;
 const c=canvas.getContext('2d');
 if(!c)return null;
 const schemes={
  gold:{base:'255,181,52',hot:'255,243,184',rays:270},
  red:{base:'255,56,86',hot:'255,225,234',rays:210},
  pink:{base:'255,69,176',hot:'255,222,245',rays:160},
  green:{base:'72,255,146',hot:'223,255,232',rays:160}
 };
 const textures={};
 const textureProgram=gl.createProgram();
 const vs=createShader(gl,gl.VERTEX_SHADER,"attribute vec3 aPos;attribute vec2 aUv;uniform mat4 uView;uniform mat4 uProj;varying vec2 vUv;void main(){vUv=aUv;gl_Position=uProj*uView*vec4(aPos,1.0);}");
 const fs=createShader(gl,gl.FRAGMENT_SHADER,"precision mediump float;varying vec2 vUv;uniform sampler2D uTexture;uniform float uOpacity;void main(){vec4 color=texture2D(uTexture,vUv);gl_FragColor=vec4(color.rgb,color.a*uOpacity);}");
 gl.attachShader(textureProgram,vs);gl.attachShader(textureProgram,fs);gl.linkProgram(textureProgram);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(textureProgram,gl.LINK_STATUS))throw Error('Firework glow texture shader: '+gl.getProgramInfoLog(textureProgram));
 const vertexBuffer=gl.createBuffer();
 const pos=gl.getAttribLocation(textureProgram,'aPos'),uv=gl.getAttribLocation(textureProgram,'aUv');
 const viewLoc=gl.getUniformLocation(textureProgram,'uView'),projLoc=gl.getUniformLocation(textureProgram,'uProj');
 const textureLoc=gl.getUniformLocation(textureProgram,'uTexture'),opacityLoc=gl.getUniformLocation(textureProgram,'uOpacity');
 for(const kind of Object.keys(schemes)){
  const scheme=schemes[kind];
  c.clearRect(0,0,512,512);
  c.save();c.translate(256,256);c.globalCompositeOperation='lighter';c.lineCap='round';
  const seed=kind==='gold'?113:kind==='red'?379:kind==='pink'?719:991;
  // Curved luminous filaments, variable thickness, colored cores and glitter.
  for(let j=0;j<scheme.rays;j++){
   const angle=TWO_PI*(j+random(seed+j*31)*.45)/scheme.rays;
   const reach=170+49*random(seed*7+j*53);
   const start=9+random(seed*11+j*23)*35;
   const droop=kind==='gold'?(random(seed*41+j*19)*17+4):random(seed*41+j*19)*5;
   const x0=Math.cos(angle)*start,y0=Math.sin(angle)*start;
   const x1=Math.cos(angle)*reach,y1=Math.sin(angle)*reach+droop;
   const sx=Math.cos(angle)*reach*.55,sy=Math.sin(angle)*reach*.55+droop*.2;
   const gradient=c.createLinearGradient(x0,y0,x1,y1);
   gradient.addColorStop(0,'rgba('+scheme.hot+',.05)');
   gradient.addColorStop(.25,'rgba('+scheme.base+',.63)');
   gradient.addColorStop(.67,'rgba('+scheme.base+',.91)');
   gradient.addColorStop(1,'rgba('+scheme.hot+',.10)');
   c.strokeStyle=gradient;
   c.shadowColor='rgba('+scheme.base+',.85)';
   c.shadowBlur=kind==='gold'?6.7:5.8;
   c.lineWidth=(kind==='gold'?.7:1.05)+random(seed*17+j*29)*1.0;
   c.beginPath();c.moveTo(x0,y0);
   c.quadraticCurveTo(sx,sy,x1,y1);c.stroke();
   if(j%2===0){
    c.shadowBlur=3;c.fillStyle='rgba('+scheme.hot+',.85)';
    const rad=.9+1.2*random(seed*3+j*71);
    c.beginPath();c.arc(x1,y1,rad,0,TWO_PI);c.fill();
   }
  }
  // Bright white-hot central ignition, smoothly dissipating into colored light.
  const glow=c.createRadialGradient(0,0,0,0,0,43);
  glow.addColorStop(0,'rgba(255,255,247,.95)');
  glow.addColorStop(.16,'rgba('+scheme.hot+',.70)');
  glow.addColorStop(.42,'rgba('+scheme.base+',.26)');
  glow.addColorStop(1,'rgba('+scheme.base+',0)');
  c.shadowBlur=0;c.fillStyle=glow;c.fillRect(-45,-45,90,90);
  // Fine random residual sparkles build a textured photographic glow.
  for(let j=0;j<150;j++){
   const a=random(seed*97+j*19)*TWO_PI,rad=45+176*random(seed*131+j*43);
   const x=Math.cos(a)*rad,y=Math.sin(a)*rad;
   c.fillStyle='rgba('+scheme.hot+','+(.15+random(seed*17+j*7)*.55)+')';
   c.beginPath();c.arc(x,y,.36+random(j*67)*.68,0,TWO_PI);c.fill();
  }
  c.restore();
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  textures[kind]=texture;
 }
 gl.bindTexture(gl.TEXTURE_2D,null);
 return {
  draw(ms,intensity,origin,view,proj){
   if(intensity<=.005)return;
   const cameraRight=[view[0],view[4],view[8]],cameraUp=[view[1],view[5],view[9]];
   gl.useProgram(textureProgram);
   gl.uniformMatrix4fv(viewLoc,false,view);
   gl.uniformMatrix4fv(projLoc,false,proj);
   gl.activeTexture(gl.TEXTURE0);gl.uniform1i(textureLoc,0);
   gl.enableVertexAttribArray(pos);gl.enableVertexAttribArray(uv);
   gl.enable(gl.DEPTH_TEST);gl.depthMask(false);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
   for(const {spec,age} of spectacleEventsAt(ms)){
    if(age<0||age>spec.life)continue;
    const t=clamp(age/spec.life);
    const grow=.22+.83*Math.pow(Math.min(1,t*1.8),.60);
    const opacity=intensity*Math.pow(1-t,spec.kind==='gold'?.60:.80)*.86;
    if(opacity<.025)continue;
    const radius=spec.r*1.10*grow;
    const center=[origin[0]+spec.x,spec.y-(spec.kind==='gold'?3.0:1.6)*t*t,origin[1]+spec.z];
    const vertices=[];
    for(const [ix,iy,u,v] of [[-1,-1,0,0],[1,-1,1,0],[-1,1,0,1],[1,1,1,1]]){
     vertices.push(center[0]+radius*(cameraRight[0]*ix+cameraUp[0]*iy),
      center[1]+radius*(cameraRight[1]*ix+cameraUp[1]*iy),
      center[2]+radius*(cameraRight[2]*ix+cameraUp[2]*iy),u,v);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(pos,3,gl.FLOAT,false,20,0);
    gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
    gl.bindTexture(gl.TEXTURE_2D,textures[spec.kind]);
    gl.uniform1f(opacityLoc,opacity);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
   }
   gl.disable(gl.BLEND);gl.depthMask(true);
   gl.disableVertexAttribArray(pos);gl.disableVertexAttribArray(uv);
   gl.bindTexture(gl.TEXTURE_2D,null);
  },
  destroy(){
   for(const t of Object.values(textures))gl.deleteTexture(t);
   gl.deleteBuffer(vertexBuffer);gl.deleteProgram(textureProgram);
  }
 };
}
function createWorldRenderer(gl){
 const vertex="attribute vec4 aWorld;attribute vec4 aTint;uniform mat4 uView;uniform mat4 uProj;uniform float uScale;varying vec4 vTint;void main(){vec4 p=uView*vec4(aWorld.xyz,1.0);gl_Position=uProj*p;float d=max(8.0,-p.z);gl_PointSize=clamp(aWorld.w*uScale*min(2.0,28.0/d),1.5,42.0);vTint=aTint;}";
 const fragment="precision mediump float;varying vec4 vTint;uniform float uLine;void main(){if(uLine>.5){gl_FragColor=vec4(vTint.rgb*1.15,vTint.a);return;}float r=length(gl_PointCoord-vec2(.5))*2.0;float halo=pow(max(0.0,1.0-r),2.1);float core=1.0-smoothstep(.02,.61,r);float a=(.26*halo+.97*core)*vTint.a;gl_FragColor=vec4(vTint.rgb*(.84+.25*core),a);}";
 const program=gl.createProgram();
 const vs=createShader(gl,gl.VERTEX_SHADER,vertex),fs=createShader(gl,gl.FRAGMENT_SHADER,fragment);
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Festival spectacle link: '+gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer(),lineBuffer=gl.createBuffer(),aWorld=gl.getAttribLocation(program,'aWorld'),aTint=gl.getAttribLocation(program,'aTint');
 const uView=gl.getUniformLocation(program,'uView'),uProj=gl.getUniformLocation(program,'uProj'),uScale=gl.getUniformLocation(program,'uScale'),uLine=gl.getUniformLocation(program,'uLine');
 let billboards=null;
 try{billboards=createBurstBillboards(gl)}catch(error){console.warn('Procedural firework glows disabled:',error)}
 return {
  draw(ms,intensity,origin,view,proj,pixelRatio,reducedMotion=false){
   const detail=(pixelRatio||1)<1.35?.66:1;
   const lineSegments=[];
   const points=worldParticles(ms,intensity,origin,reducedMotion,detail,lineSegments);
   if(!points.length)return;
   billboards?.draw(ms,intensity,origin,view,proj);
   gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.uniformMatrix4fv(uView,false,view);gl.uniformMatrix4fv(uProj,false,proj);
   gl.uniform1f(uScale,Math.max(1,pixelRatio||1));
   gl.enable(gl.DEPTH_TEST);gl.depthMask(false);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
   gl.enableVertexAttribArray(aWorld);
   gl.enableVertexAttribArray(aTint);
   if(lineSegments.length){
    gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(lineSegments),gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(aWorld,4,gl.FLOAT,false,32,0);
    gl.vertexAttribPointer(aTint,4,gl.FLOAT,false,32,16);
    gl.uniform1f(uLine,1);
    gl.drawArrays(gl.LINES,0,lineSegments.length/8);
   }
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,points,gl.DYNAMIC_DRAW);
   gl.vertexAttribPointer(aWorld,4,gl.FLOAT,false,32,0);
   gl.vertexAttribPointer(aTint,4,gl.FLOAT,false,32,16);
   gl.uniform1f(uLine,0);
   gl.drawArrays(gl.POINTS,0,points.length/8);
   gl.disable(gl.BLEND);gl.depthMask(true);
   gl.disableVertexAttribArray(aWorld);gl.disableVertexAttribArray(aTint);
  },
  destroy(){billboards?.destroy();gl.deleteBuffer(buffer);gl.deleteBuffer(lineBuffer);gl.deleteProgram(program)}
 };
}
function drawCanvas(ctx,width,height,ms,intensity,reducedMotion=false){
 if(intensity<=.005)return;
 const starsOnly=makeParticles(ms,intensity,reducedMotion,true);
 const fireworks=worldParticles(ms,intensity,[0,0],reducedMotion,.66);
 ctx.save();ctx.globalCompositeOperation='lighter';
 function paint(x,y,r,col,alpha){
  if(x<-20||y<-20||x>width+20||y>height+20)return;
  ctx.globalAlpha=clamp(alpha);
  ctx.fillStyle='rgb('+Math.round(col[0]*255)+','+Math.round(col[1]*255)+','+Math.round(col[2]*255)+')';
  ctx.beginPath();ctx.arc(x,y,Math.max(.45,r),0,TWO_PI);ctx.fill();
 }
 for(let i=0;i<starsOnly.length;i+=7)
  paint(starsOnly[i]*width,starsOnly[i+1]*height,starsOnly[i+2]*.5,
   [starsOnly[i+3],starsOnly[i+4],starsOnly[i+5]],starsOnly[i+6]);
 for(let i=0;i<fireworks.length;i+=8)
  paint((.50+fireworks[i]*.020)*width,(.88-fireworks[i+1]*.0128)*height,
   fireworks[i+3]*.44,[fireworks[i+4],fireworks[i+5],fireworks[i+6]],fireworks[i+7]);
 ctx.restore();
}
window.KomorebiNightFestival={CYCLE,ROCKET_MS,BURST_MS,stars,eventsAt,fireworkAt,makeParticles,burstLighting,createRenderer,drawCanvas,worldParticles,createWorldRenderer,SHOW_CYCLE,showPattern,spectacleEventsAt,FACE_KINDS,FACE_SHAPES,rareAtCycle};
})();