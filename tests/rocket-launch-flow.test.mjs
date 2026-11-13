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
test('right-side rocket menu can still teleport to pad and start a launch',()=>{
 const {api,node}=boot();
 api.moveTo(0,3);
 node('spaceportBtn')._handlers.get('click')();
 const launch=node('panelContent').children.find(c=>String(c.textContent).includes('カウントダウン・発射'));
 assert.ok(launch,'rocket launch action must remain accessible from right-hand menu');
 launch._handlers.get('click')();
 assert.equal(api.getSpaceport().phase.active,true);
 assert.equal(api.getSpaceport().camera,true);
 assert.equal(api.getState().x,-24);
 assert.equal(api.getState().z,-6.5);
});
test('camera reset can stop tracking without stopping the actual rocket',()=>{
 const {api,node}=boot();api.moveTo(-20,-11);api.interact();
 node('cameraReset')._handlers.get('click')();
 assert.equal(api.getSpaceport().camera,false);
 assert.equal(api.getSpaceport().phase.active,true);
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
 assert.match(html,/game\.js\?v=20261113-v30/);
 assert.match(html,/spaceport3d\.js\?v=20261113-v30/);
});
