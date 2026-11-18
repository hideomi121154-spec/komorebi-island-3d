import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../battle3d.js',import.meta.url),'utf8');
function battle(){const context={window:{}};runInNewContext(source,context);return context.window.KomorebiBattle;}
function mockMesh(){
 const mesh={draws:0,invalid:0};
 for(const name of ['sphere','box','cylinder','quad','tri','ellipseDisc']){
  mesh[name]=(...args)=>{mesh.draws++;for(const a of args)for(const n of Array.isArray(a)?a:[a])
   if(typeof n==='number'&&!Number.isFinite(n))mesh.invalid++};
 }
 return mesh;
}
test('original island battle is accessible and resets to new opponent each time',()=>{
 const b=battle(),s=b.create(),s2=b.create();
 assert.ok(b.marker.x<10&&b.marker.z<15);
 assert.equal(s.team.length,2);
 assert.equal(s.team[0].name,'ピリモ');
 assert.equal(s.foe.name,'ハルリザ');
 assert.equal(s.foe.hp,s.foe.maxHp);
 assert.equal(s.phase,'command');
 assert.equal(s.turn,0);
 assert.equal(b.moves.length,4);
 s.team[0].hp=1;
 assert.equal(s2.team[0].hp,s2.team[0].maxHp);
});
test('spark move is effective against leaf, enemy retaliates, and battle can be won',()=>{
 const b=battle(),s=b.create();
 const before=s.foe.hp;
 assert.equal(b.move(s,'thunder',()=>.5),true);
 assert.ok(s.foe.hp<=before-20,'electric attack should be stronger on leaf target');
 assert.ok(s.team[0].hp<s.team[0].maxHp);
 assert.match(s.log,/効果ばつぐん/);
 b.move(s,'thunder',()=>.5);
 b.move(s,'thunder',()=>.5);
 assert.equal(s.phase,'end');
 assert.equal(s.result,'win');
 assert.equal(s.foe.hp,0);
 assert.equal(b.move(s,'thunder',()=>.5),false,'completed battle cannot get extra turns');
});
test('switching friends and item healing both take one turn',()=>{
 const b=battle(),s=b.create();
 assert.equal(b.switchFriend(s),true);
 assert.equal(s.activeIndex,1);
 assert.equal(s.turn,1);
 const hero=s.team[1];hero.hp=16;
 assert.equal(b.item(s),true);
 assert.equal(s.kit,0);
 assert.ok(hero.hp>=16);
 assert.equal(s.turn,2);
 assert.equal(b.item(s),false,'one medicine only');
});
test('rest and retreat do not award victory and no move can happen afterward',()=>{
 const b=battle(),s=b.create();
 s.team[0].hp=16;
 assert.equal(b.move(s,'rest',()=>.5),true);
 assert.ok(s.team[0].hp>16);
 assert.equal(b.flee(s),true);
 assert.equal(s.result,'flee');
 assert.equal(s.phase,'end');
 assert.equal(b.switchFriend(s),false);
});
test('all experimental 3D battle geometry is finite and both cameras exist',()=>{
 const b=battle(),g=mockMesh(),d=mockMesh();
 b.drawStatic(g);
 b.drawDynamic(d,2500,b.create());
 assert.ok(g.draws>25);
 assert.ok(d.draws>20);
 assert.equal(g.invalid+d.invalid,0);
 const p=b.camera();
 assert.equal(p.eye.length,3);
 assert.equal(p.center.length,3);
 assert.ok(p.fov>=40&&p.fov<=65);
});
test('mobile page loads battle script before main game and provides working controls',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const i=html.indexOf('src="battle3d.js');
 const j=html.indexOf('src="game.js');
 assert.ok(i>0&&j>i);
 for(const id of ['battleBtn','battleHud','battleAttackBtn','battleFriendBtn','battleItemBtn','battleRunBtn',
   'battleMoves','battleMessage','battlePlayerHP','battleFoeHP','battleEndBtn']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 const game=readFileSync(new URL('../game.js',import.meta.url),'utf8');
 assert.match(game,/BATTLE.drawDynamic/);
 assert.match(game,/function startIslandBattle/);
 assert.match(game,/function finishIslandBattle/);
 assert.match(game,/battleWins/);
});
