import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../kart3d.js',import.meta.url),'utf8');
function boot(){
 const elements=new Map();
 const getElementById=id=>{
  if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',disabled:false,classList:{add(){},remove(){}},addEventListener(){}});
  return elements.get(id);
 };
 const E={canWalk:(x,z)=>Math.hypot(x,z)<15};
 const win={KomorebiExpansion:E,addEventListener(){}};
 vm.runInNewContext(source,{window:win,document:{getElementById},performance:{now:()=>5000},Math,Date},{filename:'kart3d.js'});
 return {kart:win.KomorebiKart,getElementById};
}
test('grand loop spans the island coast and bridges across the archipelago',()=>{
 const {kart}=boot();
 assert.ok(kart.length>320,'the full perimeter is dramatically longer than the old oval');
 assert.ok(kart.COURSE_BOUNDS.minX< -40&&kart.COURSE_BOUNDS.maxX>90);
 assert.ok(kart.COURSE_BOUNDS.minZ< -35&&kart.COURSE_BOUNDS.maxZ>70);
 assert.equal(kart.LAPS,3);
 assert.equal(kart.places[0].id,'kartTrack');
 assert.equal(kart.ITEM_DISTANCES.length,8);
 assert.equal(kart.ITEM_TYPES.length,5);
 for(const d of kart.ITEM_DISTANCES){
  const p=kart.at(d);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.yaw));
  assert.ok(kart.roadNearest(p.x,p.z).offset<.06);
 }
});
test('8 helmeted drivers and floating mystery gifts have bounded 3D geometry',()=>{
 const {kart}=boot(),count={box:0,sphere:0,cylinder:0,quad:0,invalid:0,transform:0};
 const builder={};
 for(const type of ['box','sphere','cylinder','quad','ellipseDisc','roof','tri']){
  builder[type]=(...a)=>{count[type]=(count[type]||0)+1;
   for(const v of a)if(typeof v==='number'&&!Number.isFinite(v))count.invalid++;
  };
 }
 builder.setTransform=()=>count.transform++;
 builder.clearTransform=()=>{};
 kart.drawTerrain(builder);kart.drawStatic(builder);
 kart.start();const before=count.box+count.sphere;
 kart.drawDynamic(builder,2400);
 assert.ok(count.box+count.sphere>before+200,'helmets, hands, vehicle chassis and item boxes are all visible');
 assert.ok(count.transform>=16,'8 driver karts and 8 pickup boxes');
 assert.equal(count.invalid,0);
 assert.ok(count.box+count.sphere<1500,'keep phone geometry bounded');
});
test('road pickups provide usable powerups that affect speed rather than only looking decorative',()=>{
 const {kart,getElementById}=boot();kart.start();
 let found=null;
 for(let i=0;i<2400;i++){
  kart.step(1/60);
  const state=kart.getState();
  if(state.item){found=state;break;}
 }
 assert.ok(found,'the self-steering racer must be able to drive through an item box');
 assert.equal(found.item,'turbo');
 assert.ok(found.pickups>=1);
 assert.equal(getElementById('kartItem').disabled,false);
 assert.equal(kart.useItem(),true);
 const after=kart.getState();
 assert.equal(after.item,null);
 assert.ok(after.player.boost>0,'item changes player speed');
 assert.equal(kart.useItem(),false,'cannot reuse a consumed item');
 kart.stop();
});
test('restart clears item effects and race state without corrupting island game',()=>{
 const {kart}=boot();kart.start();
 for(let i=0;i<450;i++)kart.step(1/60);
 kart.start();
 const state=kart.getState();
 assert.equal(state.item,null);
 assert.equal(state.pickups,0);
 assert.equal(state.shield,0);
 assert.equal(state.star,0);
 assert.equal(state.opponents.length,7);
 kart.stop();
 assert.equal(kart.active(),false);
});
test('HTML touch interface provides item button and item world animation',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
 assert.match(html,/id="kartItem"/);
 assert.match(html,/kart3d\.js\?v=20261113-v37/);
 assert.match(game,/KART\.drawDynamic\(b,now\)/);
 assert.match(source,/function useItem\(\)/);
 assert.match(source,/itemBtn\.disabled=/);
 assert.match(source,/KeyE/);
 assert.match(game,/komorebi_island_3d_v01/);
});
