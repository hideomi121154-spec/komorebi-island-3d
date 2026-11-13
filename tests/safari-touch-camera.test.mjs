import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const code=readFileSync(resolve(root,'camera-gestures.js'),'utf8');
function setup(nativeTouch=false){
 const events=new Map(),windowEvents=new Map(),state={yaw:0,pitch:0,zoom:1},pans=[],activity=[];
 const canvas={
  addEventListener:(name,fn)=>events.set(name,fn),
  setPointerCapture(){},style:{}
 };
 const window={
  addEventListener:(name,fn)=>windowEvents.set(name,fn),
  ...(nativeTouch?{TouchEvent:class TouchEvent{}}:{})
 };
 new Script(code).runInNewContext({window,console});
 const controller=window.KomorebiCameraGestures.create(canvas,{
  get:()=>({...state}),
  set:next=>Object.assign(state,next),
  onPan:(dx,dy)=>pans.push({dx,dy}),
  onGesture:active=>activity.push(active),
  enabled:()=>true
 });
 const event=(name,p)=>{const ev={cancelable:true,preventDefault(){this.prevented=true},...p};events.get(name)(ev);return ev};
 return {state,pans,activity,controller,event,windowEvents};
}
const touch=(identifier,x,y)=>({identifier,clientX:x,clientY:y});
test('iOS one finger moves camera without page scrolling or accidental double events',()=>{
 const {state,event,controller,activity}=setup(true);
 const e=event('touchstart',{touches:[touch(1,40,100)]});
 assert.equal(e.prevented,true);
 event('pointerdown',{pointerId:1,pointerType:'touch',clientX:40,clientY:100});
 event('touchmove',{touches:[touch(1,140,70)]});
 assert.ok(Math.abs(state.yaw-1)<1e-8);
 assert.ok(Math.abs(state.pitch-(-.255))<1e-8);
 assert.equal(controller.activePointers(),1);
 event('touchend',{touches:[]});
 assert.equal(controller.isActive(),false);
 assert.deepEqual(Array.from(activity),[true,false]);
});
test('iOS two-finger gesture both pinches and moves the scenery, then returns to orbit with no jump',()=>{
 const {state,event,pans,controller}=setup(true);
 event('touchstart',{touches:[touch(1,100,100)]});
 event('touchmove',{touches:[touch(1,140,100)]});
 const heading=state.yaw;
 event('touchstart',{touches:[touch(1,140,100),touch(2,240,100)]});
 event('touchmove',{touches:[touch(1,140,100),touch(2,300,100)]});
 assert.ok(state.zoom<1,'spreading fingers should zoom closer');
 assert.ok(pans.length>0&&pans.some(p=>p.dx>0),'two-finger drag must pan the view');
 const before=state.yaw;
 event('touchend',{touches:[touch(1,140,100)]});
 assert.equal(state.yaw,before,'lifting a finger cannot rotate the camera');
 event('touchmove',{touches:[touch(1,160,100)]});
 assert.ok(Math.abs(state.yaw-before-.2)<1e-8,'remaining finger seamlessly continues orbit');
 assert.equal(controller.activePointers(),1);
 event('touchend',{touches:[]});
 assert.equal(controller.isActive(),false);
 assert.ok(heading>0);
});
test('pointer mouse/pen gestures work in desktop WebGL, cancel clears active state',()=>{
 const {event,state,controller}=setup(false);
 event('pointerdown',{pointerId:3,pointerType:'mouse',clientX:100,clientY:100});
 event('pointermove',{pointerId:3,pointerType:'mouse',clientX:220,clientY:100});
 assert.ok(Math.abs(state.yaw-1.2)<1e-8);
 event('pointercancel',{pointerId:3,pointerType:'mouse'});
 assert.equal(controller.activePointers(),0);
 const initial=state.zoom;
 event('wheel',{deltaY:-300});
 assert.ok(state.zoom<initial);
});
test('touch cancellation and blur restore gesture state without spurious input',()=>{
 const {event,controller,windowEvents}=setup(true);
 event('touchstart',{touches:[touch(1,10,20)]});
 event('touchcancel',{touches:[]});
 assert.equal(controller.isActive(),false);
 event('touchstart',{touches:[touch(2,10,20)]});
 windowEvents.get('blur')();
 assert.equal(controller.isActive(),false);
});
test('script loading order and cache identity guarantee Safari gets the new gesture implementation',()=>{
 const html=readFileSync(resolve(root,'index.html'),'utf8');
 const game=readFileSync(resolve(root,'game.js'),'utf8');
 assert.ok(html.indexOf('src="camera-gestures.js')>html.indexOf('src="render-quality.js'));
 assert.ok(html.indexOf('src="camera-gestures.js')<html.indexOf('src="game.js'));
 assert.match(html,/camera-gestures\.js\?v=20261113-v32/);
 assert.match(game,/const cameraPan=\{x:0,z:0\}/);
 assert.match(game,/getTouchCamera:/);
 assert.match(game,/komorebi_island_3d_v01/);
});
