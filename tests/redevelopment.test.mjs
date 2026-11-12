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

test('active construction has moving crane, hoist, crew and scaffold workers at 34%',()=>{
 const start=build.constructionPose(0,34);
 const later=build.constructionPose(8100,34);
 assert.notEqual(start.boomAngle,later.boomAngle,'crane yaw should animate');
 assert.notEqual(start.trolleyX,later.trolleyX,'trolley should travel along the crane');
 assert.notEqual(start.hookY,later.hookY,'hoist should move vertically');
 assert.notEqual(start.carrierX,later.carrierX,'material worker should actually walk');
 assert.ok(start.scaffoldLevel>5&&start.scaffoldLevel<9,'worker stands on unfinished 5th level');
 assert.ok(start.carrierX>11&&start.carrierX<13,'crew stays within the fenced work area');
});

test('3D construction activity changes over time and respects the completed floor',()=>{
 function snapshot(time,progress){
  const points=[],kinds={box:0,quad:0,sphere:0},rec=mockMesh();
  for(const name of ['box','quad','sphere']){
   const old=rec[name];
   rec[name]=(...args)=>{old(...args);kinds[name]++;if(name==='quad'&&points.length<5)points.push(args.flat().filter(v=>typeof v==='number'));};
  }
  build.drawDynamic(rec,time,progress);
  return {points,kinds,invalid:rec.invalid};
 }
 const a=snapshot(200,34),b=snapshot(5100,34),late=snapshot(5100,78);
 assert.ok(a.kinds.box>45,'crew members, truss and cargo create real 3D parts');
 assert.ok(a.kinds.quad>=60,'rotated crane must be 3D geometry');
 assert.ok(a.kinds.sphere>=20,'helmets, heads, dust and warning lights should exist');
 assert.notDeepEqual(a.points,b.points,'jib rotates instead of being a frozen static model');
 assert.equal(a.invalid+b.invalid+late.invalid,0);
 assert.ok(build.constructionPose(5000,78).scaffoldLevel>build.constructionPose(5000,34).scaffoldLevel,'crew ascends as floors complete');
 const done=mockMesh();
 build.drawDynamic(done,5000,100);
 assert.equal(done.count,0,'construction activity stops at 100%');
});

test('construction asset update leaves saved progression and script integration unchanged',()=>{
 const game=readFileSync(new URL('../game.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(game,/REDEVELOPMENT\.drawDynamic\(b,now,state\.redevelopmentProgress\)/);
 assert.match(html,/src="redevelopment3d\.js\?v=20261112-v22"/);
 assert.equal(build.advance(34,1),36,'daily +2% progression continues');
 assert.equal(build.advance(34,0),34,'animations never grant fake progress');
});
