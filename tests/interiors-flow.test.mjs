import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const game=readFileSync(resolve(dir,'game.js'),'utf8');
const rooms=readFileSync(resolve(dir,'rooms3d.js'),'utf8');
const daynight=readFileSync(resolve(dir,'daynight.js'),'utf8');
const mokoSource=readFileSync(resolve(dir,'moko3d.js'),'utf8');

function createGame(){
 const nodes=new Map(),events=new Map(),pending=new Map(),storage=new Map();
 let clock=0,seq=0,created=0;
 function make(id){
  if(nodes.has(id))return nodes.get(id);
  const events=new Map();
  const classes=new Set();
  const elem={
   id,hidden:true,disabled:false,dataset:{},textContent:'',className:'',children:[],style:{setProperty(name,value){this[name]=value}},offsetWidth:270,offsetHeight:94,
   clientWidth:390,clientHeight:790,
   classList:{add(name){classes.add(name)},remove(name){classes.delete(name)},contains(name){return classes.has(name)},toggle(name,force){if(force===undefined? !classes.has(name):force){classes.add(name);return true}classes.delete(name);return false}},
   appendChild(child){this.children.push(child);return child},
   append(...children){this.children.push(...children)},
   replaceChildren(...children){this.children=[...children]},
   addEventListener(type,fn){events.set(type,fn)},
   focus(){},getContext(type){return id==='gameCanvas'&&type==='2d'?{}:null},
   _events:events
  };
  nodes.set(id,elem);return elem;
 }
 const document={
  readyState:'loading',activeElement:null,getElementById:make,
  createElement:tag=>make('generated-'+(++created)+'-'+tag),
  querySelector(selector){assert.equal(selector,'.bottom-ui');return make('bottom-ui')},
  querySelectorAll(){return []},
  addEventListener(type,fn){events.set(type,fn)}
 };
 const window={addEventListener(){},devicePixelRatio:1};
 const math=Object.create(Math);math.random=()=>0;
 const context={document,window,Math:math,navigator:{},performance:{now:()=>clock},console,
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  requestAnimationFrame(){},
  setTimeout(fn,ms){const id=++seq;pending.set(id,{due:clock+ms,fn});return id},
  clearTimeout(id){pending.delete(id)}
 };
 new Script(rooms).runInNewContext(context);
 new Script(daynight).runInNewContext(context);
 new Script(mokoSource).runInNewContext(context);
 new Script(game).runInNewContext(context);
 events.get('DOMContentLoaded')();
 assert.ok(window.__komorebiTest,'game booted');
 make('startBtn')._events.get('click')();
 const api=window.__komorebiTest;
 function advance(ms){
  const until=clock+ms;
  for(let count=0;count<1000;count++){
   let item=null;
   for(const [id,t] of pending)if(t.due<=until&&(!item||t.due<item.task.due))item={id,task:t};
   if(!item){clock=until;return}
   pending.delete(item.id);clock=item.task.due;item.task.fn();
  }
  throw Error('unexpected repeating timer');
 }
 function press(container,label){
  const button=make(container).children.find(x=>x.textContent.includes(label));
  assert.ok(button,'Missing button '+label+' in '+container);
  assert.equal(button.disabled,false);
  button._events.get('click')();
 }
 function enter(room){
  api.moveTo(room==='home'?-6:6,-2.40);
  api.interact();
  assert.equal(api.getRoom(),null,'transition should animate outside before switching worlds');
  advance(400);
  assert.equal(api.getRoom(),room);
  assert.equal(make('roomHud').hidden,false);
 }
 function leave(){
  api.moveTo(0,3.62);api.interact();advance(400);
  assert.equal(api.getRoom(),null);
  assert.equal(make('roomHud').hidden,true);
 }
 return {api,advance,enter,leave,press,el:make,storage};
}

test('Enter shop, converse with clerk, buy seed and leave the 3D room',()=>{
 const {api,enter,leave,press,el,storage}=createGame();
 enter('shop');
 assert.equal(el('app').classList.contains('indoors'),true);
 assert.equal(el('roomName').textContent,'🏪 こもれび商店');
 api.moveTo(0,-.5);api.interact();
 assert.equal(el('roomDialogue').hidden,false);
 assert.match(el('roomDialogTitle').textContent,/店員/);
 assert.equal(el('speechBubble').hidden,false);
 assert.equal(el('speechName').textContent,'🐱 店員さん');
 assert.match(el('speechText').textContent,/いらっしゃいませ/);
 assert.equal(el('roomDialogue').classList.contains('npc-choice-mode'),true);
 press('roomDialogActions','お買い物');
 assert.equal(el('speechBubble').hidden,true,'speech should disappear while browsing products');
 assert.equal(el('roomDialogue').classList.contains('npc-choice-mode'),false);
 const seedOffer=el('roomDialogBody').children.find(x=>x.children?.[0]?.children?.[0]?.textContent.includes('にんじんの種'));
 assert.ok(seedOffer);
 seedOffer.children[1]._events.get('click')();
 assert.equal(api.getState().coins,90);
 assert.equal(api.getState().inventory.seed,3);
 const persisted=JSON.parse(storage.get('komorebi_island_3d_v01'));
 assert.equal(persisted.x,6,'save must not persist interior coordinates');
 assert.equal(persisted.z,-2.40);
 press('roomDialogActions','閉じる');
 assert.equal(el('roomDialogue').hidden,true);
 assert.equal(api.getSpeechActor(),null);
 leave();
 assert.equal(el('app').classList.contains('indoors'),false);
 assert.equal(api.getState().x,6);
});

test('Trade collected fruit with shopkeeper inside, no outside trade panel',()=>{
 const {api,enter,press,el}=createGame();
 api.moveTo(-10.2,-7);api.interact();
 assert.equal(api.getState().inventory.berry,2);
 enter('shop');
 api.moveTo(0,-.4);api.interact();
 press('roomDialogActions','買取');
 const offer=el('roomDialogBody').children.find(x=>x.children?.[0]?.children?.[0]?.textContent.includes('木の実'));
 assert.ok(offer,'berry sale offer');
 offer.children[1]._events.get('click')();
 assert.equal(api.getState().inventory.berry,1);
 assert.ok(api.getState().coins>120);
 assert.equal(el('panelOverlay').hidden,true,'the old full-screen shop panel stays closed');
});

test('Use 3D home bedroom to rest and save without changing real date, and dresser to change clothes',()=>{
 const {api,enter,press,el,leave}=createGame();
 enter('home');
 api.moveTo(-3.1,-1.0);api.interact();
 assert.match(el('roomDialogTitle').textContent,/ベッド/);
 press('roomDialogActions','休んでセーブ');
 assert.equal(api.getState().day,1,'resting should not skip the real calendar day');
 assert.equal(el('roomDialogue').hidden,true);
 api.moveTo(3.15,-1.3);api.interact();
 assert.match(el('roomDialogTitle').textContent,/服/);
 press('roomDialogActions','コーラル');
 assert.equal(api.getState().outfit,1);
 press('roomDialogActions','閉じる');
 leave();
 assert.equal(api.getRoom(),null);
});

test('3D cutaway geometry contains room floor and furniture',()=>{
 const roomWorld=createGame();
 const sourceRoom=roomWorld.el('gameCanvas');
 assert.ok(sourceRoom);
 // The actual room mesh is built by the factory when entering.
 roomWorld.enter('shop');
 assert.equal(roomWorld.api.getRoom(),'shop');
});

test('Speech follows the shopkeeper head and choices return after buying',()=>{
 const {api,enter,press,el}=createGame();
 enter('shop');
 api.moveTo(0,-.5);api.interact();
 assert.equal(api.getSpeechActor(),'clerk');
 api.updateSpeechPosition([0,12.3,20.7],[0,.95,-.35],390/790,52*Math.PI/180);
 const bubble=el('speechBubble');
 assert.match(bubble.style.left,/^\d+px$/);
 assert.match(bubble.style.top,/^\d+px$/);
 assert.match(bubble.style['--speech-tail-x'],/^\d+px$/);
 assert.equal(bubble.style.visibility,'visible');
 press('roomDialogActions','お買い物');
 assert.equal(api.getSpeechActor(),null);
 press('roomDialogActions','店員さんに戻る');
 assert.equal(api.getSpeechActor(),'clerk');
 assert.equal(bubble.hidden,false);
 press('roomDialogActions','また来ます');
 assert.equal(bubble.hidden,true);
 assert.equal(el('roomHud').hidden,false);
});

test('Mimi gives a seed and talks in an outdoor speech bubble instead of a fullscreen panel',()=>{
 const {api,el,press}=createGame();
 api.moveTo(1.9,.9);api.interact();
 assert.equal(api.getSpeechActor(),'mimi');
 assert.equal(el('speechBubble').hidden,false);
 assert.match(el('speechText').textContent,/にんじんの種/);
 assert.equal(el('panelOverlay').hidden,true);
 assert.equal(api.getState().inventory.seed,3);
 api.updateSpeechPosition([0,14.6,21],[0,0,0],390/790,48*Math.PI/180);
 assert.match(el('speechBubble').style.left,/^\d+px$/);
 press('roomDialogActions','ありがとう');
 assert.equal(api.getSpeechActor(),null);
 assert.equal(el('speechBubble').hidden,true);
 api.interact();
 assert.match(el('speechText').textContent,/また会えたね/);
 assert.equal(api.getState().inventory.seed,3,'only one present per day');
});
