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
function burstLighting(ms,intensity){
 if(intensity<=.02)return {strength:0,color:[1,.8,.5]};
 let strongest=0,tint=[1,.8,.5];
 for(const e of eventsAt(ms)){
  const age=e.age-ROCKET_MS;
  if(age>=0&&age<BURST_MS){
   const glow=Math.pow(1-age/BURST_MS,2.2);
   if(glow>strongest){strongest=glow;tint=e.color;}
  }
 }
 return {strength:Math.min(.20,strongest*.18*intensity),color:tint};
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
 // Burst delay, x offset, height, depth offset, radius, RGB, spokes, lifetime, behavior.
 {at:140,x:0,y:31,z:-3,r:12.3,color:[1,.72,.31],rays:248,life:5450,kind:'gold'},
 {at:500,x:2.0,y:18,z:2,r:8.6,color:[1,.23,.32],rays:185,life:4520,kind:'red'},
 {at:760,x:-8.3,y:20,z:0,r:4.0,color:[1,.30,.72],rays:83,life:3600,kind:'pink'},
 {at:970,x:-5.7,y:17,z:-2,r:3.4,color:[.38,1,.63],rays:70,life:3420,kind:'green'},
 {at:1250,x:-10.0,y:15,z:1,r:3.9,color:[1,.40,.67],rays:76,life:3670,kind:'pink'},
 {at:590,x:9.2,y:21,z:-4,r:4.6,color:[.42,1,.67],rays:86,life:3900,kind:'green'},
 {at:1780,x:10.8,y:19,z:1,r:5.1,color:[1,.64,.32],rays:93,life:4150,kind:'gold'},
 {at:2050,x:-3.9,y:23,z:3,r:3.5,color:[1,.32,.71],rays:78,life:3320,kind:'pink'},
 {at:2540,x:6.7,y:14,z:-1,r:3.6,color:[.35,.94,1],rays:73,life:3200,kind:'green'},
 {at:3030,x:-8.8,y:23,z:-4,r:4.4,color:[1,.75,.38],rays:82,life:3630,kind:'gold'}
];
const showPalette={gold:[1,.72,.31],red:[1,.23,.32],pink:[1,.30,.72],green:[.38,1,.63]};
function spectacleEventsAt(ms){
 const t=Math.max(0,ms),phase=t%SHOW_CYCLE;
 return showPattern.filter(s=>phase>=s.at-580&&phase<s.at+s.life)
   .map(s=>({spec:s,age:phase-s.at}));
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
function worldParticles(ms,intensity,origin=[5,-3],reducedMotion=false,detail=1){
 if(intensity<=.005||reducedMotion)return new Float32Array(0);
 const output=[],active=spectacleEventsAt(ms);
 const density=clamp(detail,.45,1);
 const maxPoints=Math.ceil(11000*density);
 function add(x,y,z,size,col,alpha){
  if(alpha<.025||output.length>=maxPoints*8)return;
  output.push(x,y,z,size,col[0],col[1],col[2],clamp(alpha));
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
    add(centerX+.19*Math.sin(seed+i*1.5+t*3),head-dy,centerZ,
      i===0?13:4.0,i%4===0?[1,1,.96]:[1,.72,.35],a);
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
  const trails=spec.kind==='gold'?9:7;
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
   for(let k=0;k<trails;k++){
    const relative=1-k*(spec.kind==='gold'?.071:.078);
    const x=centerX+ux*radius*relative;
    const z=centerZ+uz*radius*relative;
    const gravity=fall*(1+(1-relative)*.36);
    const y=spec.y+uy*radius*relative-gravity;
    const twinkle=(k===0?flicker:1)*(.98-k*.078);
    const white=k===0||j%17===0&&k<2;
    const color=white?[1,1,.87]:spec.color;
    const pointSize=k===0?(spec.kind==='gold'?8.8:8.3):spec.kind==='gold'?4.4:4.0;
    add(x,y,z,pointSize,color,fade*twinkle);
   }
   // Glitter falls slightly behind the long golden willow tips.
   if(spec.kind==='gold'&&j%3===0){
    const a=.54+.32*random(j*31+seed);
    add(centerX+ux*radius*a,spec.y+uy*radius*a-fall-1.4*t,centerZ+uz*radius*a,
      3.0,[1,.87,.54],fade*(.50+.3*random(j*47)));
   }
  }
 }
 // Two near-white launch fountains continuously spray from the shore.
 // The spark jets are staggered so the lower scene never looks static.
 const phase=Math.max(0,ms)*.001;
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
 return new Float32Array(output);
}
function createWorldRenderer(gl){
 const vertex="attribute vec4 aWorld;attribute vec4 aTint;uniform mat4 uView;uniform mat4 uProj;uniform float uScale;varying vec4 vTint;void main(){vec4 p=uView*vec4(aWorld.xyz,1.0);gl_Position=uProj*p;float d=max(8.0,-p.z);gl_PointSize=clamp(aWorld.w*uScale*min(2.0,28.0/d),1.5,42.0);vTint=aTint;}";
 const fragment="precision mediump float;varying vec4 vTint;void main(){float r=length(gl_PointCoord-vec2(.5))*2.0;float halo=pow(max(0.0,1.0-r),2.1);float core=1.0-smoothstep(.02,.36,r);float a=(.34*halo+.96*core)*vTint.a;gl_FragColor=vec4(vTint.rgb*(.80+.27*core),a);}";
 const program=gl.createProgram();
 const vs=createShader(gl,gl.VERTEX_SHADER,vertex),fs=createShader(gl,gl.FRAGMENT_SHADER,fragment);
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Festival spectacle link: '+gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer(),aWorld=gl.getAttribLocation(program,'aWorld'),aTint=gl.getAttribLocation(program,'aTint');
 const uView=gl.getUniformLocation(program,'uView'),uProj=gl.getUniformLocation(program,'uProj'),uScale=gl.getUniformLocation(program,'uScale');
 return {
  draw(ms,intensity,origin,view,proj,pixelRatio,reducedMotion=false){
   const detail=(pixelRatio||1)<1.35?.66:1;
   const points=worldParticles(ms,intensity,origin,reducedMotion,detail);
   if(!points.length)return;
   gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,points,gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(aWorld);gl.vertexAttribPointer(aWorld,4,gl.FLOAT,false,32,0);
   gl.enableVertexAttribArray(aTint);gl.vertexAttribPointer(aTint,4,gl.FLOAT,false,32,16);
   gl.uniformMatrix4fv(uView,false,view);gl.uniformMatrix4fv(uProj,false,proj);
   gl.uniform1f(uScale,Math.max(1,pixelRatio||1));
   gl.enable(gl.DEPTH_TEST);gl.depthMask(false);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
   gl.drawArrays(gl.POINTS,0,points.length/8);
   gl.disable(gl.BLEND);gl.depthMask(true);
   gl.disableVertexAttribArray(aWorld);gl.disableVertexAttribArray(aTint);
  },
  destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program)}
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
window.KomorebiNightFestival={CYCLE,ROCKET_MS,BURST_MS,stars,eventsAt,fireworkAt,makeParticles,burstLighting,createRenderer,drawCanvas,worldParticles,createWorldRenderer,SHOW_CYCLE,showPattern,spectacleEventsAt};
})();