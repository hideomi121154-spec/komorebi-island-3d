import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const file=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
function boot(random=()=>.5){
 const window={};
 const math=Object.create(Math);math.random=random;
 new vm.Script(file('airshow3d.js'),{filename:'airshow3d.js'}).runInNewContext({window,Math:math});
 return window.KomorebiAirshow;
}
function spy(){
 const calls=[];
 const mesh={setTransform(...args){calls.push(['setTransform',...args]);},
 clearTransform(){calls.push(['clearTransform']);}};
 for(const key of ['box','sphere','tri','quad']){
  mesh[key]=(...args)=>calls.push([key,...args]);
 }
 return{mesh,calls};
}
function assertFiniteMesh(calls){
 for(const [name,...args] of calls){
  const numbers=args.flat(Infinity).filter(x=>typeof x==='number');
  assert.ok(numbers.every(Number.isFinite),name+' emitted invalid 3D vertex');
 }
}
test('six-aircraft flypast is a daylight-only playable event',()=>{
 const a=boot();
 assert.equal(a.COUNT,6);
 assert.equal(a.isDay(419),false);
 assert.equal(a.isDay(420),true);
 assert.equal(a.isDay(1109),true);
 assert.equal(a.isDay(1110),false);
 assert.equal(a.start(1000,19*60),false);
 assert.equal(a.phase(1500).active,false);
 assert.equal(a.start(1000,10*60),true);
 assert.equal(a.start(1100,10*60),false,'cannot restart an active show');
 assert.equal(a.phase(1000).active,true);
 assert.equal(a.phase(1000+a.FLY_MS*.4).aircraftVisible,true);
 assert.equal(a.phase(1000+a.FLY_MS+800).aircraftVisible,false);
 assert.equal(a.phase(1000+a.TOTAL_MS+5).active,false);
 assert.equal(a.start(22000,9*60),true,'can fly again once finished');
 a.cancel();assert.equal(a.active(22010),false);
});
test('V formation of six jets moves across sea, islands and harbor then fans outward',()=>{
 const a=boot();
 const at=.18,late=.72;
 const early=Array.from({length:6},(_,i)=>a.position(i,at));
 const spread=Array.from({length:6},(_,i)=>a.position(i,late));
 assert.ok(a.basePath(0).x< -75&&a.basePath(1).x>75);
 assert.ok(a.basePath(0).z<0&&a.basePath(1).z>0);
 assert.ok(early.every(p=>p.y>=32&&p.y<=58));
 assert.ok(early.every(p=>[p.x,p.y,p.z,p.yaw].every(Number.isFinite)));
 assert.notEqual(early[0].x,early[1].x);
 assert.ok(Math.hypot(spread[3].x-spread[4].x,spread[3].z-spread[4].z)>
 Math.hypot(early[3].x-early[4].x,early[3].z-early[4].z),'late formation must visibly fan out');
});
test('six jets and smoke are actual 3D triangles with a small mobile polygon budget',()=>{
 const a=boot();a.start(5000,720);
 const {mesh,calls}=spy();
 a.draw(mesh,10000);
 const jets=calls.filter(c=>c[0]==='setTransform');
 const smoke=calls.filter(c=>c[0]==='quad');
 assert.equal(jets.length,6,'all six original stunt jets are present');
 assert.ok(smoke.length>100,'white and pale-blue smoke is a visible ribbon');
 assert.ok(calls.length<1600,'limit repeated meshes for mobile');
 assertFiniteMesh(calls);
 const lite=spy();a.draw(lite.mesh,10000,{reducedMotion:true});
 assert.ok(lite.calls.length<calls.length,'reduced motion draws fewer smoke trails');
 const none=spy();a.draw(none.mesh,5000+a.TOTAL_MS+100);
 assert.equal(none.calls.length,0,'no stray planes after the event ends');
});
test('show camera focus fades in and out without moving world player coordinates',()=>{
 const a=boot();
 a.start(2000,720);
 const early=a.phase(2000+200),middle=a.phase(2000+4500),end=a.phase(2000+a.TOTAL_MS-200);
 assert.ok(early.look<middle.look);
 assert.ok(middle.look>.98);
 assert.ok(end.look<.03);
 assert.ok(middle.lead.y>38);
 const game=file('game.js'),html=file('index.html'),styles=file('styles.css');
 assert.match(game,/AIRSHOW\.draw\(b,now,\{reducedMotion\}\)/);
 assert.match(game,/if\(airshowGoal>0\)airshowLookAmount=airshowGoal/);
 assert.match(game,/center\[1\]\+=w\*\(airshowTarget\.y-center\[1\]\)/);
 assert.match(game,/getAirshow:/);
 assert.match(game,/airshowButton\.hidden=!daylightAllowed/);
 assert.match(game,/AIRSHOW\?\.cancel\(\)/);
 assert.match(html,/id="airshowBtn"/);
 assert.match(html,/id="airshowHud"/);
 assert.ok(html.indexOf('src="airshow3d.js')<html.indexOf('src="game.js'));
 assert.match(styles,/#airshowBtn\[hidden\]/);
 assert.match(game,/komorebi_island_3d_v01/);
});
test('rare original rainbow smoke remains a surprise, never a branded Blue Impulse asset',()=>{
 const a=boot(()=>.01);
 assert.equal(a.start(100,720),true);
 assert.equal(a.variant(),'rainbow');
 const {mesh,calls}=spy();
 a.draw(mesh,100+7200);
 assertFiniteMesh(calls);
 assert.ok(calls.some(c=>c[0]==='quad'&&/f1a9b8|f6d8a4|b8d6f2/i.test(c.at(-1))));
 assert.doesNotMatch(file('airshow3d.js'),/Blue Impulse|ブルーインパルス|JASDF|航空自衛隊/);
});
