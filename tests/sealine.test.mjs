import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=file=>readFileSync(resolve(dir,file),'utf8');
function loadSea(){const context={window:{}};new Script(src('sealine3d.js')).runInNewContext(context);return context.window.KomorebiSeaLine;}
function geometry(){
 const obj={count:0,invalid:0};
 for(const name of ['box','roof','cylinder','sphere','ellipseDisc','quad','tri']){
  obj[name]=(...args)=>{
   obj.count++;
   for(const value of args)for(const v of Array.isArray(value)?value:[value])
    if(typeof v==='number'&&!Number.isFinite(v))obj.invalid++;
  };
 }
 obj.setTransform=()=>{};obj.clearTransform=()=>{};
 return obj;
}
test('Sea line connects TWO separate islands without moving the original town',()=>{
 const SEA=loadSea();
 assert.ok(SEA.CENTER.x>45,'commercial land is to the right of the original island');
 assert.equal(SEA.isCommercial(0,0),false);
 assert.equal(SEA.isCommercial(52,-4.2),true);
 assert.equal(SEA.walkable(46,-4),true);
 assert.equal(SEA.walkable(52.3,-4.7),false,'shopping mall wall is solid');
 assert.equal(SEA.walkable(75,-4),false,'sea must not be walkable');
 assert.equal(SEA.stations.length,2);
 assert.equal(SEA.places.length,7);
 assert.equal(SEA.nearestStation(17.4,2.85).id,'seaStationHome');
 assert.equal(SEA.nearestStation(44.4,-1.25).id,'seaStationCity');
 assert.equal(SEA.nearestStation(0,0),null);
});
test('Rail geometry and 3D trains have finite original mesh values',()=>{
 const sea=loadSea(),b=geometry(),d=geometry();
 sea.drawTerrain(b);sea.drawStatic(b);
 assert.ok(b.count>150,'island, buildings, rail and bridge must be 3D objects');
 assert.equal(b.invalid,0);
 sea.drawDynamic(d,4000,{active:true,progress:.47});
 assert.ok(d.count>=25,'2 car train and windows must be rendered');
 assert.equal(d.invalid,0);
 const p=sea.pointAt(.5);
 assert.ok(p.x>sea.A.x&&p.x<sea.B.x);
 assert.ok(p.z<sea.A.z&&p.z>sea.B.z);
});
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
   getContext(t){return id==='gameCanvas'&&t==='2d'?{}:null}};
  nodes.set(id,e);return e;
 };
 const document={readyState:'loading',hidden:false,getElementById:node,activeElement:null,
   addEventListener:(k,f)=>events.set(k,f),createElement:t=>node('created-'+(++created)+'-'+t),
   querySelectorAll:()=>[],querySelector:()=>node('bottom-ui')};
 const context={window:{addEventListener(){},devicePixelRatio:1},document,navigator:{},performance:{now:()=>now},console,
   requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},
   localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 for(const script of ['daynight.js','moko3d.js','expansion3d.js','redevelopment3d.js','sealine3d.js','game.js'])
  new Script(src(script)).runInNewContext(context);
 const start=events.get('DOMContentLoaded');assert.ok(start);start();
 const api=context.window.__komorebiTest;assert.ok(api,'game boots with commercial island');
 node('startBtn')._handlers.get('click')();
 return {api,node,storage,clock:t=>now=t};
}
test('Train ride completes in both directions, resumes gameplay and preserves original save',()=>{
 const {api,node,storage}=boot();
 assert.equal(api.getSeaLine().island,'home');
 const sea=loadSea();
 api.moveTo(sea.stations[0].x,sea.stations[0].z);
 assert.equal(api.getNear().id,'seaStationHome');
 api.interact();
 assert.equal(api.getSeaLine().riding,true,'boarding starts 3D journey');
 assert.equal(node('trainHud').hidden,false,'train screen is visible');
 api.updateTrain(3700);
 assert.ok(api.getSeaLine().progress>.40&&api.getSeaLine().progress<.60);
 api.updateTrain(7300);
 assert.equal(api.getSeaLine().riding,false);
 assert.equal(api.getSeaLine().island,'commerce');
 assert.equal(api.getSeaLine().rides,1);
 assert.equal(node('trainHud').hidden,true);
 assert.equal(api.getState().x,sea.stations[1].x);
 const persisted=JSON.parse(storage.get('komorebi_island_3d_v01'));
 assert.equal(persisted.version,1);
 assert.equal(persisted.inventory.berry,2);
 assert.equal(persisted.currentIsland,'commerce');
 // Commercial cafe transaction uses the same coins and item inventory.
 api.moveTo(59,1.15);api.interact();
 assert.match(node('panelTitle').textContent,/カフェ/);
 const buy=node('panelContent').children.find(c=>c.children?.some(x=>x.textContent==='買う'));
 assert.ok(buy,'cafe must have a buy button');
 buy.children.find(x=>x.textContent==='買う')._handlers.get('click')();
 assert.equal(api.getState().inventory.coffee,1);
 assert.equal(api.getState().coins,75);
 node('panelClose')._handlers.get('click')();
 api.moveTo(sea.stations[1].x,sea.stations[1].z);
 api.interact();assert.equal(api.getSeaLine().riding,true);
 api.updateTrain(7300);
 assert.equal(api.getSeaLine().island,'home');
 assert.equal(api.getSeaLine().rides,2);
 assert.equal(api.getState().inventory.coffee,1);
});
