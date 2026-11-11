import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const daylightSource=readFileSync(resolve(dir,'daynight.js'),'utf8');
const gameSource=readFileSync(resolve(dir,'game.js'),'utf8');
const mokoSource=readFileSync(resolve(dir,'moko3d.js'),'utf8');

function helpers(){
 const ctx={window:{}};
 new Script(daylightSource).runInNewContext(ctx);
 return ctx.window.KomorebiTime;
}
test('Real Japanese time formatting and four time periods',()=>{
 const t=helpers();
 assert.equal(t.format(0),'00:00');
 assert.equal(t.format(480),'08:00');
 assert.equal(t.format(1439.9),'23:59');
 assert.equal(t.phaseOf(480).label,'朝');
 assert.equal(t.phaseOf(720).label,'昼');
 assert.equal(t.phaseOf(1080).label,'夕方');
 assert.equal(t.phaseOf(1260).label,'夜');
});
test('Actual clock displays JST even if the machine clock uses another zone',()=>{
 const t=helpers();
 const atEightFiftyOne=t.realTimeAt(Date.parse('2026-11-10T11:51:23Z'));
 assert.equal(atEightFiftyOne.formatted,'20:51');
 assert.equal(atEightFiftyOne.hour,20);
 assert.equal(atEightFiftyOne.minute,51);
 assert.equal(atEightFiftyOne.dateKey,'2026-11-10');
 assert.equal(atEightFiftyOne.timeZone,'Asia/Tokyo');
 const nextDay=t.realTimeAt(Date.parse('2026-11-10T15:00:00Z'));
 assert.equal(nextDay.formatted,'00:00');
 assert.equal(nextDay.dateKey,'2026-11-11');
 assert.equal(t.calendarDayDiff('2026-11-10','2026-11-11'),1);
 assert.equal(t.calendarDayDiff('2026-11-30','2026-12-02'),2);
 assert.equal(t.calendarDayDiff('2026-11-11','2026-11-10'),-1);
});
test('Night stays darker than noon with gradual dusk transitions',()=>{
 const t=helpers(),noon=t.paletteAt(720),sunset=t.paletteAt(1110),night=t.paletteAt(1260);
 assert.equal(noon.darkness,0);
 assert.ok(sunset.darkness>noon.darkness);
 assert.ok(night.darkness>sunset.darkness);
 assert.ok(night.stars>.5);
 assert.equal(noon.stars,0);
 const a=t.paletteAt(1199),b=t.paletteAt(1201);
 assert.ok(Math.abs(a.top[0]-b.top[0])<.02);
});

function mockGame(saved,initialEpoch=Date.parse('2026-11-10T11:51:00Z')){
 const elements=new Map(),listeners=new Map(),store=new Map();
 if(saved)store.set('komorebi_island_3d_v01',JSON.stringify(saved));
 let systemEpoch=initialEpoch,timer=0;
 class FakeDate extends Date { static now(){return systemEpoch;} }
 function el(key){
  if(!elements.has(key)){
   const callbacks=new Map();
   elements.set(key,{id:key,hidden:true,disabled:false,textContent:'',style:{},dataset:{},
    classList:{add(){},remove(){}},
    setAttribute(name,value){this[name]=value},
    addEventListener(name,fn){callbacks.set(name,fn)},_events:callbacks,focus(){},
    getContext(type){return key==='gameCanvas'&&type==='2d'?{}:null}});
  }
  return elements.get(key);
 }
 const document={readyState:'loading',hidden:false,getElementById:el,activeElement:null,
  querySelectorAll(){return []},querySelector(){return el('bottom-ui')},
  addEventListener(name,fn){listeners.set(name,fn)}
 };
 const window={addEventListener(){},devicePixelRatio:1};
 const context={window,document,console,navigator:{},performance:{now:()=>0},
  Date:FakeDate,
  localStorage:{getItem:key=>store.get(key)||null,setItem:(k,v)=>store.set(k,v)},
  requestAnimationFrame(){},setTimeout(){return ++timer},clearTimeout(){}};
 new Script(daylightSource).runInNewContext(context);
 new Script(mokoSource).runInNewContext(context);
 new Script(readFileSync(new URL('../expansion3d.js',import.meta.url),'utf8')).runInNewContext(context);
  new Script(readFileSync(new URL('../redevelopment3d.js',import.meta.url),'utf8')).runInNewContext(context);
  new Script(gameSource).runInNewContext(context);
 listeners.get('DOMContentLoaded')();
 assert.ok(window.__komorebiTest,'game loaded');
 el('startBtn')._events.get('click')();
 const api=window.__komorebiTest;
 function setWallTime(epoch){
  systemEpoch=typeof epoch==='string'?Date.parse(epoch):epoch;
  return api.syncClock(systemEpoch);
 }
 return {api,el,store,setWallTime,document,listeners};
}

test('Old accelerated-time save is upgraded without changing inventory or day number',()=>{
 const {api,el,store}=mockGame({version:1,day:3,timeMinutes:480,coins:27,inventory:{berry:2,seed:1},welcomeSeen:true});
 assert.equal(api.getClock().day,3);
 assert.equal(api.getClock().dateKey,'2026-11-10');
 assert.equal(Math.floor(api.getClock().minutes),20*60+51);
 assert.match(el('timePill').textContent,/20:51 夜 · JST/);
 assert.equal(el('app').dataset.timePhase,'night');
 assert.equal(api.getState().inventory.berry,2);
 assert.equal(api.getState().coins,27);
 el('nextDayBtn')._events.get('click')();
 assert.equal(api.getClock().day,3,'manual save should not skip a real date');
 assert.equal(JSON.parse(store.get('komorebi_island_3d_v01')).realDateKey,'2026-11-10');
 assert.equal(el('timePill')._events.has('click'),false,'JST time is read-only');
});
test('1 real minute equals 1 game clock minute, not an accelerated minute',()=>{
 const {api,el,setWallTime}=mockGame({version:1,day:1,welcomeSeen:true});
 const before=api.getClock().minutes;
 setWallTime('2026-11-10T11:52:00Z');
 assert.equal(Math.floor(api.getClock().minutes-before),1);
 assert.match(el('timePill').textContent,/20:52/);
 assert.equal(api.getClock().day,1);
});
test('A real midnight refreshes resources without moving the simulated sky by hand',()=>{
 const {api,store,setWallTime}=mockGame({
  version:1,day:4,realDateKey:'2026-11-10',coins:27,harvested:[0,1],shells:[0],talkedDay:4,welcomeSeen:true
 },Date.parse('2026-11-10T14:59:30Z'));
 assert.equal(api.getClock().day,4);
 const result=setWallTime('2026-11-10T15:00:05Z');
 assert.equal(result.daysPassed,1);
 assert.equal(api.getClock().day,5);
 assert.equal(api.getClock().dateKey,'2026-11-11');
 assert.equal(Math.floor(api.getClock().minutes),0);
 assert.equal(api.getState().harvested.length,0);
 assert.equal(api.getState().shells.length,0);
 assert.equal(api.getState().talkedDay,0);
 assert.equal(JSON.parse(store.get('komorebi_island_3d_v01')).realDateKey,'2026-11-11');
});
test('Closing the app for several days advances resources and crops exactly by calendar days',()=>{
 const {api}=mockGame({version:1,day:5,coins:27,realDateKey:'2026-11-07',
  harvested:[0],shells:[1],farm:[{day:4},null,null],welcomeSeen:true});
 assert.equal(api.getClock().day,8);
 assert.equal(api.getState().harvested.length,0);
 assert.equal(api.getState().shells.length,0);
 assert.equal(api.cropGrowth(api.getState().farm[0]),4);
});
test('Moving the system date backward does not grant repeat daily rewards',()=>{
 const {api,setWallTime}=mockGame({version:1,day:8,realDateKey:'2026-11-10',coins:27,welcomeSeen:true});
 setWallTime('2026-11-09T11:51:00Z');
 assert.equal(api.getClock().day,8);
 assert.equal(api.getClock().dateKey,'2026-11-10');
 setWallTime('2026-11-10T11:52:00Z');
 assert.equal(api.getClock().day,8);
});
test('On returning from background the clock resynchronizes immediately',()=>{
 const {api,document,listeners,setWallTime}=mockGame({version:1,day:1,welcomeSeen:true});
 document.hidden=true;
 listeners.get('visibilitychange')();
 document.hidden=false;
 setWallTime('2026-11-10T12:51:00Z');
 listeners.get('visibilitychange')();
 assert.equal(Math.floor(api.getClock().minutes),21*60+51);
});
