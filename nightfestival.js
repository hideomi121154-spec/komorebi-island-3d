/* Komorebi Island — procedural night festival effects.
 * Draws BEHIND opaque 3D geometry, not on top of buildings or HUD.
 * WebGL1 point sprites + Canvas2D fallback. No textures, external assets, or save changes.
 */
(() => {
'use strict';
const TWO_PI=Math.PI*2;
const CYCLE=1600;
const ROCKET_MS=850;
const BURST_MS=2400;
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
 for(let i=slot-2;i<=slot;i++){
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
function makeParticles(ms,intensity,reducedMotion=false){
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
 if(reducedMotion)return new Float32Array(result);
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
// 3D fireworks use world coordinates. Unlike screen-fixed particles, they move
// correctly as the player rotates, zooms and looks vertically overhead.
function makeWorldParticles(ms,intensity,anchor={x:0,z:0},eye=[0,2,0],reducedMotion=false){
 if(intensity<=.005)return new Float32Array(0);
 const points=[];
 function add(x,y,z,size,rgb,alpha){
  if(![x,y,z,size,alpha].every(Number.isFinite)||alpha<.012)return;
  points.push(x,y,z,size,rgb[0],rgb[1],rgb[2],clamp(alpha));
 }
 for(const star of stars){
  const theta=star.x*TWO_PI;
  const elev=.13+star.y/.565*1.37;
  const radius=128;
  const horizontal=Math.cos(elev)*radius;
  const twinkle=reducedMotion?.82:(.73+.27*Math.sin(ms*.0015+star.phase*2));
  add(eye[0]+Math.cos(theta)*horizontal,eye[1]+Math.sin(elev)*radius,
      eye[2]+Math.sin(theta)*horizontal,star.radius*1.55,star.tint,twinkle*intensity*.90);
 }
 if(reducedMotion)return new Float32Array(points);
 for(const e of eventsAt(ms)){
  const tx=anchor.x+(e.x-.5)*39;
  const tz=anchor.z+(random(e.index*101+421)-.5)*29;
  const ty=24+random(e.index*239+92)*11;
  if(e.age<ROCKET_MS){
   const t=clamp(e.age/ROCKET_MS);
   const head=1.5+(ty-1.5)*t*t*(3-2*t);
   for(let j=0;j<13;j++){
    const fade=j/13;
    const py=head-fade*7;
    if(py<0)continue;
    add(tx+.14*Math.sin(j+e.index),py,tz+.15*Math.cos(j*2+e.index),
        2.1+2*(1-fade),e.color,(1-fade)*intensity);
   }
   add(tx,head,tz,7.0,[1,1,.85],intensity);
  }else{
   const age=e.age-ROCKET_MS;
   const t=clamp(age/BURST_MS);
   const grow=Math.pow(t,.60);
   const fade=Math.pow(1-t,1.06)*intensity;
   const spread=(8.6+e.spread*42)*grow;
   const gravity=5.5*t*t;
   if(t<.15)add(tx,ty,tz,12.0,[1,1,.91],fade*(1-t/.15));
   for(let spoke=0;spoke<76;spoke++){
    const phi=TWO_PI*spoke/76+e.index*.39;
    const elev=(random(spoke*147+e.index*83)-.5)*1.24;
    const wobble=.18*Math.sin(spoke*1.7+e.index);
    const dist=spread*(.76+random(e.index*239+spoke*29)*.40);
    for(let trail=0;trail<3;trail++){
     const r=dist*(1-trail*.12);
     const co=Math.cos(elev+wobble*t);
     add(tx+Math.cos(phi)*co*r,
         ty+Math.sin(elev+wobble*t)*r-gravity*(.7+random(spoke+29)),
         tz+Math.sin(phi)*co*r,trail?2.3:3.7,
         trail===0?[1,1,.85]:e.color,fade*(1-trail*.22));
    }
   }
  }
 }
 return new Float32Array(points);
}
function createRenderer(gl){
 const vertex="attribute vec4 aWorld;attribute vec4 aTint;uniform mat4 uView;uniform mat4 uProjection;uniform float uScale;varying vec4 vTint;void main(){vec4 p=uView*vec4(aWorld.xyz,1.0);gl_Position=uProjection*p;gl_PointSize=clamp(aWorld.w*uScale*(47.0/max(12.0,-p.z)),1.0,42.0);vTint=aTint;}";
 const fragment="precision mediump float;varying vec4 vTint;void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;float halo=1.0-smoothstep(.03,1.0,d);float core=1.0-smoothstep(.0,.34,d);gl_FragColor=vec4(vTint.rgb,vTint.a*(halo*.60+core*.40));}";
 const program=gl.createProgram();
 const vs=createShader(gl,gl.VERTEX_SHADER,vertex),fs=createShader(gl,gl.FRAGMENT_SHADER,fragment);
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Festival linking: '+gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer();
 const aWorld=gl.getAttribLocation(program,'aWorld'),aTint=gl.getAttribLocation(program,'aTint');
 const uView=gl.getUniformLocation(program,'uView'),uProjection=gl.getUniformLocation(program,'uProjection');
 const uScale=gl.getUniformLocation(program,'uScale');
 return {
  draw(ms,intensity,pixelRatio,reducedMotion=false,view,projection,anchor,eye){
   if(intensity<=.005||!view||!projection||!eye)return;
   const points=makeWorldParticles(ms,intensity,anchor,eye,reducedMotion);
   if(!points.length)return;
   gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,points,gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(aWorld);
   gl.vertexAttribPointer(aWorld,4,gl.FLOAT,false,32,0);
   gl.enableVertexAttribArray(aTint);
   gl.vertexAttribPointer(aTint,4,gl.FLOAT,false,32,16);
   gl.uniformMatrix4fv(uView,false,view);
   gl.uniformMatrix4fv(uProjection,false,projection);
   gl.uniform1f(uScale,Math.max(1,pixelRatio||1));
   // Draw after the opaque 3D world with depth testing, so near
   // fireworks remain visible above water and roofs hide distant sparks.
   gl.enable(gl.DEPTH_TEST);gl.depthMask(false);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
   gl.drawArrays(gl.POINTS,0,points.length/8);
   gl.disable(gl.BLEND);gl.depthMask(true);
   gl.disableVertexAttribArray(aWorld);gl.disableVertexAttribArray(aTint);
  },
  destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program);}
 };
}
function drawCanvas(ctx,width,height,ms,intensity,reducedMotion=false){
 if(intensity<=.005)return;
 const particles=makeParticles(ms,intensity,reducedMotion);
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=0;i<particles.length;i+=7){
  const x=particles[i]*width,y=particles[i+1]*height;
  const radius=particles[i+2]*.5;
  const r=Math.round(particles[i+3]*255),g=Math.round(particles[i+4]*255),b=Math.round(particles[i+5]*255);
  ctx.globalAlpha=particles[i+6];
  ctx.fillStyle='rgb('+r+','+g+','+b+')';
  ctx.beginPath();ctx.arc(x,y,Math.max(.55,radius),0,TWO_PI);ctx.fill();
 }
 ctx.restore();
}
// Explicit emissive panels: RGB above 1.0 is reserved for warm night windows
// and is interpreted as self-illumination by the island's 3D shader.
function drawWorldLights(builder,ms,intensity){
 if(intensity<.02)return 0;
 let count=0;
 const pulse=.96+.04*Math.sin(ms*.0013);
 function panel(x,y,z,w,h,seed){
  if(random(seed*17+13)<.12)return;
  const flicker=.78+.22*random(seed*37+7);
  const emission=clamp(intensity*pulse*flicker);
  const color=[1+emission*1.08,1+emission*.87,1+emission*.36];
  builder.quad([x-w/2,y-h/2,z],[x+w/2,y-h/2,z],
   [x+w/2,y+h/2,z],[x-w/2,y+h/2,z],color);count++;
 }
 // Home, shop — keep the original daylight windows and save objects untouched.
 for(let side of [-1,1]){
  panel(-6+side*1.22,1.20,-3.07,.43,.43,100+side);
  panel(6+side*1.45,1.20,-3.02,.43,.43,110+side);
 }
 // Apartments by the redevelopment district.
 for(let floor=0;floor<4;floor++)for(let col=0;col<3;col++)
  panel(7.95+(col-1)*.78,.86+floor*1.05,-11.23,.43,.52,210+floor*3+col);
 for(let floor=0;floor<3;floor++)for(let side of [-1,1])
  panel(3.2+side*.62,.70+floor*1.06,-11.60,.44,.45,310+floor*3+side);
 // Commercial island hotel, shopping mall and offices.
 for(let floor=0;floor<4;floor++)for(let col=0;col<3;col++)
  panel(51.6+(col-1)*1.05,.92+floor*1.11,-8.28,.35,.44,400+floor*3+col);
 for(let col=0;col<6;col++)
  panel(52.3-2.2+col*.88,1.28,-2.25,.44,1.22,500+col);
 for(let floor=0;floor<6;floor++)for(let col=0;col<3;col++)
  panel(58.3+(col-1)*.86,1.03+floor*.83,-6.39,.71,.47,600+floor*3+col);
 // A few station / boardwalk lanterns provide points of warm local interest.
 const light=[1+intensity*1.04,1+intensity*.86,1+intensity*.55];
 for(const [x,y,z] of [[-2.7,1.35,-2.8],[2.7,1.35,-2.8],
  [16.2,1.5,-1.7],[47.2,1.55,-1.1],[51.2,1.55,.30],[55.6,1.5,-2.7]]){
  builder.box(x,y,z,.20,.22,.20,light);count++;
 }
 return count;
}
window.KomorebiNightFestival={CYCLE,ROCKET_MS,BURST_MS,stars,eventsAt,fireworkAt,makeParticles,makeWorldParticles,burstLighting,createRenderer,drawCanvas,drawWorldLights};
})();