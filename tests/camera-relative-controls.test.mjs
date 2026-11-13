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
 for(const file of ['daynight.js','moko3d.js','expansion3d.js','redevelopment3d.js','sealine3d.js','game.js'])
  new Script(src(file),{filename:file}).runInNewContext(context);
 events.get('DOMContentLoaded')();
 const api=context.window.__komorebiTest;
 assert.ok(api,'game must boot with existing saves');
 return {api,node,press:id=>node(id)._handlers.get('click')()};
}
test('D-pad direction follows camera on-screen after a one-finger orbit gesture',()=>{
 const {api,node,press}=boot();
 press('cameraReset'); // enter normal follow-camera mode
 let p=api.getCameraMovement(0,-1);
 near(p.x,0);near(p.z,-1);
 const canvas=node('gameCanvas');
 canvas._handlers.get('pointerdown')({pointerId:1,clientX:100,clientY:200});
 canvas._handlers.get('pointermove')({pointerId:1,clientX:100+Math.PI/2/.010,clientY:200});
 canvas._handlers.get('pointerup')({pointerId:1});
 near(api.getCameraHeading(),Math.PI/2);
 p=api.getCameraMovement(0,-1);near(p.x,-1);near(p.z,0); // up moves away on screen
 p=api.getCameraMovement(1,0);near(p.x,0);near(p.z,-1); // right is screen-right
 p=api.getCameraMovement(-1,0);near(p.x,0);near(p.z,1);
 p=api.getCameraMovement(0,1);near(p.x,1);near(p.z,0);
});
test('camera rotation buttons and drag both contribute to movement angle',()=>{
 const {api,node,press}=boot();
 press('cameraReset');
 press('rotateRight');press('rotateRight'); // +90 degrees
 near(api.getCameraHeading(),Math.PI/2);
 let p=api.getCameraMovement(0,-1);near(p.x,-1);near(p.z,0);
 const canvas=node('gameCanvas');
 canvas._handlers.get('pointerdown')({pointerId:7,clientX:100,clientY:100});
 canvas._handlers.get('pointermove')({pointerId:7,clientX:100-Math.PI/2/.010,clientY:100});
 canvas._handlers.get('pointerup')({pointerId:7});
 near(api.getCameraHeading(),0);
 p=api.getCameraMovement(0,-1);near(p.x,0);near(p.z,-1);
});
test('diagonal input has the same speed and matches rotated image',()=>{
 const {api,press}=boot();press('cameraReset');
 press('rotateRight');
 const p=api.getCameraMovement(1,-1);
 near(Math.hypot(p.x,p.z),1);
 near(p.x,Math.SQRT1_2*(Math.cos(Math.PI/4)-Math.sin(Math.PI/4)));
 near(p.z,-Math.SQRT1_2*(Math.sin(Math.PI/4)+Math.cos(Math.PI/4)));
 const z=api.getCameraMovement(0,0);
 near(z.x,0);near(z.z,0);
});
test('starting to walk in island overview preserves the rendered camera heading',()=>{
 const {api,press}=boot();
 const initial=api.getCameraHeading();near(initial,-.52);
 api.exitOverviewForMovement();near(api.getCameraHeading(),initial);
 press('redevelopmentViewBtn');
 const heading=api.getCameraHeading();near(heading,initial-.52);
 api.exitOverviewForMovement();near(api.getCameraHeading(),heading);
 const p=api.getCameraMovement(0,-1);near(p.x,-Math.sin(heading));near(p.z,-Math.cos(heading));
});
test('reset returns to predictable directions after dragging and rotating',()=>{
 const {api,press,node}=boot();
 press('cameraReset');press('rotateRight');
 const canvas=node('gameCanvas');
 canvas._handlers.get('pointerdown')({pointerId:1,clientX:50,clientY:50});
 canvas._handlers.get('pointermove')({pointerId:1,clientX:210,clientY:100});
 canvas._handlers.get('pointerup')({pointerId:1});
 assert.ok(Math.abs(api.getCameraHeading())>1);
 press('cameraReset');
 near(api.getCameraHeading(),0);
 const p=api.getCameraMovement(0,-1);near(p.x,0);near(p.z,-1);
});
test('source uses one camera heading for projection and movement without modifying save format',()=>{
 const source=src('game.js');
 assert.match(source,/const scenicAngle=viewHeading\(\)/);
 assert.match(source,/screenMoveVector\(sx,sy,indoor\.room\?0:viewHeading\(\)\)/);
 assert.match(source,/leaveOverviewForMovement\(\)/);
 assert.match(source,/komorebi_island_3d_v01/);
});
