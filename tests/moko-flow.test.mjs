import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mokoCode=readFileSync(resolve(dir,'moko3d.js'),'utf8');
const timeCode=readFileSync(resolve(dir,'daynight.js'),'utf8');
const gameCode=readFileSync(resolve(dir,'game.js'),'utf8');

function creature(){
 const w={};new Script(mokoCode).runInNewContext({window:w});
 return w.KomorebiMoko;
}
test('Original Moko 3D body consists of procedural meshes and leaf sprout',()=>{
 const M=creature(),at=M.poseAt(2200,'day');
 const counter={sphere:0,box:0,cylinder:0,setTransform(){},clearTransform(){}};
 for(const k of ['sphere','box','cylinder'])counter[k]=function(){this[k+'Count']=(this[k+'Count']||0)+1};
 M.draw(counter,at,0,2200);
 assert.ok(counter.sphereCount>=14);
 assert.ok(counter.cylinderCount>=1);
 assert.ok(counter.boxCount>=2);
 assert.equal(M.waypoints.length,6);
});
test('Moko strolls between open plaza waypoints, rests at night and stops for dialogue',()=>{
 const M=creature(),start=M.poseAt(0,'day'),middle=M.poseAt(3200,'day'),idle=M.poseAt(6000,'day');
 assert.notEqual(start.x,middle.x);
 assert.equal(idle.moving,false);
 const night=M.poseAt(13000,'night');
 assert.equal(night.sleepy,true);
 assert.ok(Math.abs(night.x+3.15)<.02);
 const held=M.poseAt(20000,'day',middle);
 assert.equal(held.x,middle.x);
 assert.equal(held.z,middle.z);
 assert.equal(held.moving,false);
 assert.match(M.talk('night'),/おほしさま/);
 assert.match(M.talk('day',true),/木の実/);
});
function mockGame(initialSaved=null,startEpoch=Date.parse('2026-11-10T12:35:00Z')){
 const elements=new Map(),listeners=new Map(),saved=new Map();
 if(initialSaved)saved.set('komorebi_island_3d_v01',JSON.stringify(initialSaved));
 let now=0,epoch=startEpoch,unique=0;
 class FakeDate extends Date{static now(){return epoch}}
 function element(id){
  if(elements.has(id))return elements.get(id);
  const events=new Map(),classNames=new Set();
  const el={id,hidden:true,disabled:false,textContent:'',dataset:{},
   style:{setProperty(k,v){this[k]=v}},children:[],offsetWidth:270,offsetHeight:110,
   clientWidth:390,clientHeight:790,
   classList:{add(k){classNames.add(k)},remove(k){classNames.delete(k)},
     contains(k){return classNames.has(k)},
     toggle(k,force){const value=force===undefined?!classNames.has(k):force;if(value)classNames.add(k);else classNames.delete(k);return value}},
   setAttribute(){},addEventListener(kind,fn){events.set(kind,fn)},focus(){},
   appendChild(child){this.children.push(child)},append(...args){this.children.push(...args)},
   replaceChildren(...args){this.children=[...args]},
   getContext(kind){return id==='gameCanvas'&&kind==='2d'?{}:null},
   _events:events};
  elements.set(id,el);return el;
 }
 const doc={readyState:'loading',hidden:false,activeElement:null,getElementById:element,
  createElement:tag=>element('generated-'+(++unique)+'-'+tag),
  querySelectorAll(){return []},
  querySelector(selector){assert.equal(selector,'.bottom-ui');return element('bottom-ui')},
  addEventListener(kind,fn){listeners.set(kind,fn)}};
 const win={devicePixelRatio:1,addEventListener(){}};
 const ctx={window:win,document:doc,console,navigator:{},Date:FakeDate,
  performance:{now:()=>now},requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},
  localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)}};
 new Script(mokoCode).runInNewContext(ctx);
 new Script(timeCode).runInNewContext(ctx);
 new Script(gameCode).runInNewContext(ctx);
 listeners.get('DOMContentLoaded')();
 assert.ok(win.__komorebiTest,'game initialization');
 element('startBtn')._events.get('click')();
 const api=win.__komorebiTest;
 function standNextToMoko(){
  const p=api.getMokoPose();api.moveTo(p.x,p.z);
  assert.equal(api.getNear().id,'moko');
 }
 function press(label){
  const btn=element('roomDialogActions').children.find(c=>c.textContent.includes(label));
  assert.ok(btn,'button not found: '+label);
  btn._events.get('click')();
 }
 function changeDay(){
  epoch+=86400000;api.syncClock(epoch);api.updateMoko(now);
 }
 return {api,element,saved,standNextToMoko,press,changeDay,setNow:n=>{now=n;api.updateMoko(n)}};
}
test('Talk to Moko in the same 3D island and receive exactly one berry per real day',()=>{
 const {api,element,standNextToMoko,press,changeDay,saved}=mockGame();
 standNextToMoko();api.interact();
 assert.equal(api.getSpeechActor(),'moko');
 assert.equal(element('speechBubble').hidden,false);
 assert.equal(element('speechName').textContent,'🌿 モコ');
 assert.equal(api.getState().inventory.berry,1);
 assert.equal(api.getState().mokoGiftDay,api.getState().day);
 assert.equal(element('panelOverlay').hidden,true);
 const original=api.getMokoPose();
 api.updateMoko(29000);
 assert.equal(api.getMokoPose().x,original.x,'Moko waits while talking');
 press('もっとおはなし');
 assert.match(element('speechText').textContent,/木の実がすき/);
 press('またね');
 assert.equal(api.getSpeechActor(),null);
 assert.equal(element('speechBubble').hidden,true);
 standNextToMoko();api.interact();
 assert.equal(api.getState().inventory.berry,1,'cannot farm duplicate gifts through dialogue');
 press('またね');
 changeDay();
 standNextToMoko();api.interact();
 assert.equal(api.getState().inventory.berry,2,'new JST day unlocks gift');
 assert.equal(JSON.parse(saved.get('komorebi_island_3d_v01')).inventory.berry,2);
});
test('Moko and Mimi maintain independent once-per-day gifts and older saves work',()=>{
 const {api,standNextToMoko,press}=mockGame({version:1,day:5,coins:27,realDateKey:'2026-11-10',talkedDay:5,inventory:{berry:2,seed:1},welcomeSeen:true});
 standNextToMoko();api.interact();
 assert.equal(api.getState().inventory.berry,3);
 assert.equal(api.getState().inventory.seed,1);
 press('またね');
 api.moveTo(1.9,.9);api.interact();
 assert.equal(api.getSpeechActor(),'mimi');
 assert.equal(api.getState().inventory.seed,1,'Mimi already gave her own daily gift');
});
test('Moko gives different dialogue after dark near the home, without needing new images',()=>{
 const {api,element,standNextToMoko}=mockGame(null,Date.parse('2026-11-10T13:00:00Z'));
 api.updateMoko(1800);
 assert.equal(api.getMokoPose().sleepy,true);
 standNextToMoko();api.interact();
 assert.match(element('speechText').textContent,/おほしさま/);
 assert.equal(api.getSpeechActor(),'moko');
});
