import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function load(file,key){
 const window={};
 const source=readFileSync(resolve(root,file),'utf8');
 new Script(source,{filename:file}).runInNewContext({window,URLSearchParams});
 assert.ok(window[key]);return window[key];
}
const Camera=load('camera3d.js','KomorebiCamera3D');
const Festival=load('nightfestival.js','KomorebiNightFestival');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const game=readFileSync(resolve(root,'game.js'),'utf8');

test('Sky mode is accessible by a button and camera is loaded before the game',()=>{
 assert.match(html,/id="skyViewBtn"/);
 assert.match(html,/aria-pressed="false"/);
 assert.ok(html.indexOf('camera3d.js')<html.indexOf('game.js'));
 assert.match(game,/toggleSkyCamera\(/);
 assert.match(game,/CAMERA\.calculate\(/);
 assert.match(game,/CAMERA\.fov\(/);
});

test('Touch gestures support vertical looking and bounded pinch / wheel zoom',()=>{
 const camera=Camera.create();
 assert.equal(camera.snapshot().sky,false);
 assert.equal(camera.zoomTo(20),2.6);
 assert.equal(camera.zoomTo(.0001),.48);
 camera.reset();
 camera.zoomBy(1.6);
 assert.ok(camera.snapshot().zoom>1.5);
 camera.lookBy(-240);
 assert.equal(camera.snapshot().sky,true,'upward finger swipe should enter sky mode');
 assert.ok(camera.snapshot().pitch>0);
 camera.skyView(false);
 assert.equal(camera.snapshot().sky,false);
 assert.equal(camera.snapshot().zoom,1);
 const p=camera.calculate([0,30,40],[0,0,0],{x:1,z:2},.2);
 assert.ok(p.eye.every(Number.isFinite));
 camera.skyView(true);
 const sky=camera.calculate([0,30,40],[0,0,0],{x:1,z:2},0);
 assert.equal(sky.eye[1],1.85);
 assert.ok(sky.center[1]>sky.eye[1]+25,'camera should face nearly straight up');
 assert.ok(camera.fov(54)>54);
});

test('Real 3D fireworks exist around the island, not screen-fixed pixels',()=>{
 const oldScreen=Festival.makeParticles(1250,1);
 const world=Festival.makeWorldParticles(1250,1,{x:5,z:-3},[0,1.85,0]);
 assert.ok(world.length/8>250);
 assert.notEqual(world.length/8,oldScreen.length/7);
 assert.equal(world.length%8,0);
 assert.equal(Festival.makeWorldParticles(1250,0,{x:5,z:-3},[0,1.85,0]).length,0);
 let countAlit=0;
 for(let i=0;i<world.length;i+=8){
  const vertex=Array.from(world.slice(i,i+8));
  assert.ok(vertex.every(Number.isFinite));
  assert.ok(vertex[7]>=0&&vertex[7]<=1);
  if(vertex[1]>12&&vertex[1]<65)countAlit++;
 }
 assert.ok(countAlit>100,'multiple fireworks should burst over the town');
 const reduced=Festival.makeWorldParticles(1250,1,{x:5,z:-3},[0,1.85,0],true);
 assert.equal(reduced.length/8,Festival.stars.length);
});

test('Shows ongoing fireworks immediately rather than waiting for the first launch',()=>{
 const events=Festival.eventsAt(0);
 assert.ok(events.some(e=>e.age>Festival.ROCKET_MS&&e.age<Festival.ROCKET_MS+Festival.BURST_MS));
 assert.ok(Festival.burstLighting(0,1).strength>0);
});

test('Emissive windows and independent camera controls are linked but do not change save schema',()=>{
 assert.match(game,/drawWorldLights\?/);
 assert.match(game,/vEmission/);
 assert.match(game,/vSea/);
 assert.match(game,/uWaterTime/);
 assert.match(game,/canvas\.addEventListener\('wheel'/);
 assert.match(game,/pointerDistance/);
 assert.match(game,/getCamera/);
 assert.doesNotMatch(game,/state\.zoom=|state\.sky=/);
});
