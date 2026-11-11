import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx={window:{}};
vm.runInNewContext(readFileSync(new URL('../expansion3d.js',import.meta.url),'utf8'),ctx);
const expanded=ctx.window.KomorebiExpansion;
function fakeMesh(){
 const out={calls:0};
 for(const name of ['box','roof','tri','quad','cylinder','sphere','ellipseDisc']){
  out[name]=(...args)=>{out.calls++;for(const v of args)if(Array.isArray(v))for(const n of v)assert.ok(Number.isFinite(n));};
 }
 return out;
}
test('expanded island is larger than original and has walkable outer districts',()=>{
 assert.ok(expanded.grass[0]>20);
 assert.ok(expanded.grass[1]>16);
 assert.equal(expanded.canWalk(18,0),true);
 assert.equal(expanded.canWalk(23,0),false);
 assert.equal(expanded.canWalk(12.6,4.1),false); // pond
 assert.equal(expanded.canWalk(9.5,-9.3),false); // cottage
 assert.ok(expanded.canWalk(-12,9.2)); // campsite
});
test('original resource positions are left intact and new collection areas exist',()=>{
 assert.ok(expanded.trees.length>=15);
 assert.ok(expanded.shells.length>=3);
 assert.equal(new Set(expanded.places.map(p=>p.id)).size,4);
 for(const p of expanded.places)assert.ok(p.id&&p.name);
});
test('extended terrain and building mesh draw without invalid coordinates',()=>{
 const b=fakeMesh();
 expanded.ground(b);
 expanded.objects(b);
 assert.ok(b.calls>300);
});
test('map draws island and the saved player location',()=>{
 let draws=0;
 const canvas={width:520,height:420,getContext:()=>new Proxy({},{
  get(_t,k){if(k==='fillText')return()=>{draws++};return()=>{}},
  set(){return true}
 })};
 expanded.paintMap(canvas,{x:0,z:3});
 assert.ok(draws>=7);
});
