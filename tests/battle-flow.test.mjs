import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=file=>readFileSync(resolve(dir,file),'utf8');
function boot(){
 const nodes=new Map(),events=new Map(),storage=new Map();
 let now=0,created=0;
 const oldSave={version:1,coins:120,day:2,welcomeSeen:true,x:0,z:3,
   inventory:{berry:2,wood:2,seed:2},claimed:[false,false,false]};
 storage.set('komorebi_island_3d_v01',JSON.stringify(oldSave));
 const node=id=>{
  if(nodes.has(id))return nodes.get(id);
  const handlers=new Map(),classes=new Set();
  const e={id,hidden:true,disabled:false,textContent:'',style:{},dataset:{},children:[],clientWidth:390,clientHeight:844,
   classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:(k,v)=>{if(v===undefined?!classes.has(k):v){classes.add(k);return true}classes.delete(k);return false}},
   addEventListener:(k,f)=>handlers.set(k,f),_handlers:handlers,
   appendChild(child){this.children.push(child);return child},
   append(...items){this.children.push(...items)},replaceChildren(...items){this.children=[...items]},
   setAttribute(k,v){this[k]=v},focus(){},
   getContext(t){if(t!=='2d')return null;if(id==='gameCanvas')return {};if(id.endsWith('-canvas'))return new Proxy({},{get(){return()=>{}},set(){return true}});return null}};
  nodes.set(id,e);return e;
 };
 const document={readyState:'loading',hidden:false,getElementById:node,activeElement:null,
   addEventListener:(k,f)=>events.set(k,f),createElement:t=>node('created-'+(++created)+'-'+t),
   querySelectorAll:()=>[],querySelector:()=>node('bottom-ui')};
 const context={window:{addEventListener(){},devicePixelRatio:1},document,navigator:{},performance:{now:()=>now},console,
   requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},
   localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 for(const script of ['daynight.js','moko3d.js','expansion3d.js','redevelopment3d.js','sealine3d.js','battle3d.js','battle-effects.js','game.js'])
  new Script(src(script)).runInNewContext(context);
 const start=events.get('DOMContentLoaded');assert.ok(start);start();
 const api=context.window.__komorebiTest;assert.ok(api,'game boots with commercial island');
 node('startBtn')._handlers.get('click')();
 return {api,node,storage,clock:t=>now=t};
}

test('live island battle starts from visible button and 3D command UI, wins reward once and returns home',()=>{
 const {api,node,storage,clock}=boot();
 const startPosition=api.getState(),coins=api.getState().coins;
 node('battleBtn')._handlers.get('click')();
 let s=api.getBattle();
 assert.ok(s?.active);
 assert.equal(node('battleHud').hidden,false);
 assert.equal(node('app').classList.contains('battling'),true);
 assert.equal(s.foe.name,'ハルリザ');
 node('battleAttackBtn')._handlers.get('click')();
 assert.equal(node('battleMoves').hidden,false,'fight button must expose four attacks');
 assert.equal(node('battleActions').hidden,true,'move choices must replace main buttons, not stack under them');
 assert.equal(node('battleBackBtn').hidden,false);
 assert.equal(api.battleAction('thunder'),true);
 assert.ok(api.getBattle().foe.hp<s.foe.hp);
 assert.equal(api.battleAction('thunder'),false,'rapid taps cannot skip the attack animation');
 clock(3501);
 assert.equal(api.battleAction('thunder'),true);
 clock(7002);
 assert.equal(api.battleAction('thunder'),true);
 s=api.getBattle();
 assert.equal(s.result,'win');
 assert.equal(s.phase,'end');
 assert.equal(api.getState().coins,coins+60);
 assert.equal(api.getState().battleWins,1);
 assert.equal(node('battleEndBtn').hidden,false);
 assert.equal(api.battleAction('thunder'),false,'victory cannot pay again');
 node('battleEndBtn')._handlers.get('click')();
 assert.equal(api.getBattle(),null);
 assert.equal(node('battleHud').hidden,true);
 assert.equal(api.getState().x,startPosition.x);
 assert.equal(api.getState().z,startPosition.z);
 assert.equal(node('app').classList.contains('battling'),false);
 const saved=JSON.parse(storage.get('komorebi_island_3d_v01'));
 assert.equal(saved.battleWins,1);
 assert.equal(saved.inventory.berry,2);
 assert.equal(saved.version,1);
});
test('player may forfeit a battle and resume without losing coins or save',()=>{
 const {api,node}=boot(),original=api.getState();
 assert.equal(api.startIslandBattle(),true);
 assert.equal(api.getBattle().active,true);
 node('battleRunBtn')._handlers.get('click')();
 assert.equal(api.getBattle(),null);
 assert.equal(api.getState().coins,original.coins);
 assert.equal(api.getState().battleWins,0);
 assert.equal(api.getState().x,original.x);
 assert.equal(api.getState().z,original.z);
});

test('back button restores compact battle commands without ending the duel',()=>{
 const {api,node}=boot();
 assert.equal(api.startIslandBattle(),true);
 node('battleAttackBtn')._handlers.get('click')();
 assert.equal(node('battleActions').hidden,true);
 node('battleBackBtn')._handlers.get('click')();
 assert.equal(node('battleActions').hidden,false);
 assert.equal(node('battleMoves').hidden,true);
 assert.equal(api.getBattle().phase,'command');
 api.finishIslandBattle();
 assert.equal(api.getBattle(),null);
});
