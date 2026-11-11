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
   const points=makeParticles(ms,intensity,reducedMotion);
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

/* True 3D fireworks, visible from ground, tilted camera, and overhead.
 * Positions are world coordinates; hardware depth test hides sparks behind buildings.
 */
function worldParticles(ms,intensity,origin=[5,-3],reducedMotion=false){
 const values=[];
 if(intensity<=.005||reducedMotion)return new Float32Array(0);
 function push(x,y,z,size,color,alpha){
  if(alpha<.015)return;
  values.push(x,y,z,size,color[0],color[1],color[2],clamp(alpha));
 }
 // Two overlapping launch cycles ensure a continuous, legible display.
 for(let slot=Math.floor(ms/2100)-1;slot<=Math.floor(ms/2100);slot++){
  if(slot<0)continue;
  const age=ms-slot*2100;
  if(age<0||age>2850)continue;
  const seed=slot+1;
  const cx=origin[0]+(random(seed*73+3)-.5)*13;
  const cz=origin[1]+(random(seed*47+9)-.5)*10;
  const height=21+random(seed*91+7)*9;
  const tint=palette[seed%palette.length];
  if(age<700){
   const t=age/700;
   const y=1+(height-1)*t*t*(3-2*t);
   push(cx,y,cz,8,[1,1,.9],intensity);
   for(let k=0;k<9;k++)push(cx+(random(seed*11+k)-.5)*.35,y-k*.48,cz,2.7,tint,intensity*(1-k/10));
  }else{
   const t=clamp((age-700)/2150);
   const fade=Math.pow(1-t,1.15)*intensity;
   const spread=(5.2+random(seed*29)*3.5)*Math.pow(t,.55);
   if(t<.13)push(cx,height,cz,15,[1,1,1],fade);
   for(let k=0;k<100;k++){
    const angle=TWO_PI*k/100;
    const vertical=1-2*((k+.5)/100);
    const radial=Math.sqrt(Math.max(0,1-vertical*vertical));
    const spin=angle*1.61803398875*13.0;
    const reach=spread*(.75+random(seed*103+k*13)*.45);
    const x=cx+Math.cos(spin)*radial*reach;
    const z=cz+Math.sin(spin)*radial*reach;
    const y=height+vertical*reach-3.5*t*t;
    push(x,y,z,4.1,k%5===0?[1,1,.92]:tint,fade);
    if(k%2===0)push(cx+(x-cx)*.88,height+(y-height)*.88,z+(cz-z)*.12,2.3,tint,fade*.6);
   }
  }
 }
 return new Float32Array(values);
}
function createWorldRenderer(gl){
 const vertex="attribute vec4 aWorld;attribute vec4 aTint;uniform mat4 uView;uniform mat4 uProj;uniform float uScale;varying vec4 vTint;void main(){vec4 p=uView*vec4(aWorld.xyz,1.0);gl_Position=uProj*p;gl_PointSize=clamp(aWorld.w*uScale*min(1.8,24.0/max(8.0,-p.z)),1.0,36.0);vTint=aTint;}";
 const fragment="precision mediump float;varying vec4 vTint;void main(){float r=length(gl_PointCoord-vec2(.5))*2.0;float core=1.0-smoothstep(.04,.55,r);float halo=1.0-smoothstep(.15,1.0,r);gl_FragColor=vec4(vTint.rgb,vTint.a*(core*.7+halo*.3));}";
 const program=gl.createProgram();
 const vs=createShader(gl,gl.VERTEX_SHADER,vertex),fs=createShader(gl,gl.FRAGMENT_SHADER,fragment);
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('World fireworks link: '+gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer();
 const aWorld=gl.getAttribLocation(program,'aWorld'),aTint=gl.getAttribLocation(program,'aTint');
 const uView=gl.getUniformLocation(program,'uView'),uProj=gl.getUniformLocation(program,'uProj'),uScale=gl.getUniformLocation(program,'uScale');
 return {
  draw(ms,intensity,origin,view,proj,pixelRatio,reducedMotion=false){
   const points=worldParticles(ms,intensity,origin,reducedMotion);
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
  destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program);}
 };
}
window.KomorebiNightFestival={CYCLE,ROCKET_MS,BURST_MS,stars,eventsAt,fireworkAt,makeParticles,burstLighting,createRenderer,drawCanvas,worldParticles,createWorldRenderer};
})();