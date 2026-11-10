import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const game=readFileSync(resolve(dir,'game.js'),'utf8');
const water=readFileSync(resolve(dir,'watering3d.js'),'utf8');
const daynight=readFileSync(resolve(dir,'daynight.js'),'utf8');
function mockGame(saved=null){
 const nodes=new Map(),listeners=new Map(),timers=new Map(),local=new Map();
 if(saved)local.set('komorebi_island_3d_v01',JSON.stringify(saved));
 let now=0,id=0,wallNow=Date.parse('2026-11-10T11:40:00Z');
 class FakeDate extends Date {static now(){return wallNow}}
 function el(key){
  if(!nodes.has(key)){
   const events=new Map();
   nodes.set(key,{id:key,hidden:true,disabled:false,textContent:'',dataset:{},
    classList:{add(){},remove(){},contains(){return false}},
    addEventListener(type,cb){events.set(type,cb)},focus(){},_events:events,
    getContext(type){return key==='gameCanvas'&&type==='2d'?{}:null}});
  }
  return nodes.get(key);
 }
 const document={readyState:'loading',activeElement:null,hidden:false,getElementById:el,
  querySelectorAll(){return []},querySelector(){return el('bottom-ui')},
  addEventListener(type,fn){listeners.set(type,fn)}};
 const window={devicePixelRatio:1,addEventListener(){}};
 const context={document,window,console,navigator:{},Date:FakeDate,performance:{now:()=>now},
  localStorage:{getItem:key=>local.get(key)||null,setItem:(key,value)=>local.set(key,value)},
  requestAnimationFrame(){},
  setTimeout(cb,ms){const key=++id;timers.set(key,{time:now+ms,cb});return key},
  clearTimeout(key){timers.delete(key)}};
 new Script(water).runInNewContext(context);
 new Script(daynight).runInNewContext(context);
 new Script(game).runInNewContext(context);
 listeners.get('DOMContentLoaded')();
 el('startBtn')._events.get('click')();
 const api=window.__komorebiTest;assert.ok(api,'game initialization');
 function advance(delta){
  const target=now+delta;
  for(let count=0;count<1000;count++){
   let chosen=null;
   for(const [key,v] of timers)if(v.time<=target&&(!chosen||v.time<chosen.v.time))chosen={key,v};
   if(!chosen){now=target;return}
   timers.delete(chosen.key);now=chosen.v.time;chosen.v.cb();
  }
  throw Error('timer runaway');
 }
 function plot(index=0){const x=[5,6.6,8.2][index];api.moveTo(x,6)}
 function advanceRealDay(){wallNow+=86400000;api.syncClock(wallNow)}
 return {api,el,plot,advance,advanceRealDay,local,document,listeners};
}
test('Watering can animation is 3D and a watered plant grows a day faster',()=>{
 const {api,el,plot,advance,advanceRealDay,local}=mockGame();
 plot(0);api.interact(); // plant
 assert.equal(api.getState().inventory.seed,1);
 assert.equal(api.plotActionLabel(0),'💧 水をあげる');
 api.interact(); // water
 assert.equal(api.getWatering().active,true);
 assert.equal(el('actionBtn').disabled,true);
 assert.equal(api.getState().farm[0].wateredDay,1);
 assert.equal(api.getState().farm[0].wateredEver,true);
 const vertices=api.previewWaterMesh();
 assert.ok(vertices.length>1500,'animated 3D watering can and droplets have real vertices');
 const saved=JSON.parse(local.get('komorebi_island_3d_v01'));
 assert.equal(saved.farm[0].wateredEver,true,'watering persists in v1 save');
 advance(1700);
 assert.equal(api.getWatering().active,false);
 assert.equal(el('actionBtn').disabled,false);
 assert.equal(api.plotActionLabel(0),'💦 水やり済み');
 api.interact();assert.equal(api.getWatering().active,false,'same-day double-watering must fail');
 advanceRealDay();
 assert.equal(api.plotActionLabel(0),'🥕 収穫する');
 api.interact();assert.equal(api.getState().inventory.carrot,3);
 assert.equal(api.getState().farm[0],null);
});
test('Without watering, an old-style crop still grows in two days',()=>{
 const {api,plot,advanceRealDay}=mockGame();
 plot(1);api.interact();
 advanceRealDay();assert.equal(api.plotActionLabel(1),'💧 水をあげる');
 advanceRealDay();assert.equal(api.plotActionLabel(1),'🥕 収穫する');
 api.interact();assert.equal(api.getState().inventory.carrot,3);
});
test('Old version one save data loads and can receive first watering',()=>{
 const saved={version:1,day:4,coins:120,x:5,z:6,angle:0,inventory:{seed:2},farm:[{day:4},null,null]};
 const {api,plot,advance}=mockGame(saved);
 plot();assert.equal(api.cropGrowth(api.getState().farm[0]),0);
 api.interact();assert.equal(api.getWatering().active,true);
 advance(1700);assert.equal(api.cropGrowth(api.getState().farm[0]),1);
});
test('Backgrounding during watering finishes cleanly without locking controls',()=>{
 const {api,plot,document,listeners,el}=mockGame();
 plot(0);api.interact();api.interact();
 assert.equal(api.getWatering().active,true);
 document.hidden=true;listeners.get('visibilitychange')();
 assert.equal(api.getWatering().active,false);
 assert.equal(el('actionBtn').disabled,false);
 assert.equal(api.getState().farm[0].wateredDay,1);
});
