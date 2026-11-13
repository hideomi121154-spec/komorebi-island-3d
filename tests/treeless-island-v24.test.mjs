import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=p=>readFileSync(resolve(root,p),'utf8');
function loadScene(){
 const ctx={window:{}};
 for(const p of ['expansion3d.js','sealine3d.js','world-expansion-v23.js'])
  new Script(src(p),{filename:p}).runInNewContext(ctx);
 return ctx.window;
}
function geometry(){
 const a={calls:0,invalid:0};
 for(const key of ['box','roof','tri','quad','sphere','cylinder','ellipseDisc']){
  a[key]=(...args)=>{a.calls++;
   for(const v of args)for(const n of Array.isArray(v)?v:[v])
    if(typeof n==='number'&&!Number.isFinite(n))a.invalid++;
  };
 }
 a.setTransform=()=>{};a.clearTransform=()=>{};return a;
}
function boot({reload=false}={}){
 const nodes=new Map(),events=new Map(),storage=new Map(),windowEvents=new Map();
 let created=0,now=0,reloadCount=0;
 const old={version:1,coins:87,day:4,welcomeSeen:true,x:0,z:3,
  inventory:{berry:1,wood:3,seed:2},harvested:[0,2],claimed:[false,false,false]};
 const key='komorebi_island_3d_v01';
 storage.set(key,JSON.stringify(old));
 const node=id=>{
  if(nodes.has(id))return nodes.get(id);
  const handlers=new Map(),classes=new Set();
  const e={id,hidden:true,disabled:false,textContent:'',style:{},dataset:{},
   children:[],clientWidth:390,clientHeight:844,
   classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:(k,v)=>{if(v===undefined?!classes.has(k):v){classes.add(k);return true}classes.delete(k);return false}},
   addEventListener:(k,f)=>handlers.set(k,f),_handlers:handlers,
   appendChild(child){this.children.push(child);return child},
   append(...items){this.children.push(...items)},replaceChildren(...items){this.children=[...items]},
   setAttribute(k,v){this[k]=v},focus(){},click(){},
   getContext(type){if(type!=='2d')return null;if(id==='gameCanvas')return {};
    if(id.endsWith('-canvas'))return new Proxy({},{get(){return()=>{}},set(){return true}});
    return null;}
  };
  nodes.set(id,e);return e;
 };
 const document={readyState:'loading',hidden:false,getElementById:node,activeElement:null,
  addEventListener:(k,f)=>events.set(k,f),createElement:t=>node('created-'+(++created)+'-'+t),
  querySelectorAll:()=>[],querySelector:()=>node('bottom-ui')};
 const win={addEventListener:(k,f)=>windowEvents.set(k,f),devicePixelRatio:1};
 if(reload)win.location={reload(){reloadCount++;windowEvents.get('pagehide')?.()}};
 const context={window:win,document,navigator:{},console,
  performance:{now:()=>now},requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 for(const p of ['daynight.js','moko3d.js','expansion3d.js','redevelopment3d.js',
                 'sealine3d.js','world-expansion-v23.js','game.js'])
  new Script(src(p),{filename:p}).runInNewContext(context);
 const start=events.get('DOMContentLoaded');assert.ok(start);start();
 const api=context.window.__komorebiTest;assert.ok(api);
 node('startBtn')._handlers.get('click')();
 return {api,node,storage,key,initial:old,reloads:()=>reloadCount,findInput:()=>[...nodes.values()].find(x=>x.id.endsWith('-input'))};
}
function action(node,label){
 const control=node('panelContent').children.find(e=>String(e.textContent||'').includes(label));
 assert.ok(control,'Missing action: '+label);
 const click=control._handlers.get('click');assert.equal(typeof click,'function');
 click();return control;
}

test('trees do not render on home, commerce or either extended island',()=>{
 const html=src('index.html'),game=src('game.js'),sea=src('sealine3d.js'),world=src('world-expansion-v23.js');
 assert.doesNotMatch(html,/class="poster-tree/);
 assert.doesNotMatch(game,/trees\.forEach\(/);
 assert.doesNotMatch(game,/buildTree\(/);
 assert.doesNotMatch(game,/id:'tree'\+i/);
 assert.doesNotMatch(sea,/seasideTree\(/);
 assert.doesNotMatch(world,/function tree\(|\btree\(b,/);
 assert.doesNotMatch(sea,/['"]🌳['"]|['"]🌲['"]/);
 assert.match(game,/drawSupplyStations\(b\)/);
 assert.match(game,/drawAvailableSupplies\(b\)/);
 assert.match(html,/果物を3個集めよう/);
 assert.match(html,/game\.js\?v=(?:20261112-v2[45]|20261113-v(?:2[6789]|3[012]))/);
});
test('expanded open land, new districts and rails remain valid geometry',()=>{
 const scene=loadScene(),m=geometry();
 scene.KomorebiExpansion.ground(m);scene.KomorebiExpansion.objects(m);
 scene.KomorebiSeaLine.drawTerrain(m);scene.KomorebiSeaLine.drawStatic(m);
 assert.ok(m.calls>750);
 assert.equal(m.invalid,0);
 assert.equal(scene.KomorebiSeaLine.stations.length,2);
 assert.equal(scene.KomorebiSeaLine.places.length,12);
 assert.ok(scene.KomorebiExpansion.canWalk(-24,0));
});
test('fruit baskets and lumber depots replace trees without breaking quests or legacy saves',()=>{
 const {api,storage,key}=boot();
 assert.equal(api.getState().inventory.wood,3);
 api.moveTo(-3.10,2.35);
 assert.equal(api.getNear()?.id,'resource0');
 api.interact();
 assert.equal(api.getState().inventory.berry,3);
 assert.equal(api.getState().questBerries,2);
 assert.ok(api.getState().harvested.includes(100));
 assert.ok(api.getState().harvested.includes(0),'old tree save IDs remain untouched');
 api.moveTo(3.75,3.05);
 assert.equal(api.getNear()?.id,'resource1');
 api.interact();
 assert.equal(api.getState().questBerries,4);
 assert.equal(api.getState().claimed[0],true,'tutorial quest completes without a tree');
 api.moveTo(10.25,1.35);
 assert.equal(api.getNear()?.id,'resource3');
 api.interact();
 assert.equal(api.getState().inventory.wood,5,'lumber is still available to build houses');
 assert.ok(JSON.parse(storage.get(key)).harvested.includes(103));
});
test('restart is opt-in and the confirmation panel preserves the save until clicked',()=>{
 const {api,node,storage,key}=boot();
 const before=storage.get(key);
 api.openPanel('bag');
 assert.equal(storage.get(key),before,'opening bag must never erase save');
 action(node,'新しい木のない島をはじめる');
 assert.equal(storage.get(key),before,'opening restart panel must not erase save');
 assert.match(node('panelTitle').textContent,/最初から始める/);
 action(node,'初期化して新しい島を始める');
 const saved=JSON.parse(storage.get(key));
 assert.equal(saved.version,1);
 assert.equal(saved.coins,120);
 assert.equal(saved.day,1);
 assert.equal(saved.redevelopmentProgress,32);
 assert.equal(saved.welcomeSeen,false);
 assert.equal(saved.inventory.wood,0);
 assert.deepEqual(Array.from(saved.harvested),[]);
 assert.equal(api.getState().coins,120);
 assert.equal(node('welcomeOverlay').hidden,false,'welcome appears on reset island');
});
test('restart can be cancelled without deleting any inventory',()=>{
 const {api,node,storage,key}=boot();
 const before=storage.get(key);
 api.openPanel('bag');
 action(node,'新しい木のない島をはじめる');
 action(node,'やめる（現在の島に戻る）');
 assert.equal(storage.get(key),before);
 assert.equal(api.getState().coins,87);
});

test('pagehide autosave cannot restore previous progress during a browser restart',()=>{
 const {api,node,storage,key,reloads}=boot({reload:true});
 api.openPanel('bag');
 action(node,'新しい木のない島をはじめる');
 action(node,'初期化して新しい島を始める');
 assert.equal(reloads(),1,'browser reload requested');
 const saved=JSON.parse(storage.get(key));
 assert.equal(saved.coins,120,'old 87 coins do not come back on pagehide');
 assert.equal(saved.day,1);
 assert.equal(saved.welcomeSeen,false);
 assert.equal(api.getState().coins,120);
});
test('JSON backup import survives pagehide autosave and restores player data',async()=>{
 const {api,node,storage,key,reloads,findInput}=boot({reload:true});
 const restored={version:1,coins:340,day:8,welcomeSeen:true,x:0,z:3,
  inventory:{berry:7,wood:8,seed:2},harvested:[100],claimed:[true,false,false]};
 api.openPanel('bag');
 action(node,'バックアップを読み込む');
 const picker=findInput();assert.ok(picker);
 picker.files=[{text:async()=>JSON.stringify(restored)}];
 const handler=picker._handlers.get('change');assert.equal(typeof handler,'function');
 await handler();
 assert.equal(reloads(),1);
 const saved=JSON.parse(storage.get(key));
 assert.equal(saved.coins,340);
 assert.equal(saved.day,8);
 assert.equal(saved.inventory.berry,7);
 assert.deepEqual(Array.from(saved.harvested),[100]);
 assert.equal(api.getState().coins,340);
});
