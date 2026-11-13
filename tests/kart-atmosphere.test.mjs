import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../kart3d.js',import.meta.url),'utf8');
function boot(){
 const els=new Map();
 const document={getElementById:id=>{if(!els.has(id))els.set(id,{hidden:true,textContent:'',disabled:false,classList:{add(){},remove(){}},addEventListener(){}});return els.get(id);}};
 const window={KomorebiExpansion:{canWalk:()=>true},addEventListener(){}};
 vm.runInNewContext(source,{window,document,performance:{now:()=>1000},Math,Date},{filename:'kart3d.js'});
 return window.KomorebiKart;
}
function builder(){
 let shapes=0,invalid=0,transforms=0,resets=0;
 const b={};
 for(const name of ['box','sphere','cylinder','quad','ellipseDisc','tri','roof']){
  b[name]=(...values)=>{
   shapes++;
   for(const val of values)for(const n of Array.isArray(val)?val:[val])
    if(typeof n==='number'&&!Number.isFinite(n))invalid++;
  };
 }
 b.setTransform=()=>{transforms++};
 b.clearTransform=()=>{resets++};
 return {b,counts:()=>({shapes,invalid,transforms,resets})};
}
test('six grandstands and five original event sponsors surround the full circuit',()=>{
 const kart=boot();
 assert.equal(kart.VENUES.length,6);
 assert.equal(kart.SPONSORS.length,5);
 assert.equal(new Set(Array.from(kart.SPONSORS,brand=>brand.code)).size,5);
 for(const venue of kart.VENUES){
  const road=kart.at(venue.fraction*kart.length),pos=kart.venuePosition(venue);
  assert.ok(Number.isFinite(pos.x)&&Number.isFinite(pos.z));
  assert.ok(Math.hypot(road.x-pos.x,road.z-pos.z)>kart.WIDTH+8,'bleachers must be outside racing lane');
 }
 assert.ok(kart.VENUES[0].fraction<.1&&kart.VENUES.at(-1).fraction>.9);
});
test('crowds, sponsor pixel lettering and multiple bridges produce valid limited geometry',()=>{
 const kart=boot(),out=builder();
 kart.drawStatic(out.b);
 const c=out.counts();
 assert.ok(c.shapes>700,'crowded stands and sponsor lettering must be visible 3D models');
 assert.ok(c.shapes<3300,'cap geometry on iPhone Safari');
 assert.equal(c.invalid,0,'all crowd and sponsor coordinates are finite');
 assert.ok(c.transforms>=10,'billboards and sponsor gantries should be aligned with the track');
 assert.equal(c.transforms,c.resets,'all transforms are cleared');
});
test('cheering flags animate only during race and do not explode polygon count',()=>{
 const kart=boot();kart.start();
 const out=builder();kart.drawDynamic(out.b,2500);
 const c=out.counts();
 assert.ok(c.shapes>100,'cars, spectators and item boxes render in live race');
 assert.ok(c.shapes<1200,'live crowd animation must stay lightweight');
 assert.equal(c.invalid,0);
 assert.equal(c.transforms,c.resets);
 kart.stop();
 const empty=builder();kart.drawDynamic(empty.b,3500);
 assert.equal(empty.counts().shapes,0);
});
test('scoreboard displays fictional event partners in both title and iPhone HUD',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(html,/id="kartSponsors"/);
 assert.match(html,/KOMO MOTOR/);
 assert.match(html,/MINT ENERGY/);
 assert.match(html,/NOVA TECH/);
 assert.match(html,/kart3d\.js\?v=20261113-v38/);
 assert.match(css,/\.kart-sponsor-strip/);
 assert.match(source,/観客席から大歓声/);
});
