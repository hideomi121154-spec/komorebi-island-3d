import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=path=>readFileSync(resolve(root,path),'utf8');
const near=(a,b,tol=.025)=>assert.ok(Math.abs(a-b)<tol, 'Expected '+a+' to be close to '+b);
function boot(){
 const nodes=new Map(),events=new Map(),storage=new Map();
 const old={version:1,day:4,welcomeSeen:true,coins:97,x:0,z:3,inventory:{berry:0,wood:0,shell:0,fish:0,carrot:0,seed:2},claimed:[false,false,false]};
 storage.set('komorebi_island_3d_v01',JSON.stringify(old));
 let counter=0;
 const node=id=>{
  if(nodes.has(id))return nodes.get(id);
  const handlers=new Map(),classes=new Set();
  const el={id,hidden:true,disabled:false,textContent:'',style:{},dataset:{},children:[],clientWidth:390,clientHeight:844,
   classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:(k,v)=>{if(v===undefined?!classes.has(k):v){classes.add(k);return true}classes.delete(k);return false}},
   addEventListener:(k,fn)=>handlers.set(k,fn),_handlers:handlers,
   appendChild(child){this.children.push(child);return child},append(...items){this.children.push(...items)},
   replaceChildren(...items){this.children=[...items]},setAttribute(k,v){this[k]=v},
   getContext(type){if(type==='2d')return {};return null},focus(){},setPointerCapture(){}};
  nodes.set(id,el);return el;
 };
 const document={readyState:'loading',hidden:false,getElementById:node,activeElement:null,
  addEventListener:(k,fn)=>events.set(k,fn),createElement:t=>node('generated-'+(++counter)+'-'+t),
  querySelectorAll:()=>[],querySelector:()=>node('bottom-ui')};
 const context={window:{addEventListener(){},devicePixelRatio:1},document,navigator:{},performance:{now:()=>0},console,
  requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 for(const file of ['daynight.js','moko3d.js','expansion3d.js','redevelopment3d.js','sealine3d.js','battle3d.js','island-life3d.js','game.js'])
  new Script(src(file),{filename:file}).runInNewContext(context);
 events.get('DOMContentLoaded')();
 const api=context.window.__komorebiTest;
 assert.ok(api,'game must boot with existing saves');
 return {api,node,press:id=>node(id)._handlers.get('click')()};
}
test('player stops before both visible arena creatures and can walk around them',()=>{
 const {api}=boot();
 for(const x of [-.7-1.88,-.7+1.85]){
  api.moveTo(x,14);
  api.walkBy(0,-4,0);
  const p=api.getState();
  assert.ok(p.z>12,'body must stop outside creature');
  assert.equal(api.canWalkAt(p.x,p.z),true);
 }
 api.moveTo(-.7,14);api.walkBy(0,-3,0);
 assert.ok(api.getState().z<12,'gap between creatures remains walkable');
});
test('large movement cannot tunnel through the thin scoreboard',()=>{
 const {api}=boot();api.moveTo(-.7,5.4);api.walkBy(0,4,0);
 assert.ok(api.getState().z<6.5);
});
test('house corners, supplies, tree trunks and residents are solid',()=>{
 const {api}=boot();
 for(const [x,z] of [[-7.8,-6.65],[-5.85,12.8],[-2.4,1.7],[1.9,.9],[-.7,7.05]])
  assert.equal(api.canWalkAt(x,z),false,`solid at ${x},${z}`);
 // Door interaction points stay reachable.
 assert.equal(api.canWalkAt(-6,-2.4),true);
 assert.equal(api.canWalkAt(6,-2.4),true);
});
test('a save inside a creature recovers without changing money or inventory',()=>{
 const {api}=boot(),before=api.getState();
 api.moveTo(-2.58,10.75);api.walkBy(0,0,0);
 const after=api.getState();
 assert.equal(api.canWalkAt(after.x,after.z),true);
 assert.ok(Math.hypot(after.x+2.58,after.z-10.75)<3);
 assert.equal(after.coins,before.coins);assert.deepEqual(after.inventory,before.inventory);
});
test('diagonal walking slides along a wall without entering it',()=>{
 const {api}=boot();api.moveTo(-8.6,-5);api.walkBy(1.5,1,0);
 const p=api.getState();assert.ok(p.z>-4.2);assert.equal(api.canWalkAt(p.x,p.z),true);
});
