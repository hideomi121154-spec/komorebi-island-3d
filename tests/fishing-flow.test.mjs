import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const source=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../game.js'),'utf8');
const daynight=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../daynight.js'),'utf8');
const mokoSource=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../moko3d.js'),'utf8');
function mockGame(){
  const nodes=new Map(),listeners=new Map(),queue=new Map();
  let clock=0,nextId=0;
  function el(id){
    if(!nodes.has(id)){
      const listeners=new Map();
      nodes.set(id,{
        id,hidden:true,disabled:false,textContent:'',dataset:{},
        classList:{add(){},remove(){},contains(){return false}},
        addEventListener(type,callback){listeners.set(type,callback)},
        focus(){},_events:listeners,
        getContext(type){return id==='gameCanvas'&&type==='2d'?{}:null}
      });
    }
    return nodes.get(id);
  }
  const document={
    readyState:'loading',activeElement:null,
    getElementById:el,
    querySelectorAll(){return []},
    querySelector(selector){assert.equal(selector,'.bottom-ui');return el('bottom-ui')},
    addEventListener(type,callback){listeners.set(type,callback)}
  };
  const win={addEventListener(){},devicePixelRatio:1};
  const local=new Map();
  const math=Object.create(Math);math.random=()=>0;
  const context={
    Math:math,window:win,document,navigator:{},performance:{now:()=>clock},
    localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},
    requestAnimationFrame(){},
    setTimeout(fn,delay){const id=++nextId;queue.set(id,{time:clock+delay,fn});return id},
    clearTimeout(id){queue.delete(id)},
    console
  };
  new Script(daynight).runInNewContext(context);
 new Script(mokoSource).runInNewContext(context);
  new Script(readFileSync(new URL('../expansion3d.js',import.meta.url),'utf8')).runInNewContext(context);
  new Script(readFileSync(new URL('../redevelopment3d.js',import.meta.url),'utf8')).runInNewContext(context);
  new Script(source).runInNewContext(context);
  assert.ok(listeners.has('DOMContentLoaded'));
  listeners.get('DOMContentLoaded')();
  assert.ok(win.__komorebiTest,'game initialization should complete');
  el('startBtn')._events.get('click')();
  const api=win.__komorebiTest;
  function advance(milliseconds){
    const target=clock+milliseconds;
    while(true){
      let chosen=null;
      for(const [id,task] of queue)if(task.time<=target&&(!chosen||task.time<chosen.task.time))chosen={id,task};
      if(!chosen)break;
      queue.delete(chosen.id);clock=chosen.task.time;chosen.task.fn();
    }
    clock=target;
  }
  function goToPond(){api.moveTo(-7,3);api.interact();assert.equal(api.getFishingStage(),'ready')}
  return {api,advance,goToPond,el};
}

test('Fishing begins in same world; awards only after timed bite',()=>{
  const {api,advance,goToPond,el}=mockGame();
  goToPond();
  assert.equal(el('fishHud').hidden,false);
  assert.equal(el('actionBtn').textContent,'🎣 竿を投げる');
  api.fishAction();assert.equal(api.getFishingStage(),'cast');
  advance(900);assert.equal(api.getFishingStage(),'wait');
  assert.equal(api.getState().inventory.fish,0);
  advance(1500);assert.equal(api.getFishingStage(),'bite');
  api.fishAction();assert.equal(api.getFishingStage(),'reel');
  advance(900);assert.equal(api.getFishingStage(),'caught');
  assert.equal(api.getState().inventory.fish,1);
  api.stopFishing();
  assert.equal(api.getFishingStage(),'idle');
  assert.equal(el('fishHud').hidden,true);
  assert.equal(el('actionBtn').disabled,false);
});

test('Closing a cast cancels pending timers and prevents free fish',()=>{
  const {api,advance,goToPond}=mockGame();
  goToPond();api.fishAction();
  advance(100);api.stopFishing();
  advance(10000);
  assert.equal(api.getFishingStage(),'idle');
  assert.equal(api.getState().inventory.fish,0);
});

test('Early or late hook attempts never award fish',()=>{
  const {api,advance,goToPond}=mockGame();
  goToPond();api.fishAction();advance(900);
  api.fishAction();assert.equal(api.getFishingStage(),'miss');
  assert.equal(api.getState().inventory.fish,0);
  api.fishAction();advance(900);advance(1500);
  assert.equal(api.getFishingStage(),'bite');
  advance(1600);assert.equal(api.getFishingStage(),'miss');
  assert.equal(api.getState().inventory.fish,0);
});
