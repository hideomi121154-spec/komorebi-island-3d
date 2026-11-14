import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const game=fs.readFileSync(new URL('../kart3d.js',import.meta.url),'utf8');
function boot(){
 const elems=new Map();
 const getElementById=id=>{
  if(!elems.has(id))elems.set(id,{hidden:true,textContent:'',disabled:false,classList:{add(){},remove(){}},addEventListener(){}});
  return elems.get(id);
 };
 const window={KomorebiExpansion:{canWalk:()=>true},addEventListener(){}};
 vm.runInNewContext(game,{window,document:{getElementById},performance:{now:()=>5000},Math,Date},{filename:'kart3d.js'});
 return window.KomorebiKart;
}
test('8-AI spectators have fixed entrants known before the race',()=>{
 const kart=boot(),seed=1189,preview=kart.forecastGrid(seed);
 assert.equal(preview.length,8);
 kart.start({spectator:true,seed,playerAtBack:true});
 const x=kart.getState();
 assert.equal(x.spectator,true);
 assert.equal(x.grid.length,8);
 assert.deepEqual(Array.from(x.grid.map(p=>p.number)),[1,2,3,4,5,6,7,8]);
 for(let i=0;i<8;i++)assert.equal(x.grid[i].speed,preview[i].speed);
 kart.stop();
});
test('AI spectator race simulates all eight karts until an eight-place finish order',()=>{
 const kart=boot();kart.start({spectator:true,seed:9123,playerAtBack:true});
 const before=kart.getState();
 for(let frame=0;frame<8500&&!kart.finished();frame++)kart.step(.05);
 const result=kart.getState();
 assert.equal(result.finished,true,'the spectator race should actually reach its finish line');
 assert.equal(result.finishOrder.length,8);
 assert.equal(new Set(result.finishOrder).size,8);
 assert.ok(result.elapsed>30);
 assert.ok(result.player.distance>before.player.distance+kart.length*2);
 assert.equal(result.place,result.finishOrder.indexOf(1)+1);
 kart.stop();
});
test('normal race is still controlled by player and does not invent a betting finish',()=>{
 const kart=boot();
 kart.start({playerAtBack:true});
 const x=kart.getState();
 assert.equal(x.spectator,false);
 assert.equal(x.grid.length,0);
 assert.equal(x.finishOrder.length,0);
 kart.stop();
});
test('spectator page includes entry choices, race broadcast and separate wallet library',()=>{
 const html=fs.readFileSync(new URL('../kart-next.html',import.meta.url),'utf8');
 const scene=fs.readFileSync(new URL('../kart-next-scene.js',import.meta.url),'utf8');
 const code=fs.readFileSync(new URL('../kart-next.js',import.meta.url),'utf8');
 for(const id of ['watchRace','forecastOverlay','raceLineup','medalBalance','betType','pick1','pick2','pick3','stake','oddsPreview','betHistory','watchBegin','spectatorBoard','livePositions','spectatorCamera','resultPayout']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(code,/startRace\(\{mode:'spectate'\}\)/);
 assert.match(code,/settleTicket\(localStorage/);
 assert.match(scene,/setSpectatorCamera:/);
 assert.match(html,/現金・購入・換金・譲渡なし/);
});
