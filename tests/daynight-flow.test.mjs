import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const daylightSource=readFileSync(resolve(dir,'daynight.js'),'utf8');
const gameSource=readFileSync(resolve(dir,'game.js'),'utf8');

function helpers(){
 const ctx={window:{}};
 new Script(daylightSource).runInNewContext(ctx);
 return ctx.window.KomorebiTime;
}
test('Clock formats in 24-hour Japanese time and reports the right periods',()=>{
 const t=helpers();
 assert.equal(t.format(0),'00:00');
 assert.equal(t.format(480),'08:00');
 assert.equal(t.format(1439.9),'23:59');
 assert.equal(t.format(1440),'00:00');
 assert.equal(t.phaseOf(480).label,'朝');
 assert.equal(t.phaseOf(720).label,'昼');
 assert.equal(t.phaseOf(1080).label,'夕方');
 assert.equal(t.phaseOf(1260).label,'夜');
});
test('Night is significantly darker than noon and blends through sunset',()=>{
 const t=helpers(),noon=t.paletteAt(720),sunset=t.paletteAt(1110),night=t.paletteAt(1260);
 assert.equal(noon.darkness,0);
 assert.ok(sunset.darkness>noon.darkness);
 assert.ok(night.darkness>sunset.darkness);
 assert.ok(night.stars>.5);
 assert.equal(noon.stars,0);
 assert.ok(night.top[0]<noon.top[0]);
 const near=t.paletteAt(1201),before=t.paletteAt(1199);
 assert.ok(Math.abs(near.top[0]-before.top[0])<.02,'no harsh jump around keyframes');
});
test('Clock advances 2 game minutes per real second and rolls into a new day',()=>{
 const t=helpers();
 assert.equal(t.advance(480,30).minutes,540);
 assert.equal(t.advance(480,30).days,0);
 const midnight=t.advance(1438,2);
 assert.equal(midnight.days,1);
 assert.equal(midnight.minutes,2);
 assert.equal(t.nextPeriod(480).minutes,720);
 assert.equal(t.nextPeriod(720).minutes,1080);
 assert.equal(t.nextPeriod(1080).minutes,1260);
 assert.equal(t.nextPeriod(1260).days,1);
 assert.equal(t.nextPeriod(1260).minutes,360);
});

function mockGame(saved){
 const elements=new Map(),listeners=new Map(),store=new Map();
 if(saved)store.set('komorebi_island_3d_v01',JSON.stringify(saved));
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
 let timer=0;
 const context={window,document,console,navigator:{},performance:{now:()=>0},
  localStorage:{getItem:key=>store.get(key)||null,setItem:(k,v)=>store.set(k,v)},
  requestAnimationFrame(){},setTimeout(){return ++timer},clearTimeout(){}};
 new Script(daylightSource).runInNewContext(context);
 new Script(gameSource).runInNewContext(context);
 listeners.get('DOMContentLoaded')();
 assert.ok(window.__komorebiTest,'game loaded');
 el('startBtn')._events.get('click')();
 return {api:window.__komorebiTest,el,store};
}
test('Old day-only saves get 08:00 and retain item balances',()=>{
 const {api,el}=mockGame({version:1,day:3,coins:27,inventory:{berry:2,seed:1},welcomeSeen:true});
 assert.equal(api.getClock().minutes,480);
 assert.equal(api.getClock().day,3);
 assert.equal(el('timePill').textContent.includes('08:00'),true);
 assert.equal(api.getState().inventory.berry,2);
 assert.equal(api.getState().coins,27);
 assert.equal(el('app').dataset.timePhase,'morning');
});
test('Tap the clock to preview noon, evening, night and next morning',()=>{
 const {api,el,store}=mockGame({version:1,day:1,timeMinutes:480,coins:27,welcomeSeen:true});
 el('timePill')._events.get('click')();
 assert.equal(api.getClock().minutes,720);
 assert.equal(api.getClock().phase,'day');
 el('timePill')._events.get('click')();
 assert.equal(api.getClock().minutes,1080);
 assert.equal(api.getClock().phase,'evening');
 el('timePill')._events.get('click')();
 assert.equal(api.getClock().minutes,1260);
 assert.equal(api.getClock().phase,'night');
 assert.equal(el('app').dataset.timePhase,'night');
 assert.ok(Number(el('nightSky').style.opacity)>.6);
 el('timePill')._events.get('click')();
 assert.equal(api.getClock().minutes,360);
 assert.equal(api.getClock().day,2);
 assert.equal(api.getState().coins,27);
 assert.equal(JSON.parse(store.get('komorebi_island_3d_v01')).timeMinutes,360);
});
test('The midnight rollover refreshes resources and the sleep button returns to 07:00',()=>{
 const {api,el}=mockGame({version:1,day:4,timeMinutes:1439,coins:27,harvested:[0,1],shells:[0],talkedDay:4,welcomeSeen:true});
 api.advanceClock(1);
 assert.equal(api.getClock().day,5);
 assert.equal(api.getClock().minutes,1);
 assert.equal(api.getState().harvested.length,0);
 assert.equal(api.getState().shells.length,0);
 assert.equal(api.getState().talkedDay,0);
 api.nextDay();
 assert.equal(api.getClock().day,6);
 assert.equal(api.getClock().minutes,420);
 assert.equal(el('timePill').textContent.includes('07:00'),true);
});
