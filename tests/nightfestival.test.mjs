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
 assert.match(game,/festivalRenderer\.draw\(festivalClock,fireworksIntensity/);
 assert.match(game,/gl\.useProgram\(prog\)/);
 assert.match(game,/FESTIVAL\.burstLighting\(festivalClock,fireworksIntensity\)/);
 assert.match(game,/showToast\('✨ レア花火！/);
 assert.match(game,/playRareChime\(\)/);
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
 assert.ok(retina>=1.5&&retina<=1.65);
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
 assert.match(game,/worldFestivalRenderer\.draw\(festivalClock,fireworksIntensity/);
 assert.match(source('camera-gestures.js'),/canvas\.addEventListener\('wheel'/);
 assert.match(game,/cameraPitch=clamp/);
 assert.match(source('camera-gestures.js'),/pts\.length>=2/);
 assert.match(game,/festivalViewBtn/);
});

test('The grand show contains a massive gold top burst, lower red and colored satellites',()=>{
 const pattern=festival.showPattern;
 assert.ok(pattern.length>=9);
 assert.equal(pattern[0].kind,'gold');
 assert.equal(pattern[1].kind,'red');
 assert.ok(pattern[0].y>pattern[1].y);
 assert.ok(pattern[0].r>pattern[1].r);
 assert.ok(pattern.filter(p=>p.kind==='pink').length>=3);
 assert.ok(pattern.filter(p=>p.kind==='green').length>=3);
 assert.ok(pattern.some(p=>p.x<0)&&pattern.some(p=>p.x>0));
 assert.ok(pattern.every(p=>p.r>0&&p.life>2500&&p.y>10));
 const frame=festival.worldParticles(1800,1,[5,-3]);
 assert.ok(frame.length/8>5000,'many layered streaks rather than one faint 100-dot ring');
 const colors=new Set();
 let fountainCount=0,highCount=0;
 for(let i=0;i<frame.length;i+=8){
  const x=frame[i],y=frame[i+1],z=frame[i+2];
  assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
  assert.ok(frame[i+7]>=0&&frame[i+7]<=1);
  colors.add([Math.round(frame[i+4]*10),Math.round(frame[i+5]*10),Math.round(frame[i+6]*10)].join('-'));
  if(y<12)fountainCount++;
  if(y>23)highCount++;
 }
 assert.ok(colors.size>=5,'gold, red, green, pink and white sparks must coexist');
 assert.ok(fountainCount>=150,'launch fountains should be clearly visible');
 assert.ok(highCount>=800,'upper golden chrysanthemum is a large visible shell');
});
test('Festival loop, phone detail scaling and reduced motion are deterministic',()=>{
 const ms=1800;
 const first=festival.worldParticles(ms,1,[5,-3]);
 assert.deepEqual(Array.from(first),Array.from(festival.worldParticles(ms,1,[5,-3])));
 // Each show has a new rare slot and face; the output remains stable at the same timestamp.
 assert.deepEqual(Array.from(first),Array.from(festival.worldParticles(ms,1,[5,-3])));
 const low=festival.worldParticles(ms,1,[5,-3],false,.6);
 assert.ok(low.length<first.length&&low.length>0,'lower-end phones render fewer sparks');
 assert.equal(festival.worldParticles(ms,0,[5,-3]).length,0);
 assert.equal(festival.worldParticles(ms,1,[5,-3],true).length,0);
 assert.ok(festival.burstLighting(ms,1).strength>0);
 const game=source('game.js');
 const html=source('index.html');
 assert.match(game,/festivalStartedAt=performance\.now\(\)/);
 assert.match(game,/get\('demo'\)==='fireworks'/);
 assert.match(game,/festivalShow&&!roomActive\?festivalOrigin/);
 assert.match(game,/cameraPitch=1\.23/);
 assert.match(html,/nightfestival\.js\?v=20261114-v43/);
 assert.match(html,/game\.js\?v=(?:20261112-v25|(?:20261113-v(?:2[6789]|3[012345679])|20261114-v4[012]))/);
});

test('Spark trails form continuous luminous 3D line segments',()=>{
 const lines=[];
 const points=festival.worldParticles(1850,1,[11,-5],false,1,lines);
 assert.ok(points.length/8>6000);
 assert.ok(lines.length/16>2500,'every shell has real continuous line segments');
 assert.equal(lines.length%16,0);
 for(let i=0;i<lines.length;i+=16){
  const length=Math.hypot(lines[i]-lines[i+8],lines[i+1]-lines[i+9],lines[i+2]-lines[i+10]);
  assert.ok(length>0&&length<1.3,'successive streak samples connect without jumps');
  assert.ok(lines[i+7]>=0&&lines[i+7]<=1);
 }
 const source=String.raw;
 const fireworksModule=readFileSync(resolve(root,'nightfestival.js'),'utf8');
 assert.match(fireworksModule,/gl\.drawArrays\(gl\.LINES/);
 assert.match(fireworksModule,/gl\.drawArrays\(gl\.POINTS/);
 assert.match(fireworksModule,/uniform float uLine/);
});

test('One in every ten 3D launches is a rare mascot firework, without unlucky streaks',()=>{
 const types=new Set();
 const rareSlots=new Set();
 for(let cycle=0;cycle<90;cycle++){
  const selection=festival.rareAtCycle(cycle);
  const choices=festival.showPattern.map((spec,index)=>{
   const at=index===selection.slot?festival.RARE_AT:spec.at;
   const active=festival.spectacleEventsAt(cycle*festival.SHOW_CYCLE+at+20);
   return active.find(e=>e.index===index&&e.age===20);
  });
  assert.equal(choices.length,10);
  assert.equal(choices.filter(e=>e?.spec?.kind==='face').length,1,'one rare in each block of ten');
  const rare=choices.find(e=>e?.spec?.kind==='face');
  assert.ok(rare.index>=2&&rare.index<10,'main gold and red spectacles remain');
  rareSlots.add(rare.index);
  types.add(rare.spec.faceType);
  assert.ok(rare.spec.r>=3.5);
  const a=festival.worldParticles(cycle*festival.SHOW_CYCLE+festival.RARE_AT+680,1,[11,-5]);
  assert.ok(a.length>0&&a.every(Number.isFinite),'rare firework particles must have valid geometry');
  assert.ok(a.length/8<11000,'phone draw budget remains capped');
 }
 assert.ok(rareSlots.size>=5,'rare location varies between shows');
 assert.deepEqual([...types].sort(),[...festival.FACE_KINDS].sort());
});
test('Rare face receives a solo finale; gold and red bursts cannot overlap its silhouette',()=>{
 const cycle=2;
 const events=festival.spectacleEventsAt(cycle*festival.SHOW_CYCLE+festival.RARE_AT+700);
 const active=events.filter(e=>e.age>=0);
 assert.equal(active.length,1,'no simultaneous ordinary explosion during the face');
 assert.equal(active[0].spec.kind,'face');
 assert.equal(active[0].spec.faceType,'face-cat');
 const justBefore=festival.spectacleEventsAt(cycle*festival.SHOW_CYCLE+festival.RARE_AT-200);
 assert.ok(justBefore.every(e=>e.age<0||e.spec.kind!=='face'));
 assert.ok(justBefore.every(e=>e.age<0),'all previous regular bursts have faded');
 const after=festival.spectacleEventsAt(cycle*festival.SHOW_CYCLE+festival.RARE_AT+festival.RARE_LIFE+10);
 assert.ok(after.every(e=>e.spec.kind!=='face'),'the shape clears before the next cycle');
});
test('WebGL displays only one face outline while Canvas2D fallback retains its own',()=>{
 const cycle=4;
 const ms=cycle*festival.SHOW_CYCLE+festival.RARE_AT+800;
 const fallback=festival.worldParticles(ms,1,[11,-5],false,1,null,true);
 const webgl=festival.worldParticles(ms,1,[11,-5],false,1,null,false);
 assert.ok(fallback.length>webgl.length+150*8,'single WebGL billboard removes repeated eyes, ears and face lines');
 assert.ok(webgl.length>0,'the halo still sparkles in WebGL mode');
 const src=source('nightfestival.js');
 assert.match(src,/worldParticles\(ms,intensity,origin,reducedMotion,detail,lineSegments,false\)/);
 assert.match(src,/if\(includeFaceOutline\)for\(const p of FACE_SHAPES/);
});
test('Original round, bunny and cat fireworks have recognizable facial features',()=>{
 for(const kind of festival.FACE_KINDS){
  const points=festival.FACE_SHAPES[kind];
  assert.ok(points.length>170&&points.length<340);
  assert.ok(points.filter(p=>p.color[1]>.80&&p.color[2]>.9).length>=20,'glowing eyes');
  assert.ok(points.filter(p=>p.color[0]===1&&p.color[1]<.6).length>=24,'pink cheeks');
  if(kind==='face-bunny')assert.ok(points.some(p=>p.y< -1.1),'long bunny ears');
  if(kind==='face-cat')assert.ok(points.some(p=>p.y<-.95),'pointed cat ears');
  assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.size>0));
 }
 const s=source('nightfestival.js');
 assert.match(s,/renderFaceTexture\(c,kind\)/);
 assert.match(s,/spec\.kind==='face'\?spec\.faceType:spec\.kind/);
 assert.match(s,/gl\.drawArrays\(gl\.TRIANGLE_STRIP,0,4\)/);
});
