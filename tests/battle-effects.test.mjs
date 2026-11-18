import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const env={window:{}};
vm.runInNewContext(readFileSync(new URL('../battle-effects.js',import.meta.url),'utf8'),env);
const fx=env.window.KomorebiBattleEffects;
const marker={x:-.7,z:10.2},camera={eye:[-.58,8,23.6],center:[-.7,-2,10.4],fov:46};
function canvas(){
 const calls={gradient:0,stroke:0,fill:0,arc:0,lines:0,clears:0};
 const ctx={
  createRadialGradient(){calls.gradient++;return {addColorStop(){}};},
  clearRect(){calls.clears++},beginPath(){},closePath(){},arc(){calls.arc++},
  moveTo(){},lineTo(){calls.lines++},quadraticCurveTo(){},save(){},restore(){},
  translate(){},rotate(){},stroke(){calls.stroke++},fill(){calls.fill++},
  set globalCompositeOperation(v){this.mode=v}
 };
 return {ctx,calls};
}
test('movie-like effects have deterministic distinct charge, flight, impact and reply phases',()=>{
 const seq=fx.create('thunder',0,false);
 assert.ok(seq.duration>=3000);
 assert.equal(fx.phase(seq,400),'charge');
 assert.equal(fx.phase(seq,1250),'travel');
 assert.equal(fx.phase(seq,1910),'impact');
 assert.equal(fx.phase(seq,2650),'counter');
 assert.equal(fx.active(seq,seq.duration-1),true);
 assert.equal(fx.active(seq,seq.duration),false);
 assert.equal(fx.create('thunder',0,true).duration<=1000,true);
});
test('real compositing generates bright bolts, shockwave rings and moving projectile',()=>{
 const seq=fx.create('thunder',0,false);
 const charge=canvas(),travel=canvas(),impact=canvas(),counter=canvas();
 fx.paint(charge.ctx,300,seq,camera,marker,414,896,false);
 fx.paint(travel.ctx,1250,seq,camera,marker,414,896,false);
 fx.paint(impact.ctx,1910,seq,camera,marker,414,896,false);
 fx.paint(counter.ctx,2650,seq,camera,marker,414,896,false);
 assert.ok(charge.calls.fill>=25);
 assert.ok(travel.calls.stroke>7);
 assert.ok(impact.calls.arc>15);
 assert.ok(impact.calls.gradient>1);
 assert.ok(counter.calls.fill>5);
 assert.equal(fx.paint(impact.ctx,4000,seq,camera,marker,414,896,false),false);
});
test('special-effect coordinates project 3D enemy to its visible portrait position',()=>{
 const p=fx.project([marker.x-1.88,1.2,marker.z+.55],camera,414,896);
 const q=fx.project([marker.x+1.85,1.2,marker.z+.27],camera,414,896);
 assert.ok(p.x>25&&p.x<190);
 assert.ok(q.x>220&&q.x<395);
 assert.ok(p.y>150&&p.y<450);
 assert.ok(q.y>150&&q.y<450);
});
test('heal and all four skills render without invalid canvas commands',()=>{
 for(const id of ['thunder','quick','burst','rest','item','friend']){
  const seq=fx.create(id,0,false);
  for(const now of [600,1450,1880]){
   const {ctx,calls}=canvas();
   assert.equal(fx.paint(ctx,now,seq,camera,marker,414,896,false),true);
   assert.ok(calls.fill+calls.stroke>0);
  }
 }
});
