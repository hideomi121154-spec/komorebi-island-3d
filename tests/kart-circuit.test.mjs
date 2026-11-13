import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../kart3d.js',import.meta.url),'utf8');
function makeKart(){
 const elements=new Map();
 const el=(id)=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',classList:{add(){},remove(){}},addEventListener(){}});return elements.get(id)};
 const E={canWalk:(x,z)=>Math.hypot(x,z)<15};
 const window={KomorebiExpansion:E,addEventListener(){}};
 const context={window,document:{getElementById:el},performance:{now:()=>100},Math,Date};
 vm.runInNewContext(source,context,{filename:'kart3d.js'});
 return {kart:window.KomorebiKart,E,el};
}
test('cart circuit is created on a connected island without taking over prior walking rules',()=>{
 const {kart,E}=makeKart();
 assert.equal(kart.LAPS,3);
 assert.equal(kart.places[0].id,'kartTrack');
 assert.ok(kart.length>80);
 assert.equal(E.canWalk(0,0),true);
 assert.equal(E.canWalk(44,58),true);
 assert.equal(E.canWalk(200,200),false);
});
test('procedural 3D circuit, road, grandstand and moving karts emit geometry',()=>{
 const {kart}=makeKart();
 let count=0;
 const b={ellipseDisc(){count++},quad(){count++},box(){count++},cylinder(){count++},sphere(){count++},setTransform(){},clearTransform(){}};
 kart.drawTerrain(b);kart.drawStatic(b);
 assert.ok(count>500);
 const before=count;
 kart.start();kart.drawDynamic(b);
 assert.ok(count>before+60,'8 karts should all be drawn');
 assert.equal(kart.getState().opponents.length,7);
 kart.stop();
});
test('kart steering, throttle and boost controls work and game exits safely',()=>{
 const {kart,el}=makeKart();
 assert.equal(kart.keyInput('KeyW',true),true);
 assert.equal(kart.keyInput('KeyX',true),false);
 kart.start();
 assert.equal(kart.active(),true);
 assert.equal(el('kartHud').hidden,false);
 kart.keyInput('ArrowUp',true);
 kart.keyInput('ArrowRight',true);
 let first=kart.getState().player;
 for(let i=0;i<360;i++)kart.step(1/60);
 const after=kart.getState();
 assert.ok(after.elapsed>0);
 assert.ok(after.player.speed>0);
 assert.ok(Math.hypot(after.player.x-first.x,after.player.z-first.z)>0.2);
 assert.equal(after.opponents.length,7);
 assert.ok(after.opponents.every(a=>a.distance>0 || a.speed>0));
 assert.ok(after.place>=1&&after.place<=8);
 kart.stop();
 assert.equal(kart.active(),false);
 assert.equal(el('kartHud').hidden,true);
});
test('lap routing is periodic and closest road projection returns a finite location',()=>{
 const {kart}=makeKart();
 const a=kart.at(13),b=kart.at(kart.length+13);
 assert.ok(Math.abs(a.x-b.x)<1e-6);
 assert.ok(Math.abs(a.z-b.z)<1e-6);
 const closest=kart.roadNearest(a.x,a.z);
 assert.ok(closest.offset<.05);
 assert.ok(Number.isFinite(closest.distance));
});

test('right touch steering turns right on screen from the follow camera; left turns left',()=>{
 function drive(direction){
  const {kart}=makeKart();kart.start();
  for(let i=0;i<205;i++)kart.step(1/60);
  const from=kart.getState().player;
  kart.setInput(direction,true);
  for(let i=0;i<36;i++)kart.step(1/60);
  const to=kart.getState().player;
  // Camera-right is -cos(yaw) in X and +sin(yaw) in Z.
  const screenRight=-(to.x-from.x)*Math.cos(from.yaw)+(to.z-from.z)*Math.sin(from.yaw);
  kart.stop();return screenRight;
 }
 assert.ok(drive('right')>.1,'right button must move toward screen-right');
 assert.ok(drive('left')<-.1,'left button must move toward screen-left');
});
test('auto acceleration is ON by default and can be switched to manual',()=>{
 const {kart,el}=makeKart();kart.start();
 assert.equal(kart.getState().autoDrive,true);
 assert.equal(el('kartAutoToggle').textContent,'🚗 オート加速 ON');
 for(let i=0;i<250;i++)kart.step(1/60);
 assert.ok(kart.getState().player.speed>1,'hands-free auto acceleration');
 assert.equal(kart.toggleAuto(),false);
 assert.equal(el('kartAutoToggle').textContent,'🎮 手動加速');
 assert.equal(kart.toggleAuto(),true);
 kart.stop();
});
test('braking in place cannot advance race laps or trigger a false finish',()=>{
 const {kart}=makeKart();kart.start();kart.setInput('brake',true);
 for(let i=0;i<1000;i++)kart.step(1/60);
 const state=kart.getState();
 assert.equal(state.player.speed,0);
 assert.equal(state.lap,1);
 assert.equal(state.finished,false);
 kart.stop();
});
test('reset returns player to the race course without changing lap and without warping the island',()=>{
 const {kart}=makeKart();kart.start();
 for(let i=0;i<350;i++)kart.step(1/60);
 const before=kart.getState();assert.equal(kart.rescue(),true);
 const after=kart.getState();
 assert.ok(kart.roadNearest(after.player.x,after.player.z).offset<.1);
 assert.equal(after.lap,before.lap);
 assert.equal(after.player.boost,0);
 kart.stop();
});
