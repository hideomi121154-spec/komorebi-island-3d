import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=path=>readFileSync(resolve(root,path),'utf8');
function setup(){
 const ctx={window:{}};
 for(const name of ['expansion3d.js','sealine3d.js','world-expansion-v23.js','spaceport3d.js'])
  new Script(file(name),{filename:name}).runInNewContext(ctx);
 return ctx.window;
}
function mesh(){
 const b={calls:0,invalid:0,high:0};
 for(const kind of ['box','roof','tri','quad','cylinder','sphere','ellipseDisc']){
  b[kind]=(...args)=>{
   b.calls++;
   for(const v of args)for(const n of Array.isArray(v)?v:[v]){
    if(typeof n==='number'&&!Number.isFinite(n))b.invalid++;
    if(typeof n==='number'&&kind==='box'&&n>25)b.high=Math.max(b.high,n);
   }
  };
 }
 return b;
}
test('homeland exceeds twice the old terrain area and remains apart from the commercial island',()=>{
 const {KomorebiExpansion:E,KomorebiSpaceport:P,KomorebiSeaLine:S}=setup();
 const area=E.grass[0]*E.grass[1]/(23.3*19.8);
 assert.ok(area>2,'expanded island area must be more than twice old');
 assert.equal(E.landCenter.x,P.bounds.x);
 assert.equal(E.landCenter.z,P.bounds.z);
 assert.ok(E.canWalk(-34,-14),'new western coastal land must be walkable');
 assert.ok(E.canWalk(P.marker.x,P.marker.z),'spaceport viewing plaza must be reachable');
 assert.equal(E.canWalk(P.pad.x,P.pad.z),false,'launch pad itself remains closed');
 assert.equal(E.canWalk(-21.1,-5),false,'old western house cannot be walked through');
 assert.equal(E.canWalk(9.5,-9.3),false,'old cottage obstacles remain');
 assert.equal(E.canWalk(-48,-15),false,'ocean is not walkable');
 assert.equal(S.isCommercial(P.pad.x,P.pad.z),false);
 assert.equal(S.nearestStation(17.4,2.85).id,'seaStationHome');
});
test('rocketpad has 3D facilities, geometry is finite, lift-off progresses and resets',()=>{
 const {KomorebiExpansion:E,KomorebiSpaceport:P}=setup(),staticMesh=mesh(),dynamicMesh=mesh();
 E.ground(staticMesh);E.objects(staticMesh);
 assert.equal(staticMesh.invalid,0);
 assert.ok(staticMesh.calls>350);
 P.drawDynamic(dynamicMesh,0);
 assert.ok(dynamicMesh.calls>=28,'rocket must be visible before launch');
 assert.equal(dynamicMesh.invalid,0);
 assert.equal(P.startLaunch(1000),true);
 assert.equal(P.startLaunch(2000),false,'second launch cannot overlap');
 assert.equal(P.phase(1000).countdown,6);
 assert.equal(P.phase(4000).countdown,3);
 assert.ok(P.phase(9000).lift>0);
 const flightMesh=mesh();P.drawDynamic(flightMesh,12000);
 assert.ok(flightMesh.calls>=35,'animated flame and smoke are present');
 assert.equal(flightMesh.invalid,0);
 assert.equal(P.phase(30000).active,false);
 assert.equal(P.startLaunch(31000),true,'launchpad can be reused');
});
test('launch controls, map marker and module load order are wired into the 3D game',()=>{
 const html=file('index.html'),game=file('game.js'),map=file('sealine3d.js');
 assert.ok(html.indexOf('src="world-expansion-v23.js')<html.indexOf('src="spaceport3d.js'));
 assert.ok(html.indexOf('src="spaceport3d.js')<html.indexOf('src="game.js'));
 assert.match(html,/id="spaceportBtn"/);
 assert.match(html,/id="spaceHud"/);
 assert.match(game,/SPACE\.drawDynamic\(b,now\)/);
 assert.match(game,/type==='spaceport'/);
 assert.match(game,/SPACE\.startLaunch\(performance\.now\(\)\)/);
 assert.match(map,/\[-24,-13,'🚀'\]/);
 assert.match(game,/komorebi_island_3d_v01/,'save key is stable');
});
