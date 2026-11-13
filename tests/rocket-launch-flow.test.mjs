import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=f=>readFileSync(resolve(root,f),'utf8');
function boot(){
 const nodes=new Map(),events=new Map(),storage=new Map();
 let now=1000,created=0;
 storage.set('komorebi_island_3d_v01',JSON.stringify({
  version:1,day:4,coins:97,welcomeSeen:true,x:-20,z:-11,
  inventory:{berry:0,wood:0,seed:2},claimed:[false,false,false]
 }));
 const node=id=>{
  if(nodes.has(id))return nodes.get(id);
  const handlers=new Map(),classes=new Set();
  const el={id,hidden:true,disabled:false,textContent:'',style:{},dataset:{},children:[],clientWidth:390,clientHeight:844,
   classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:(k,v)=>{if(v===undefined?!classes.has(k):v){classes.add(k);return true}classes.delete(k);return false}},
   addEventListener:(k,fn)=>handlers.set(k,fn),_handlers:handlers,
   appendChild(child){this.children.push(child);return child},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=[...items]},setAttribute(k,v){this[k]=v},
   focus(){},getContext(type){return type==='2d'?{}:null}};
  nodes.set(id,el);return el;
 };
 const document={readyState:'loading',hidden:false,getElementById:node,activeElement:null,
  addEventListener:(key,fn)=>events.set(key,fn),
  createElement:t=>node('created-'+(++created)+'-'+t),
  querySelectorAll:()=>[],querySelector:()=>node('bottom-ui')};
 const context={window:{devicePixelRatio:1,addEventListener(){}},document,navigator:{},console,
  performance:{now:()=>now},requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 for(const script of ['daynight.js','moko3d.js','expansion3d.js','redevelopment3d.js','sealine3d.js','world-expansion-v23.js','spaceport3d.js','game.js']){
  new Script(file(script),{filename:script}).runInNewContext(context);
 }
 events.get('DOMContentLoaded')();
 const api=context.window.__komorebiTest;
 assert.ok(api);
 return {api,node,storage,time:x=>{now=x;}};
}
test('player beside launch tower sees a rocket launch action instead of generic investigate',()=>{
 const {api,node}=boot();
 api.moveTo(-20,-11);
 assert.equal(api.getNear().id,'spaceport');
 assert.match(node('actionBtn').textContent,/ロケット発射/);
});
test('single action tap counts down and activates the rocket tracking camera',()=>{
 const {api,node,time,storage}=boot();
 api.moveTo(-20,-11);
 const day=api.getState().day,coin=api.getState().coins;
 api.interact();
 assert.equal(api.getSpaceport().phase.active,true);
 assert.equal(api.getSpaceport().phase.countdown,6);
 assert.equal(api.getSpaceport().camera,true);
 assert.match(node('toast').textContent,/6秒/);
 const snapshot=JSON.parse(storage.get('komorebi_island_3d_v01'));
 assert.equal(snapshot.coins,coin);
 assert.equal(snapshot.day,day);
 assert.equal(snapshot.version,1);
 time(4000);
 assert.equal(api.getSpaceport().phase.countdown,3);
 time(9000);
 assert.ok(api.getSpaceport().phase.lift>0);
 api.interact();
 assert.equal(api.getSpaceport().phase.active,true);
 assert.equal(api.getSpaceport().phase.countdown,0,'repeated taps do not reset the launch');
});
test('factory launch from rocket button preserves player position and shows distant rocket',()=>{
 const {api,node,storage,time}=boot();
 api.moveTo(29.4,20.5);
 api.saveNow(); // Persist the visitor's factory location before launching.
 const before=api.getState();
 node('spaceportBtn')._handlers.get('click')();
 const launch=node('panelContent').children.find(c=>String(c.textContent).includes('ここからロケット発射を見る'));
 assert.ok(launch,'rocket menu must offer launch from current location');
 launch._handlers.get('click')();
 const after=api.getState(),space=api.getSpaceport();
 assert.equal(space.phase.active,true);
 assert.equal(space.camera,true);
 assert.equal(space.view,'remote');
 assert.equal(space.origin.x,before.x);
 assert.equal(space.origin.z,before.z);
 assert.equal(after.x,before.x,'must NOT teleport to rocketpad');
 assert.equal(after.z,before.z);
 assert.equal(after.coins,before.coins);
 assert.equal(after.day,before.day);
 const pose=api.getDistantRocketPose(0,.5,{x:before.x,z:before.z});
 assert.ok(pose.eye[0]>before.x&&pose.eye[2]>before.z,'camera stays behind factory visitor');
 assert.ok(pose.fov<50,'distant launch must be framed closer');
 assert.equal(pose.center[0],-24);
 assert.equal(pose.center[2],-13);
 const climbed=api.getDistantRocketPose(55,.5,{x:before.x,z:before.z});
 assert.deepEqual(Array.from(pose.eye),Array.from(climbed.eye),'the factory camera stays put while looking up');
 assert.ok(climbed.center[1]>pose.center[1]);
 time(4000);
 assert.equal(api.getSpaceport().phase.countdown,3);
 const saved=JSON.parse(storage.get('komorebi_island_3d_v01'));
 assert.equal(saved.x,before.x);assert.equal(saved.z,before.z);
});
test('explicit near-pad option still travels to rocket viewing plaza',()=>{
 const {api,node}=boot();
 api.moveTo(29.4,20.5);
 node('spaceportBtn')._handlers.get('click')();
 const local=node('panelContent').children.find(c=>String(c.textContent).includes('発射台の近くで打ち上げを見る'));
 assert.ok(local);
 local._handlers.get('click')();
 assert.equal(api.getSpaceport().view,'pad');
 assert.equal(api.getSpaceport().phase.active,true);
 assert.equal(api.getState().x,-24);
 assert.equal(api.getState().z,-6.5);
});
test('launch from elsewhere on the island does not warp the user either',()=>{
 const {api,node}=boot();
 api.moveTo(0,3);
 node('spaceportBtn')._handlers.get('click')();
 const launch=node('panelContent').children.find(c=>String(c.textContent).includes('ここからロケット発射を見る'));
 launch._handlers.get('click')();
 assert.equal(api.getState().x,0);
 assert.equal(api.getState().z,3);
 assert.equal(api.getSpaceport().view,'remote');
});
test('camera reset can stop tracking without stopping the actual rocket',()=>{
 const {api,node}=boot();api.moveTo(-20,-11);api.interact();
 node('cameraReset')._handlers.get('click')();
 assert.equal(api.getSpaceport().camera,false);
 assert.equal(api.getSpaceport().phase.active,true);
});
test('launch camera is outside west-village house and shows full rocket before takeoff',()=>{
 const {api}=boot(),pose=api.getRocketSpectatorPose(0,.5);
 const pad=api.getSpaceport().pad,eye=pose.eye,center=pose.center;
 // Old camera (-21.3,1.72,-4.2) was inside the western residence.
 const buildingBoxes=[
  {name:'west-village house',xmin:-23.54,xmax:-18.66,zmin:-7.06,zmax:-2.94},
  {name:'control building',xmin:-32.075,xmax:-27.725,zmin:-4.45,zmax:-1.85},
  {name:'rocket hangar',xmin:-34.83,xmax:-29.17,zmin:-9.35,zmax:-4.85},
  {name:'launch service tower',xmin:-21.2,xmax:-19.5,zmin:-15.0,zmax:-13.3}
 ];
 assert.equal(eye[1],1.72,'camera stays at human eye height');
 assert.ok(eye[2]>0,'spectator is safely behind the plaza');
 const inside=(x,z,b)=>x>=b.xmin&&x<=b.xmax&&z>=b.zmin&&z<=b.zmax;
 for(const rect of buildingBoxes){
  for(let k=0;k<=40;k++){
   const t=k/40,x=eye[0]+(pad.x-eye[0])*t,z=eye[2]+(pad.z-eye[2])*t;
   assert.equal(inside(x,z,rect),false,'view ray intersects '+rect.name);
  }
 }
 const direction=center.map((v,i)=>v-eye[i]);
 const angle=point=>{
  const ray=point.map((v,i)=>v-eye[i]);
  const dot=ray.reduce((sum,v,i)=>sum+v*direction[i],0);
  return Math.acos(Math.max(-1,Math.min(1,dot/(Math.hypot(...ray)*Math.hypot(...direction)))))*180/Math.PI;
 };
 assert.ok(angle([pad.x,0,pad.z])<pose.fov/2,'rocket base visible');
 assert.ok(angle([pad.x,14.2,pad.z])<pose.fov/2,'rocket nose visible');
 const later=api.getRocketSpectatorPose(50,.5);
 assert.deepEqual(Array.from(later.eye),Array.from(eye),'camera remains grounded');
 assert.ok(later.center[1]>center[1],'gaze tracks ascending rocket');
});
test('launch viewpoint stays at human eye height while gaze tilts toward the sky',()=>{
 const {api}=boot();
 const start=api.getRocketSpectatorPose(0);
 const rising=api.getRocketSpectatorPose(45);
 const high=api.getRocketSpectatorPose(110);
 assert.deepEqual(Array.from(start.eye),Array.from(rising.eye),'ground camera must not rise with rocket');
 assert.deepEqual(Array.from(rising.eye),Array.from(high.eye),'spectator must remain on the ground');
 assert.equal(start.eye[1],1.72);
 assert.ok(rising.center[1]>start.center[1],'the visitor looks up during ascent');
 assert.ok(high.center[1]<=56,'view should cap its pitch so rocket may fly out of frame');
 assert.ok(high.eye[1]<high.center[1]);
 assert.equal(start.fov,56,'phone uses wide field of view for the launch');
});
test('camera is independent of rocket height, and game save format remains unchanged',()=>{
 const game=file('game.js'),html=file('index.html');
 assert.match(game,/function rocketSpectatorPose\(lift,aspect\)/);
 assert.match(game,/spectator\?spectator\.eye/);
 assert.match(game,/spectator\?spectator\.center/);
 assert.match(game,/function beginRocketLaunch\(\)/);
 assert.match(game,/komorebi_island_3d_v01/);
 assert.match(html,/game\.js\?v=20261113-v3[01234567]/);
 assert.match(html,/spaceport3d\.js\?v=20261113-v3[04]/);
});
