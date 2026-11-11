import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox={window:{}};
vm.runInNewContext(readFileSync(new URL('../redevelopment3d.js',import.meta.url),'utf8'),sandbox);
const build=sandbox.window.KomorebiRedevelopment;

function mockMesh(){
 const record={count:0,invalid:0};
 for(const name of ['box','roof','cylinder','sphere','ellipseDisc','quad','tri']){
  record[name]=(...args)=>{
   record.count++;
   for(const value of args)for(const n of Array.isArray(value)?value:[value])
    if(typeof n==='number'&&!Number.isFinite(n))record.invalid++;
  };
 }
 return record;
}

test('main town is preserved, construction is on the eastern side of the island',()=>{
 assert.ok(build.site.x>11);
 assert.ok(build.site.z<0);
 assert.equal(build.within(0,0),false);
 assert.equal(build.within(-6,-5),false);
 assert.equal(build.within(14,-6),true);
 assert.equal(build.within(build.marker.x,build.marker.z),false);
 assert.equal(build.marker.id,'redevelopment');
});

test('old save indexes for trees remain stable and fenced trees are moved',()=>{
 const trees=[{x:-10,z:-7,type:'fruit'},{x:13.3,z:-7.5,type:'fruit'},{x:10.7,z:-3.1,type:'pine'}];
 build.clearTrees(trees);
 assert.equal(trees.length,3);
 assert.deepEqual(JSON.parse(JSON.stringify(trees[0])),{x:-10,z:-7,type:'fruit'});
 for(const t of trees)assert.equal(build.within(t.x,t.z),false);
 assert.equal(trees[1].type,'fruit');
 assert.equal(trees[2].type,'pine');
});

test('progress moves from concrete skeleton to finished high-rise',()=>{
 assert.equal(build.clamp(undefined),32);
 assert.equal(build.clamp(-4),0);
 assert.equal(build.clamp(1000),100);
 assert.equal(build.completedFloors(32),4);
 assert.equal(build.completedFloors(100),9);
 assert.equal(build.advance(32,5),42);
 assert.equal(build.advance(99,9),100);
 assert.match(build.stage(32),/基礎/);
 assert.match(build.stage(100),/完成/);
});

test('all procedural construction geometry is finite, even at completion',()=>{
 for(const progress of [0,32,67,100]){
  const mesh=mockMesh();
  build.drawStatic(mesh,progress);
  assert.ok(mesh.count>160, 'building and ground should be visible at '+progress);
  assert.equal(mesh.invalid,0);
 }
 const a=mockMesh(),b=mockMesh();
 build.drawDynamic(a,0,32);
 build.drawDynamic(b,12500,32);
 assert.ok(a.count>10);
 assert.equal(a.invalid+b.invalid,0);
 const complete=mockMesh();
 build.drawDynamic(complete,12500,100);
 assert.equal(complete.count,0);
});
