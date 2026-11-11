/* Lightweight WebGL1 sky gradient for dawn, daytime, dusk and night.
 * Kept separate from opaque world meshes; no external textures or dependencies. */
(() => {
'use strict';
function createRenderer(gl){
 const vert="attribute vec2 aClip;varying vec2 vUV;void main(){vUV=aClip*.5+vec2(.5);gl_Position=vec4(aClip,0.999,1.0);}";
 const frag="precision mediump float;varying vec2 vUV;uniform vec3 uTop;uniform vec3 uHorizon;void main(){float h=1.0-vUV.y;float t=smoothstep(0.10,0.90,h);vec3 c=mix(uTop,uHorizon,t);gl_FragColor=vec4(c,1.0);}";
 function shader(type,source){
  const sh=gl.createShader(type);
  gl.shaderSource(sh,source);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw Error('Sky shader: '+error)}
  return sh;
 }
 const program=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,vert),fs=shader(gl.FRAGMENT_SHADER,frag);
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Sky program: '+gl.getProgramInfoLog(program));
 const attr=gl.getAttribLocation(program,'aClip');
 const top=gl.getUniformLocation(program,'uTop'),horizon=gl.getUniformLocation(program,'uHorizon');
 const buffer=gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 return {
  draw(topColor,horizonColor){
   gl.useProgram(program);
   gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
   gl.disable(gl.BLEND);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.enableVertexAttribArray(attr);
   gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
   gl.uniform3fv(top,topColor);gl.uniform3fv(horizon,horizonColor);
   gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
   gl.disableVertexAttribArray(attr);
   gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
  },
  destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program);}
 };
}
window.KomorebiSky={createRenderer};
})();
