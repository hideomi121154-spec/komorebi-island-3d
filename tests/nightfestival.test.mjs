import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=n=>readFileSync(resolve(root,n),'utf8');
function loadModule(name,key){
 const context={window:{},URLSearchParams};
 new Script(source(name),{filename:name}).runInNewContext(context);
 assert.ok(context.window[key],name+' should register');
 return context.window[key];
}
const festival=loadModule('nightfestival.js','KomorebiNightFestival');
const quality=loadModule('render-quality.js','KomorebiRenderQuality');

test('HD night effects are injected before the island engine',()=>{
 const html=source('index.html');
 const iFestival=html.indexOf('src="nightfestival.js');
 const iQuality=html.indexOf('src="render-quality.js');
 const iGame=html.indexOf('src="game.js');
 assert.ok(iFestival>0&&iQuality>iFestival&&iGame>iQuality);
 const game=source('game.js');
 assert.match(game,/festivalRenderer\.draw\(now,lighting\.stars/);
 assert.match(game,/gl\.useProgram\(prog\)/);
 assert.match(game,/FESTIVAL\.burstLighting\(now,lighting\.stars\)/);
 assert.match(game,/renderQuality\.ratio\(cssW,cssH/);
 assert.match(game,/FESTIVAL\?\.drawCanvas/);
});

test('Stars render deterministically with night but vanish during day',()=>{
 const a=festival.makeParticles(1280,1);
 const b=festival.makeParticles(1280,1);
 assert.ok(a.length>7*100);
 assert.deepEqual(Array.from(a),Array.from(b));
 assert.equal(festival.makeParticles(1280,0).length,0);
 for(let i=0;i<a.length;i+=7){
  assert.ok(Number.isFinite(a[i])&&Number.isFinite(a[i+1]));
  assert.ok(a[i+6]>=0&&a[i+6]<=1,'alpha constrained');
 }
});

test('Fireworks rise, burst, fade and react to reduced motion',()=>{
 const start=festival.ROCKET_MS;
 const before=festival.makeParticles(300,1);
 const burst=festival.makeParticles(start+500,1);
 const rest=festival.makeParticles(start+festival.BURST_MS+200,1);
 assert.ok(burst.length>before.length,'burst adds radial spark trails');
 assert.ok(burst.length>rest.length,'burst fades when finished');
 assert.equal(festival.makeParticles(start+500,1,true).length,festival.stars.length*7);
 const lighting=festival.burstLighting(start+100,1);
 assert.ok(lighting.strength>0&&lighting.strength<=.20);
 assert.equal(festival.burstLighting(start+100,0).strength,0);
});

test('Fallback drawing works with screen canvas coordinates',()=>{
 const calls=[];
 const ctx={save(){calls.push('save')},restore(){calls.push('restore')},beginPath(){},
  arc(x,y,r){assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&r>0)},
  fill(){calls.push('fill')},set globalCompositeOperation(v){this._blend=v},
  set globalAlpha(v){assert.ok(v>=0&&v<=1)},
  set fillStyle(v){assert.match(v,/^rgb\(/)}};
 festival.drawCanvas(ctx,390,844,festival.ROCKET_MS+500,1);
 assert.equal(calls[0],'save');
 assert.equal(calls.at(-1),'restore');
 assert.ok(calls.includes('fill'));
});

test('Retina scale fits a safe pixel budget and honors low-power mode',()=>{
 const auto=quality.create();
 const retina=auto.ratio(390,844,3);
 assert.ok(retina>1.7&&retina<=2.1);
 assert.ok(390*844*retina**2<=2200000+1);
 assert.equal(quality.create({mode:'battery'}).ratio(390,844,3),1);
 assert.ok(quality.create({mode:'ultra'}).ratio(390,844,3)>=retina);
 assert.equal(quality.modeFromSearch('?quality=battery'),'battery');
 assert.equal(quality.modeFromSearch('?quality=unknown'),'auto');
});

test('Automatic rendering scale reacts to consistently slow frames',()=>{
 const q=quality.create();
 const start=q.current().limit;
 for(let i=1;i<=150;i++)q.observe(i*35);
 assert.ok(q.current().limit<start);
});

test('3D fireworks exist above the island and can be viewed from overhead',()=>{
 const points=festival.worldParticles(1250,1,[5,-3]);
 assert.ok(points.length>8*100);
 for(let i=0;i<points.length;i+=8){
  assert.ok(Number.isFinite(points[i])&&Number.isFinite(points[i+1])&&Number.isFinite(points[i+2]));
  assert.ok(points[i+1]>0,'fireworks must be above the island');
 }
 assert.equal(festival.worldParticles(1250,0,[5,-3]).length,0);
 assert.equal(festival.worldParticles(1250,1,[5,-3],true).length,0);
 const game=source('game.js');
 assert.match(game,/worldFestivalRenderer\.draw\(now,fireworksIntensity/);
 assert.match(game,/canvas\.addEventListener\('wheel'/);
 assert.match(game,/cameraPitch=clamp/);
 assert.match(game,/pointers\.size===2/);
 assert.match(game,/festivalViewBtn/);
});
