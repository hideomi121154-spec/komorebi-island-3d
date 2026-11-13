import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=path=>readFileSync(resolve(root,path),'utf8');
function setup(){
 const window={};
 for(const script of ['expansion3d.js','sealine3d.js','world-expansion-v23.js','spaceport3d.js','industry3d.js']){
  new Script(file(script),{filename:script}).runInNewContext({window});
 }
 return window;
}
function builder(){
 const stats={count:0,invalid:0,cars:[],transforms:[],maxTriangles:0};
 const b={};
 for(const kind of ['box','tri','quad','sphere','cylinder','ellipseDisc','roof','leaf']){
  b[kind]=(...args)=>{
   stats.count++;
   for(const value of args){
    for(const n of Array.isArray(value)?value:[value]){
     if(typeof n==='number'&&!Number.isFinite(n))stats.invalid++;
    }
   }
  };
 }
 b.setTransform=(x,y,z,yaw)=>{stats.transforms.push({x,y,z,yaw});stats.cars.push({x,y,z});};
 b.clearTransform=()=>{};
 return {b,stats};
}
test('industrial island joins existing home while preserving spaceport and old city land',()=>{
 const w=setup(),E=w.KomorebiExpansion,S=w.KomorebiSeaLine,I=w.KomorebiIndustry;
 assert.deepEqual(Array.from([I.land.x,I.land.z]),[30,31]);
 assert.equal(E.canWalk(12.7,21.5),true,'shoreline connection remains walkable outside factory walls');
 assert.equal(E.canWalk(35,39),true,'yard is walkable');
 assert.equal(E.canWalk(I.factory.x,I.factory.z),false,'factory has walls');
 assert.equal(E.canWalk(20,39),false,'active steelwork is off-limits');
 assert.equal(E.canWalk(I.ship.x,I.ship.z),false,'cannot walk on ship hull');
 assert.equal(E.canWalk(90,50),false,'water is unwalkable');
 assert.equal(S.isCommercial(I.factory.x,I.factory.z),false);
 assert.equal(S.isCommercial(52,-4),true,'commercial island not altered');
 assert.equal(I.places.length,2);
 assert.equal(w.KomorebiSpaceport.pad.x,-24);
});
test('factory, construction site, staging yard, harbor and carrier have finite geometry',()=>{
 const w=setup(),{b,stats}=builder();
 w.KomorebiSeaLine.drawTerrain(b);w.KomorebiExpansion.ground(b);
 w.KomorebiExpansion.objects(b);
 assert.ok(stats.count>500,'large district needs many visible 3D structures');
 assert.ok(stats.transforms.length>=7,'staging yard has visible parked cars');
 assert.equal(stats.invalid,0);
});
test('vehicle flow travels factory to road to port, then up ship ramp',()=>{
 const I=setup().KomorebiIndustry;
 const a=I.interpolateRoute(0),mid=I.interpolateRoute(.48),end=I.interpolateRoute(.99999);
 assert.ok(a.x<30&&a.z<30);
 assert.ok(mid.x>35&&mid.x<53);
 assert.ok(end.x>60&&end.y>1,'finished cars reach ship deck height');
 assert.ok(end.x>a.x);
 assert.ok(Number.isFinite(mid.yaw));
 assert.ok(I.metrics(5900).loaded>=1);
});
test('dynamic production convoy is bounded and advances toward carrier',()=>{
 const I=setup().KomorebiIndustry;
 const early=builder(),later=builder();
 I.drawDynamic(early.b,0);I.drawDynamic(later.b,2900);
 assert.ok(early.stats.transforms.length>=8,'many cars should be visible');
 assert.ok(early.stats.transforms.length<=9,'mobile performance needs an upper bound');
 assert.ok(early.stats.count<240,'keep scene lightweight on mobile');
 assert.equal(early.stats.invalid,0);
 assert.equal(later.stats.invalid,0);
 const moved=early.stats.cars.some((p,i)=>Math.hypot(p.x-later.stats.cars[i].x,p.z-later.stats.cars[i].z)>.2);
 assert.ok(moved,'vehicles actually move as time progresses');
 assert.ok(early.stats.cars.some(p=>p.x>50),'at least one car is near the loading ramp');
});
test('game and UI connect factory camera, travel buttons, map and preserve old save format',()=>{
 const game=file('game.js'),html=file('index.html'),map=file('sealine3d.js');
 assert.match(game,/INDUSTRY\.drawDynamic\(b,now\)/);
 assert.match(game,/const focusX=cameraPan\.x\+\(industrialOverview\?45/);
 assert.match(game,/industrialOverview\?68/);
 assert.match(game,/type==='industry'/);
 assert.match(game,/getIndustry:/);
 assert.match(game,/komorebi_island_3d_v01/);
 assert.match(html,/id="industryBtn"/);
 assert.ok(html.indexOf('src="spaceport3d.js')<html.indexOf('src="industry3d.js'));
 assert.ok(html.indexOf('src="industry3d.js')<html.indexOf('src="game.js'));
 assert.match(html,/game\.js\?v=20261113-v3[123]/);
 assert.match(map,/\[21,27,'🏭'\]/);
 assert.match(map,/\[69,29\.5,'🚢'\]/);
});
