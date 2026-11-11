import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=(name)=>readFileSync(resolve(root,name),'utf8');

function palette(){
 const context={window:{}};
 new Script(file('daynight.js')).runInNewContext(context);
 return context.window.KomorebiTime;
}
test('05:59 dawn stays blue overhead while the horizon warms',()=>{
 const t=palette();
 const at559=t.paletteAt(5*60+59);
 assert.ok(at559.top[2]>at559.top[0],'zenith must be blue, not salmon');
 assert.ok(at559.horizon[0]>at559.top[0],'warm glow should be at the horizon');
 assert.ok(at559.darkness>.35,'November dawn should not be broad daylight');
 const at600=t.paletteAt(360);
 for(const key of ['top','horizon'])for(let i=0;i<3;i++){
  assert.ok(Math.abs(at559[key][i]-at600[key][i])<.018,'sunrise must not jump abruptly');
 }
});

test('Morning becomes clearer by 08:00 without evening-like full red sky',()=>{
 const t=palette(),dawn=t.paletteAt(360),early=t.paletteAt(385),day=t.paletteAt(480);
 assert.ok(dawn.top[2]>dawn.top[0]);
 assert.ok(early.top[2]>early.top[0]);
 assert.ok(day.top[2]>day.top[0]);
 assert.ok(dawn.darkness>early.darkness&&early.darkness>day.darkness);
 assert.ok(t.paletteAt(1110).top[0]>t.paletteAt(1110).top[2],'sunset remains warm');
});

test('GPU scene actually paints the sky gradient before fireworks and island',()=>{
 const html=file('index.html');
 const game=file('game.js');
 assert.ok(html.indexOf('src="sky-gradient.js')>0);
 assert.ok(html.indexOf('src="sky-gradient.js')<html.indexOf('src="game.js'));
 assert.match(game,/skyRenderer\.draw\(lighting\.top,lighting\.horizon\)/);
 assert.ok(game.indexOf('skyRenderer.draw(lighting.top,lighting.horizon)')<game.indexOf('festivalRenderer.draw(now,fireworksIntensity'));
 assert.doesNotThrow(()=>new Script(file('sky-gradient.js')));
});

test('Gradient renderer draws across the screen and restores depth state',()=>{
 const calls=[];
 const gl={
  VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,
  STATIC_DRAW:6,FLOAT:7,DEPTH_TEST:8,BLEND:9,TRIANGLE_STRIP:10,
  createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,
  createProgram:()=>({}),attachShader(){},linkProgram(){},deleteShader(){},
  getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:(_,key)=>key,
  createBuffer:()=>({}),bindBuffer(){},bufferData(){},useProgram(){},
  disable:(id)=>calls.push(['disable',id]),enable:(id)=>calls.push(['enable',id]),
  depthMask:(v)=>calls.push(['depthMask',v]),enableVertexAttribArray(){},
  vertexAttribPointer(){},uniform3fv:(loc,value)=>calls.push([loc,value]),
  drawArrays:(type,first,count)=>calls.push(['draw',type,count]),
  disableVertexAttribArray(){}
 };
 const context={window:{}};
 new Script(file('sky-gradient.js')).runInNewContext(context);
 const renderer=context.window.KomorebiSky.createRenderer(gl);
 renderer.draw([.2,.3,.5],[.9,.7,.6]);
 assert.ok(calls.some(x=>x[0]==='uTop'));
 assert.ok(calls.some(x=>x[0]==='uHorizon'));
 assert.ok(calls.some(x=>x[0]==='draw'&&x[1]===gl.TRIANGLE_STRIP&&x[2]===4));
 assert.deepEqual(calls.at(-2),['depthMask',true]);
 assert.deepEqual(calls.at(-1),['enable',gl.DEPTH_TEST]);
});
