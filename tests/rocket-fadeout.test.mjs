import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function boot(){
 const window={};
 for(const name of ['expansion3d.js','sealine3d.js','world-expansion-v23.js','spaceport3d.js'])
  new Script(file(name),{filename:name}).runInNewContext({window});
 return window.KomorebiSpaceport;
}
function recorder(){
 const counts={boxes:0,rocket:0,smoke:0,invalid:0};
 const b={};
 for(const name of ['box','cylinder','tri','sphere','quad','roof','ellipseDisc']){
  b[name]=(...args)=>{
   if(name==='sphere')counts.smoke++;
   else counts.rocket++;
   for(const a of args)for(const x of Array.isArray(a)?a:[a])if(typeof x==='number'&&!Number.isFinite(x))counts.invalid++;
  };
 }
 return {b,counts};
}
test('rocket fades gradually over 4 seconds, reaching exactly zero transparency',()=>{
 const s=boot();s.startLaunch(1000);
 assert.equal(s.phase(9000).opacity,1);
 assert.equal(s.phase(15000).opacity,1);
 const q=s.phase(16000),half=s.phase(17000),later=s.phase(18000);
 assert.ok(q.opacity>half.opacity&&half.opacity>later.opacity);
 assert.ok(Math.abs(half.opacity-.5)<.001);
 assert.equal(s.phase(19000).opacity,0);
 assert.equal(s.phase(20000).opacity,0);
 assert.match(s.phase(19000).label,/打ち上げ成功/);
 assert.equal(s.phase(19000).active,true,'victory status may hold briefly after fade');
 assert.equal(s.phase(22000).active,false,'camera returns promptly after victory hold');
 assert.equal(s.phase(22000).label,'発射準備完了');
 assert.equal(s.phase(22000).opacity,1,'next rocket is ready for launch');
});
test('rocket disappears completely while the lingering ground smoke remains independent',()=>{
 const s=boot();s.startLaunch(1000);
 const visible=recorder();s.drawRocket(visible.b,17000);
 assert.ok(visible.counts.rocket>20);
 const gone=recorder();s.drawRocket(gone.b,19000);
 assert.equal(gone.counts.rocket+gone.counts.smoke,0,'fully transparent rocket produces zero triangles');
 const smoke=recorder();s.drawAtmosphere(smoke.b,19000);
 assert.ok(smoke.counts.smoke>=30,'launch plume survives briefly after the rocket vanishes');
 assert.equal(smoke.counts.invalid,0);
 const combined=recorder();s.drawDynamic(combined.b,19000);
 assert.equal(combined.counts.rocket,0,'legacy compatibility path also has no opaque rocket');
});
test('the island renderer alpha-blends only the rocket, with two-dimensional fallback',()=>{
 const game=file('game.js'),html=file('index.html');
 assert.match(game,/uniform float uOpacity/);
 assert.match(game,/gl\.blendFunc\(gl\.SRC_ALPHA,gl\.ONE_MINUS_SRC_ALPHA\)/);
 assert.match(game,/gl\.uniform1f\(uOpacity,shipOpacity\)/);
 assert.match(game,/gl\.depthMask\(false\)/);
 assert.match(game,/gl\.depthMask\(true\);gl\.disable\(gl\.BLEND\)/);
 assert.match(game,/SPACE\.drawAtmosphere\(b,now\)/);
 assert.match(game,/SPACE\.drawRocket\(b,now\)/);
 assert.match(game,/ctx\.globalAlpha=v\.opacity/);
 assert.match(game,/if\(shipOpacity>0\)/);
 assert.match(html,/spaceport3d\.js\?v=20261114-v41/);
 assert.match(html,/game\.js\?v=20261114-v4[12]/);
 assert.match(game,/komorebi_island_3d_v01/);
});
