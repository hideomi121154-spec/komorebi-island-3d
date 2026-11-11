/* こもれび島 3D v0.1 — dependency-free WebGL1 life simulation.
   Original procedural meshes, game logic and UI. No third-party assets. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
 const DAYLIGHT=window.KomorebiTime;
 if(!DAYLIGHT)throw Error('daynight.js is required');
const MOKO=window.KomorebiMoko;
if(!MOKO)throw Error('moko3d.js is required');
const EXPANSION=window.KomorebiExpansion;
if(!EXPANSION)throw Error('expansion3d.js is required');
const initial = {version:1,day:1,timeMinutes:480,realDateKey:null,coins:120,x:0,z:3,angle:0,inventory:{berry:0,wood:0,shell:0,fish:0,carrot:0,seed:2},harvested:[],shells:[],farm:[null,null,null],furniture:0,houseLevel:1,talkedDay:0,mokoGiftDay:0,questBerries:0,questSold:false,questGrown:false,claimed:[false,false,false],welcomeSeen:false};
const itemLabels={berry:'木の実',wood:'木材',shell:'貝がら',fish:'魚',carrot:'にんじん',seed:'種'};
const itemIcons={berry:'🍎',wood:'🪵',shell:'🐚',fish:'🐟',carrot:'🥕',seed:'🌱'};
const basePrice={berry:32,wood:20,shell:27,fish:74,carrot:46};
const KEY='komorebi_island_3d_v01';
function readSave(){try{const p=JSON.parse(localStorage.getItem(KEY)||'null');if(!p||p.version!==1)return structuredCloneSafe(initial);const s=Object.assign(structuredCloneSafe(initial),p);s.inventory=Object.assign({},initial.inventory,p.inventory||{});if(!Array.isArray(s.farm)||s.farm.length!==3)s.farm=[null,null,null];if(!Array.isArray(s.claimed))s.claimed=[false,false,false];s.timeMinutes=DAYLIGHT.normalMinutes(s.timeMinutes);s.realDateKey=typeof p.realDateKey==='string'?p.realDateKey:null;return s;}catch{return structuredCloneSafe(initial)}}
function structuredCloneSafe(v){return JSON.parse(JSON.stringify(v))}
let state=readSave();
const input={up:false,down:false,left:false,right:false};
let panelType='',paused=false,gameReady=false,nearest=null,toaster=null,saveTimer=null,tick=0;

const fishing={stage:'idle',token:0,timer:null,deadline:0,stageAt:0,focusReturn:null};
const BITE_WINDOW_MS=1600;
function scheduleFishing(callback,delay){
  clearTimeout(fishing.timer);
  const token=fishing.token;
  fishing.timer=setTimeout(()=>{if(token!==fishing.token||fishing.stage==='idle')return;fishing.timer=null;callback()},delay);
}
function fishStage(stage,message,label,disabled=false){
  fishing.stage=stage;fishing.stageAt=performance.now();
  $('fishHud').dataset.stage=stage;
  $('fishMessage').textContent=message;
  $('actionBtn').textContent=label;
  $('actionBtn').disabled=disabled;
  $('fishTimer').hidden=stage!=='bite';
  $('interactHint').textContent=stage==='bite'?'💦 いま！ 引き上げて！':stage==='caught'?'🐟 魚を釣り上げた！':'🌊 池の浮きを見てね';
}
function startFishing(){
  if(paused)return;
  paused=true;fishing.focusReturn=document.activeElement;
  for(const dir of Object.keys(input))input[dir]=false;
  document.querySelectorAll('[data-dir]').forEach(el=>el.classList.remove('pressed'));
  fishing.token++;clearTimeout(fishing.timer);fishing.timer=null;fishing.deadline=0;
  playerFacing=Math.atan2(-7-state.x,6-state.z);
  $('fishHud').hidden=false;
  document.querySelector('.bottom-ui').classList.add('fishing-mode');
  fishStage('ready','池に向かって竿を投げよう！','🎣 竿を投げる');
  $('actionBtn').focus({preventScroll:true});
}
function stopFishing(){
  if(fishing.stage==='idle')return;
  fishing.token++;clearTimeout(fishing.timer);fishing.timer=null;fishing.deadline=0;
  fishing.stage='idle';$('fishHud').hidden=true;
  document.querySelector('.bottom-ui').classList.remove('fishing-mode');
  paused=false;$('actionBtn').disabled=false;
  if(fishing.focusReturn?.focus)fishing.focusReturn.focus({preventScroll:true});
  fishing.focusReturn=null;setContext();
}
function castFishing(){
  fishing.token++;clearTimeout(fishing.timer);fishing.deadline=0;
  fishStage('cast','しゅっ！ 池に向かって投げた！','🎣 投げているよ…',true);
  scheduleFishing(()=>{
    fishStage('wait','浮きが沈むまで待とう…','🌊 浮きを見守る');
    scheduleFishing(()=>{
      fishing.deadline=performance.now()+BITE_WINDOW_MS;
      fishStage('bite','💦 食いついた！ いまだ！','✨ いま！ 引き上げる');
      if(typeof navigator.vibrate==='function')navigator.vibrate(80);
      scheduleFishing(()=>missFishing('🐟 あっ、魚に逃げられた！'),BITE_WINDOW_MS);
    },1500+Math.random()*2000);
  },900);
}
function missFishing(message){
  clearTimeout(fishing.timer);fishing.timer=null;fishing.deadline=0;
  fishStage('miss',message,'🎣 もう一度投げる');
}
function fishAction(){
  if(fishing.stage==='ready'||fishing.stage==='caught'||fishing.stage==='miss'){castFishing();return}
  if(fishing.stage==='wait'){missFishing('💦 早すぎた！ 魚が食いつくのを待とう');return}
  if(fishing.stage==='bite'){
    if(performance.now()>fishing.deadline){missFishing('🐟 タイミングが遅かった！');return}
    fishing.deadline=0;clearTimeout(fishing.timer);fishing.timer=null;
    fishStage('reel','ぐぐっ！ 魚を釣り上げているよ！','🎣 釣り上げ中…',true);
    scheduleFishing(()=>{
      give('fish',1);save();updateHud();
      fishStage('caught','🎉 やった！ 魚を1匹釣った！','🎣 もう一匹釣る');
    },900);
  }
}


// House and store are actual navigable 3D rooms in the same WebGL canvas.
const indoor={room:null,original:null,mesh:null,count:0,floor:0,buffer:null,transition:false,sequence:0,walkIn:null};
const roomTargets={
 home:[
  {id:'exit',x:0,z:3.62,r:1.4,icon:'🚪',name:'玄関'},
  {id:'bed',x:-3.10,z:-1.10,r:1.6,icon:'🛏️',name:'ベッド'},
  {id:'dresser',x:3.15,z:-1.28,r:1.6,icon:'🧺',name:'収納棚'},
  {id:'table',x:0,z:-.14,r:1.55,icon:'🔨',name:'作業テーブル'}
 ],
 shop:[
  {id:'exit',x:0,z:3.62,r:1.4,icon:'🚪',name:'出口'},
  {id:'clerk',x:0,z:-1.06,r:1.8,icon:'🐱',name:'店員さん'},
  {id:'seeds',x:-3.05,z:-.4,r:1.5,icon:'🌱',name:'種の棚'},
  {id:'goods',x:3.10,z:-.4,r:1.5,icon:'🧺',name:'買取カウンター'}
 ]
};
function roomWalkable(x,z){
 if(Math.abs(x)>4.56||z>3.86||z< -3.68)return false;
 if(indoor.room==='shop'){
  if(Math.abs(x)<2.24&&z< -1.31&&z> -2.71)return false;
  if(Math.abs(x)>3.60&&z< -.73&&z> -3.44)return false;
 }else if(indoor.room==='home'){
  if(x< -2.35&&z< -1.55&&z> -3.25)return false;
  if(x>2.70&&z< -1.85&&z> -3.61)return false;
  if(Math.abs(x)<.95&&z< -.02&&z> -1.60)return false;
 }
 return true;
}
function loadRoom(room){
 if(!window.KomorebiRooms?.build)throw Error('rooms3d.js is missing');
 const built=window.KomorebiRooms.build(room,MeshBuilder,state);
 indoor.mesh=built.mesh;indoor.count=built.mesh.length/9;indoor.floor=built.floorCount;
 if(gl){
  if(!indoor.buffer)indoor.buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,indoor.buffer);
  gl.bufferData(gl.ARRAY_BUFFER,built.mesh,gl.STATIC_DRAW);
 }
}
function enterRoom(room,door=null){
 if(paused||indoor.room||indoor.transition||!['home','shop'].includes(room))return;
 paused=true;indoor.transition=true;
 const serial=++indoor.sequence;
 indoor.original={x:state.x,z:state.z,angle:state.angle};indoor.walkIn={x:state.x,z:state.z,toX:door?.x??(room==='home'?-6:6),toZ:door?.z??-3.12,start:performance.now()};
 for(const dir of Object.keys(input))input[dir]=false;
 $('sceneVeilLabel').textContent=room==='shop'?'🚪 お店の中へ…':door?'🚪 森のコテージへ…':'🚪 おうちの中へ…';
 $('sceneVeil').classList.add('active');
 setTimeout(()=>{
  if(serial!==indoor.sequence)return;
  indoor.room=room;indoor.walkIn=null;state.x=0;state.z=2.88;state.angle=0;playerFacing=Math.PI;
  loadRoom(room);camFocus.x=0;camFocus.z=-.35;
  $('roomName').textContent=room==='shop'?'🏪 こもれび商店':door?'🏡 森のコテージ':'🏡 わたしの家';
  $('roomHud').hidden=false;$('app').classList.add('indoors');
  nearest=findNearby();indoor.transition=false;paused=false;setContext();save();
  setTimeout(()=>{if(serial===indoor.sequence)$('sceneVeil').classList.remove('active')},75);
 },390);
}
function leaveRoom(){
 if(!indoor.room||indoor.transition)return;
 if(!$('roomDialogue').hidden)closeRoomDialogue();
 paused=true;indoor.transition=true;const serial=++indoor.sequence;
 $('sceneVeilLabel').textContent='🚪 島へ出ます…';$('sceneVeil').classList.add('active');
 setTimeout(()=>{
  if(serial!==indoor.sequence)return;
  const p=indoor.original||{x:0,z:3,angle:0};
  indoor.room=null;state.x=p.x;state.z=p.z;state.angle=p.angle;
  indoor.original=null;camFocus.x=state.x;camFocus.z=state.z;
  $('roomHud').hidden=true;$('app').classList.remove('indoors');nearest=findNearby();
  indoor.transition=false;paused=false;setContext();save();
  setTimeout(()=>{if(serial===indoor.sequence)$('sceneVeil').classList.remove('active')},75);
 },390);
}
function drawRoomActors(b,now){
 buildAvatar(b,state.x,state.z,playerFacing,Math.sin(now*.009)*.035,false);
 if(indoor.room==='shop')buildAvatar(b,0,-3.24,Math.sin(now*.001)*.09,.018*Math.sin(now*.003),true);
 for(const t of roomTargets[indoor.room]||[])
  b.sphere(t.x,2.2+Math.sin(now*.004)*.10,t.z,.13,.17,.13,t.id==='exit'?'#bdeedb':'#ffe1a5',4,7);
 if(nearest)b.sphere(nearest.x,2.54+Math.sin(now*.003)*.13,nearest.z,.16,.20,.16,'#fff4be',4,7);
}

const randSeed=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296};
const rnd=randSeed(37489);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const dist=(x,z,a,b)=>Math.hypot(x-a,z-b);
const colorCache=new Map();
function color(hex){if(!colorCache.has(hex)){let n=parseInt(hex.replace('#',''),16);colorCache.set(hex,[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]);}return colorCache.get(hex)}
function mulTint(c,f){return c.map(x=>clamp(x*f,0,1))}
function addVec(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]]}
class MeshBuilder{
 constructor(){this.vertices=[];this.transform=null}
 setTransform(x=0,y=0,z=0,yaw=0){this.transform={x,y,z,c:Math.cos(yaw),s:Math.sin(yaw)}}
 clearTransform(){this.transform=null}
 point(p){const t=this.transform;if(!t)return p;return[p[0]*t.c+p[2]*t.s+t.x,p[1]+t.y,-p[0]*t.s+p[2]*t.c+t.z]}
 tri(a,b,c,col){a=this.point(a);b=this.point(b);c=this.point(c);const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const len=Math.hypot(...normal)||1;normal=normal.map(n=>n/len);const rgb=typeof col==='string'?color(col):col;for(const p of[a,b,c])this.vertices.push(...p,...normal,...rgb)}
 quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col)}
 box(x,y,z,w,h,d,col){const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;const p={a:[x0,y0,z0],b:[x1,y0,z0],c:[x1,y0,z1],d:[x0,y0,z1],e:[x0,y1,z0],f:[x1,y1,z0],g:[x1,y1,z1],h:[x0,y1,z1]};this.quad(p.e,p.h,p.g,p.f,col);this.quad(p.a,p.b,p.c,p.d,col);this.quad(p.h,p.d,p.c,p.g,col);this.quad(p.f,p.b,p.a,p.e,col);this.quad(p.e,p.a,p.d,p.h,col);this.quad(p.g,p.c,p.b,p.f,col)}
 cylinder(x,y,z,r,h,segments,col,rTop=r){const y0=y-h/2,y1=y+h/2;for(let i=0;i<segments;i++){const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;let p=[x+r*Math.cos(a),y0,z+r*Math.sin(a)],q=[x+r*Math.cos(b),y0,z+r*Math.sin(b)],u=[x+rTop*Math.cos(a),y1,z+rTop*Math.sin(a)],v=[x+rTop*Math.cos(b),y1,z+rTop*Math.sin(b)];let c=typeof col==='string'?color(col):col;const shade=0.94+0.12*Math.sin(i*2);c=mulTint(c,shade);this.quad(p,q,v,u,c);this.tri([x,y1,z],u,v,c);this.tri([x,y0,z],q,p,c)}}
 sphere(x,y,z,rx,ry,rz,col,lat=6,lon=9){const c=typeof col==='string'?color(col):col;for(let j=0;j<lat;j++){const phi0=-Math.PI/2+j*Math.PI/lat,phi1=-Math.PI/2+(j+1)*Math.PI/lat;for(let i=0;i<lon;i++){const a=i*2*Math.PI/lon,b=(i+1)*2*Math.PI/lon;const p=(phi,theta)=>[x+Math.cos(phi)*Math.cos(theta)*rx,y+Math.sin(phi)*ry,z+Math.cos(phi)*Math.sin(theta)*rz];const pp=p(phi0,a),qq=p(phi0,b),rr=p(phi1,b),ss=p(phi1,a);const tone=0.93+0.085*Math.sin(i*5+j*7);const cc=mulTint(c,tone);this.tri(pp,qq,rr,cc);this.tri(pp,rr,ss,cc)}}}
 ellipseDisc(x,y,z,rx,rz,c,seg=36){for(let i=0;i<seg;i++){const a=i*2*Math.PI/seg,b=(i+1)*2*Math.PI/seg;this.tri([x,y,z],[x+rx*Math.cos(b),y,z+rz*Math.sin(b)],[x+rx*Math.cos(a),y,z+rz*Math.sin(a)],c)}}
 roof(x,y,z,w,d,h,col){const e=.12,xl=x-w/2-e,xr=x+w/2+e,zf=z+d/2+e,zb=z-d/2-e,yt=y+h;const shade=mulTint(color(col),.87);this.quad([xl,y,zf],[xl,y,zb],[x,yt,zb],[x,yt,zf],col);this.quad([x,yt,zf],[x,yt,zb],[xr,y,zb],[xr,y,zf],shade);this.tri([xl,y,zf],[x,yt,zf],[xr,y,zf],col);this.tri([xr,y,zb],[x,yt,zb],[xl,y,zb],shade)}
 leaf(x,y,z,scale,c){this.tri([x-scale,y,z],[x,y+scale*.75,z],[x+scale,y,z],c);this.tri([x,y+scale*.75,z],[x,y,z-scale*.42],[x+scale,y,z],c)}
 toFloat(){return new Float32Array(this.vertices)}
}
const trees=[
 {x:-10.2,z:-7.0,type:'fruit'}, {x:-10.8,z:-2.1,type:'pine'},{x:-10.8,z:2.0,type:'fruit'},
 {x:-9.4,z:8.4,type:'pine'},{x:-3.8,z:-8.7,type:'fruit'},{x:-1.1,z:-8.5,type:'pine'},
 {x:2.2,z:-9.2,type:'fruit'},{x:9.7,z:-7.8,type:'pine'},{x:10.7,z:-3.1,type:'fruit'},
 {x:10.4,z:1.6,type:'pine'},{x:10.2,z:8.1,type:'fruit'},{x:1.7,z:8.5,type:'pine'},
 {x:-2.7,z:8.4,type:'fruit'},{x:-11.6,z:6.8,type:'fruit'}, {x:3.4,z:2.4,type:'fruit'}
];
trees.push(...EXPANSION.trees);
const shells=[{x:-11.2,z:4.6},{x:-8.6,z:-1.2},{x:8.8,z:8.8},{x:11.4,z:4.5}];
shells.push(...EXPANSION.shells);
const farmPlots=[{x:5.0,z:6.0},{x:6.6,z:6.0},{x:8.2,z:6.0}];

// Water once per game day; first watering accelerates a planted crop by one day.
const watering={active:false,index:-1,startedAt:0,duration:1700,token:0,timer:null};
function cropGrowth(f){return Math.max(0,state.day-f.day)+(f.wateredEver?1:0)}
function plotActionLabel(i){
 const f=state.farm[i];
 if(!f)return '🌱 種をまく';
 if(cropGrowth(f)>=2)return '🥕 収穫する';
 return f.wateredDay===state.day?'💦 水やり済み':'💧 水をあげる';
}
function finishWatering(token=watering.token){
 if(!watering.active||token!==watering.token)return;
 clearTimeout(watering.timer);watering.timer=null;watering.active=false;watering.index=-1;
 paused=false;$('actionBtn').disabled=false;
 nearest=findNearby();setContext();save();
 showToast('💧 水やりできたよ！ にんじんが少し早く育つよ');
}
function beginWatering(i){
 const f=state.farm[i];
 if(paused||indoor.room||!f||cropGrowth(f)>=2||f.wateredDay===state.day)return false;
 for(const dir of Object.keys(input))input[dir]=false;
 document.querySelectorAll('[data-dir]').forEach(el=>el.classList.remove('pressed'));
 watering.token++;const token=watering.token;
 clearTimeout(watering.timer);
 watering.active=true;watering.index=i;watering.startedAt=performance.now();
 const p=farmPlots[i];playerFacing=Math.atan2(p.x-state.x,p.z-state.z);
 paused=true;
 f.wateredDay=state.day;f.wateredEver=true;save();
 $('interactHint').textContent='💧 ジョウロで畑に水をあげているよ！';
 $('actionBtn').textContent='💦 水やり中…';$('actionBtn').disabled=true;
 watering.timer=setTimeout(()=>finishWatering(token),watering.duration);
 return true;
}


// Moko wanders around the open plaza, never inside buildings.
// Its transient movement does not change the existing localStorage save format.
let mokoPose=MOKO.poseAt(0,DAYLIGHT.phaseOf(state.timeMinutes).id);
let mokoHold=null,mokoGiftToday=false,mokoConversation=0;
const mokoThing={id:'moko',x:mokoPose.x,z:mokoPose.z,r:1.75,icon:'🌿',name:'モコ'};
function updateMoko(now){
 if(indoor.room)return;
 const phase=DAYLIGHT.phaseOf(state.timeMinutes).id;
 mokoPose=MOKO.poseAt(now,phase,mokoHold);
 mokoThing.x=mokoPose.x;mokoThing.z=mokoPose.z;
 if(speechAnchors.moko){
  speechAnchors.moko[0]=mokoPose.x;
  speechAnchors.moko[1]=2.37+mokoPose.bob;
  speechAnchors.moko[2]=mokoPose.z;
 }
}

const things=[{id:'home',x:-6,z:-2.4,r:2.05,icon:'🏡',name:'わたしの家の入口'}, {id:'shop',x:6,z:-2.4,r:2.05,icon:'🏪',name:'こもれび商店の入口'}, {id:'npc',x:1.9,z:.9,r:2.2,icon:'🐱',name:'住民のミミ'}, mokoThing, {id:'pond',x:-7,z:6,r:3.5,icon:'🎣',name:'おさかな池'}, ...farmPlots.map((p,i)=>({id:'plot'+i,x:p.x,z:p.z,r:1.55,icon:'🥕',name:'畑 '+(i+1)})),...trees.map((p,i)=>({id:'tree'+i,x:p.x,z:p.z,r:1.85,icon:'🌳',name:p.type==='pine'?'木材のとれる木':'実のなる木'})),...shells.map((p,i)=>({id:'shell'+i,x:p.x,z:p.z,r:1.5,icon:'🐚',name:'貝がら'})),...EXPANSION.places];
function hasResource(t){if(t.id.startsWith('tree'))return !state.harvested.includes(Number(t.id.slice(4)));if(t.id.startsWith('shell'))return !state.shells.includes(Number(t.id.slice(5)));return true}
function findNearby(){let selected=null,best=1.2;for(const o of indoor.room?roomTargets[indoor.room]:things){if(!hasResource(o))continue;const d=dist(state.x,state.z,o.x,o.z)/o.r;if(d<best){best=d;selected=o}}return selected}
function buildHouse(b,x,z,shop=false){const walls=shop?'#ffdcaa':'#fce5b9',roof=shop?'#72a5a2':'#e58c80';const w=shop?4.4:3.7,d=shop?3.45:3.4;b.box(x,.98,z,w,1.88,d,walls);b.roof(x,1.91,z,w,d,1.64,roof);b.box(x,.74,z+d/2+.035,1.0,1.49,.095,shop?'#6b958b':'#a37b57');b.box(x,.8,z+d/2+.1,.68,.89,.12,shop?'#d0e8de':'#bd9b73');b.sphere(x+.31,1.07,z+d/2+.22,.07,.07,.07,'#f8d183');for(const xoff of[-w*.33,w*.33]){b.box(x+xoff,1.20,z+d/2+.075,.7,.68,.12,'#fffef2');b.box(x+xoff,1.20,z+d/2+.15,.48,.47,.06,'#8dc8d0');b.box(x+xoff,1.20,z+d/2+.188,.08,.48,.05,'#fffdf2')}
 b.box(x,2.95,z,shop?2.0:1.1,.52,.23,shop?'#ffefca':'#f4e5c4');if(shop){b.box(x,3.03,z+d*.05,1.95,.39,.05,'#e79c68');b.box(x,.18,z+d/2+1.0,4.9,.14,1.5,'#e6c693')} else {b.cylinder(x+1.15,3.2,z-.8,.25,1.3,8,'#d7baa0');b.box(x+1.15,3.8,z-.8,.58,.16,.58,'#bd8984')}
 for(let i=0;i<3;i++){b.box(x,0.10+(i*.13),z+d/2+.35+i*.36,1.5,.15,.43,'#d2ae86')}
}
function buildTree(b,x,z,type){if(type==='pine'){b.cylinder(x,.74,z,.27,1.5,7,'#926c54');b.cylinder(x,2.2,z,1.45,2.45,8,'#3f9875',0);b.cylinder(x,3.15,z,1.08,2.25,8,'#4aaa81',0);b.cylinder(x,4.12,z,.67,1.55,8,'#6fbd8c',0)}else{b.cylinder(x,.80,z,.30,1.6,8,'#98724f');b.sphere(x,2.27,z,1.44,1.25,1.45,'#77bf76',6,9);b.sphere(x-.7,2.0,z+.27,.80,.85,.82,'#83cb7e',5,7);b.sphere(x+.53,2.52,z-.39,.83,.83,.8,'#5dab6c',5,7)}}
function buildBench(b,x,z){b.box(x,.58,z,1.9,.22,.65,'#ba8c67');b.box(x,.93,z-.31,1.9,.67,.19,'#ba8c67');for(const q of[-.75,.75]){b.box(x+q,.28,z,0.15,.55,.48,'#7e7661')}}
let softwareGroundCount=0,softwareTerrainCount=0,softwareSandCount=0,softwareSeaCount=0;
function buildStatic(){const b=new MeshBuilder();
 // Water plane, pale sandy shoreline, raised oval island.
 b.box(0,-.67,0,95,.20,95,'#79c5c8');softwareSeaCount=b.vertices.length/9;
 const land=(rx,rz,y,edgeBottom,topCol,sideCol,seed)=>{const seg=52;const arr=[];for(let k=0;k<seg;k++){const a=2*Math.PI*k/seg;const r=1+Math.sin(a*7+seed)*.017+Math.cos(a*11+seed)*.012;arr.push([Math.cos(a)*rx*r,Math.sin(a)*rz*r])}for(let k=0;k<seg;k++){const p=arr[k],q=arr[(k+1)%seg];b.tri([0,y,0],[q[0],y,q[1]],[p[0],y,p[1]],topCol);b.quad([p[0],y,p[1]],[q[0],y,q[1]],[q[0]*.98,edgeBottom,q[1]*.98],[p[0]*.98,edgeBottom,p[1]*.98],sideCol)}};
 land(...EXPANSION.sand,-.19,-.57,'#f3dfaa','#ddbc83',4);softwareSandCount=b.vertices.length/9;
 land(...EXPANSION.grass,-.045,-.29,'#9ed88d','#81b875',1);
 softwareTerrainCount=b.vertices.length/9;
 // Pastel paths.
 b.box(0,-.015,-3.2,15.9,.07,1.65,'#e9d4ab');b.box(0,-.012,0.1,1.55,.06,9.2,'#e9d4ab');
 b.box(-5.8,-.01,-4.2,1.60,.07,3,'#e9d4ab');b.box(5.9,-.01,-4.2,1.60,.07,3,'#e9d4ab');
 // Town square center.
 b.cylinder(0,.018,-2.45,1.62,.07,16,'#f7e8c2');b.cylinder(0,.16,-2.45,.80,.3,12,'#e2c699');b.cylinder(0,.36,-2.45,.33,.2,12,'#a6d0b0');
 // Pond.
 b.ellipseDisc(-7,.025,6,3.05,2.34,'#d7e2b2',32);b.ellipseDisc(-7,.045,6,2.73,2.03,'#78bfcd',32);
 b.ellipseDisc(-6.44,.052,5.4,.9,.42,'#addfe2',18);b.ellipseDisc(-7.65,.055,6.55,.6,.21,'#a6d9da',18);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;b.sphere(-7+2.9*Math.cos(a),.17,6+2.18*Math.sin(a),.29,.19,.32,i%2?'#e1daa4':'#f5e6b9',4,6)}
 EXPANSION.ground(b);
 softwareGroundCount=b.vertices.length/9;
 // Houses and fenced gardens.
 buildHouse(b,-6,-5,false);buildHouse(b,6,-5,true);
 for(let i=0;i<6;i++){b.box(-8.25+i*.8,.32,-8.10,.10,.58,.13,'#f8eed4');b.box(3.7+i*.8,.32,-8.0,.10,.58,.13,'#f8eed4')}
 b.box(-6.25,.34,-8.08,4.3,.11,.10,'#f8eed4');b.box(5.7,.33,-7.99,4.3,.11,.10,'#f8eed4');
 // Orchard/woodland and flowers.
 trees.forEach(t=>buildTree(b,t.x,t.z,t.type));
 const reserved=(x,z)=>dist(x,z,-6,-5)<4.4||dist(x,z,6,-5)<4.9||dist(x,z,-7,6)<3.7||dist(x,z,6.6,6)<3.4||dist(x,z,0,-2.5)<2.5;
 for(let i=0;i<125;i++){const x=(rnd()-.5)*24,z=(rnd()-.5)*20;if((x*x/154+z*z/103)>1||reserved(x,z))continue;const c=['#faf7e7','#ffd99a','#ecbad0','#bad5fd','#ffe6f3'][Math.floor(rnd()*5)];const r=.09+rnd()*.06;b.cylinder(x,.12,z,.025,.24,4,'#619b69');b.sphere(x,.28,z,r,r*.72,r,c,4,5)}
 for(let i=0;i<42;i++){const x=(rnd()-.5)*24,z=(rnd()-.5)*19;if((x*x/155+z*z/105)>1||reserved(x,z))continue;b.sphere(x,.12,z,.20+rnd()*.12,.11+rnd()*.09,.18+rnd()*.12,rnd()>.5?'#8bba75':'#74b072',4,5)}
 for(const p of[[-10,-4],[-9,-7],[-1,7],[2,-6],[10,5],[4,9]]){b.sphere(p[0],.19,p[1],.42,.35,.35,'#c6c9a9',5,7)}
 // Mailbox outside the player's house.
 b.cylinder(-3.55,.56,-4.2,.10,1.12,6,'#8d8364');b.box(-3.55,1.21,-4.2,.67,.49,.45,'#e99984');b.box(-3.55,1.19,-3.96,.48,.12,.04,'#f8e2be');
 // Farm beds at the eastern side of the island.
 b.box(6.57,.06,5.98,5.15,.20,2.16,'#d9bf91');farmPlots.forEach((p,i)=>{b.box(p.x,.16,p.z,1.13,.09,1.35,'#8e6750');for(let j=0;j<3;j++){b.box(p.x,.211,p.z-.45+j*.45,1.0,.035,.08,'#a47e5b')}});
 b.box(6.6,.24,7.65,5.65,.14,.12,'#e4cf9f');for(let i=0;i<5;i++){b.box(3.85+i*1.4,.43,7.65,.11,.51,.12,'#e4cf9f')}
 // Stump near the town square.
 b.cylinder(-2.4,.18,1.7,.62,.36,9,'#b18b61');b.cylinder(-2.4,.37,1.7,.53,.035,9,'#efcd95');
 EXPANSION.objects(b);
 return b.toFloat()}
function buildAvatar(b,x,z,yaw,bob=0,npc=false){b.setTransform(x,-.035+bob,z,yaw);
 const tunic=npc?'#e9a5a2':(['#66b8a3','#df987d','#a694ca'][state.outfit||0]||'#66b8a3'),hair=npc?'#d7a17b':'#63483f',face=npc?'#fbdfc6':'#f6d8ba';
 for(let side of[-1,1]){b.box(side*.19,.34,0,.26,.63,.31,npc?'#f3d5b4':'#a9b7d6');b.sphere(side*.19,.09,.085,.22,.16,.25,'#f4e9ca',4,7)}
 b.sphere(0,.94,0,.53,.66,.37,tunic,6,10);
 b.sphere(0,1.68,.075,.48,.48,.45,face,7,10);
 b.sphere(0,1.96,-.055,.49,.27,.46,hair,5,9);
 for(let s of[-1,1]){b.sphere(s*.17,1.70,.48,.048,.065,.025,'#3b3e36',4,5);b.sphere(s*.34,1.56,.435,.12,.06,.035,'#e9aaa5',4,5);b.sphere(s*.6,.94,.06,.18,.42,.23,face,5,7)}
 b.sphere(0,1.57,.51,.09,.055,.03,npc?'#b98377':'#d5a18a',4,5);
 if(npc){for(let s of[-1,1]){const a=[s*.39,2.11,-.02],c=[s*.56,2.59,.0],d=[s*.11,2.20,.0];b.tri(a,c,d,hair);b.tri(a,d,c,hair)}b.sphere(0,1.28,.42,.23,.20,.08,'#fce6b0',5,7)}
 else{b.sphere(0,2.18,-.05,.48,.18,.47,'#f9d384',5,10);b.cylinder(0,2.2,.2,.46,.08,10,'#e2b574');b.box(0,.93,-.42,.74,.70,.22,'#a68b62')}
 b.clearTransform()}

function fishingSegment(b,a,c,r,col){
  const vx=c[0]-a[0],vz=c[2]-a[2],length=Math.hypot(vx,vz)||1;
  const nx=Math.abs(vz/length)>.05?vz/length:1;
  const nz=Math.abs(vz/length)>.05?-vx/length:0;
  b.quad([a[0]+nx*r,a[1],a[2]+nz*r],[c[0]+nx*r,c[1],c[2]+nz*r],
         [c[0]-nx*r,c[1],c[2]-nz*r],[a[0]-nx*r,a[1],a[2]-nz*r],col);
  b.quad([a[0],a[1]+r,a[2]],[c[0],c[1]+r,c[2]],
         [c[0],c[1]-r,c[2]],[a[0],a[1]-r,a[2]],col);
}
function fishingRing(b,x,z,r,col){
  const width=.036,y=.085;
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,c=(i+1)*Math.PI/8;
    b.quad([x+Math.cos(a)*r,y,z+Math.sin(a)*r],
      [x+Math.cos(c)*r,y,z+Math.sin(c)*r],
      [x+Math.cos(c)*(r+width),y,z+Math.sin(c)*(r+width)],
      [x+Math.cos(a)*(r+width),y,z+Math.sin(a)*(r+width)],col);
  }
}
function buildFishingGeometry(b,now){
  if(fishing.stage==='idle')return;
  const age=Math.max(0,now-fishing.stageAt);
  const dx=-7-state.x,dz=6-state.z;
  const d=Math.hypot(dx,dz)||1,fx=dx/d,fz=dz/d;
  // The bobber lands safely inside the pond; keep it in the original 3D scene.
  const tx=-7-fx*.78,tz=6-fz*.65;
  const hand=[state.x+fx*.34,1.25,state.z+fz*.34];
  const progress=fishing.stage==='cast'?clamp(age/900,0,1):1;
  const ease=1-Math.pow(1-progress,3);
  const tip=[hand[0]+fx*(.5+1.12*ease),2.65+Math.sin(ease*Math.PI)*.64,hand[2]+fz*(.5+1.12*ease)];
  fishingSegment(b,hand,tip,.055,'#b98754');
  let bx=hand[0]+(tx-hand[0])*ease,bz=hand[2]+(tz-hand[2])*ease;
  let by=.19+(fishing.stage==='cast'?Math.sin(progress*Math.PI)*1.7:Math.sin(now*.008)*.035);
  if(fishing.stage==='ready'){bx=hand[0];bz=hand[2];by=.4}
  if(fishing.stage==='bite')by=.11+Math.sin(now*.055)*.045;
  let reel=fishing.stage==='reel'?clamp(age/900,0,1):fishing.stage==='caught'?1:0;
  if(reel){bx=tx+(hand[0]-tx)*reel*.82;bz=tz+(hand[2]-tz)*reel*.82;by=.18+Math.sin(reel*Math.PI)*2.25+reel*.93}
  fishingSegment(b,tip,[bx,by,bz],.014,'#fff2cf');
  b.sphere(bx,by,bz,.14,.16,.14,'#f7e6cb',5,8);
  b.sphere(bx,by+.09,bz,.14,.11,.14,'#f17e65',5,8);
  if(!['ready','cast','caught'].includes(fishing.stage)){
    for(let i=0;i<2;i++){
      const radius=.26+(((now*.0008+i*.5)%1)*.68);
      fishingRing(b,tx,tz,radius,fishing.stage==='bite'?'#fff4b6':'#d6f6ed');
    }
  }
  if(fishing.stage==='wait'){
    const drift=Math.sin(now*.0022)*.67;
    b.sphere(tx+drift,.13,tz+.25,.36,.08,.19,'#4899ad',5,8);
    b.tri([tx+drift-.24,.15,tz+.26],[tx+drift-.55,.16,tz+.46],
      [tx+drift-.55,.16,tz+.08],'#408ca6');
  }
  if(fishing.stage==='bite'||fishing.stage==='miss'){
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      const rise=fishing.stage==='miss'?Math.max(0,.65-age*.001):.32+.17*Math.sin(now*.013+i);
      b.sphere(tx+Math.cos(a)*.38,.18+rise,tz+Math.sin(a)*.38,.07,.10,.07,'#e6f9e8',4,5);
    }
  }
  if(fishing.stage==='reel'||fishing.stage==='caught'){
    const y=by+.16+(fishing.stage==='caught'?.1*Math.sin(now*.008):0);
    b.sphere(bx,y,bz,.42,.20,.23,'#e5a66d',6,10);
    b.sphere(bx+fx*.34,y+.055,bz+fz*.34,.12,.115,.12,'#eecb88',5,7);
    b.tri([bx-fx*.36,y,bz-fz*.36],
      [bx-fx*.7-fz*.23,y+.2,bz-fz*.7+fx*.23],
      [bx-fx*.7+fz*.23,y-.16,bz-fz*.7-fx*.23],'#bd886b');
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+now*.001;
      b.sphere(bx+Math.cos(a)*.55,y+.33+Math.sin(now*.006+i)*.12,bz+Math.sin(a)*.55,.065,.09,.065,'#fff0b2',4,5);
    }
  }
}

function buildDynamic(now){const b=new MeshBuilder();if(indoor.room){drawRoomActors(b,now);return b.toFloat()}let bounce=(Math.sin(now*.011)*.045);buildAvatar(b,state.x,state.z,playerFacing,bounce,false);buildAvatar(b,1.9,.9,Math.sin(now*.00031)*.65,Math.sin(now*.002)*.02,true);
 MOKO.draw(b,mokoPose,speech.actor==='moko'?Math.atan2(state.x-mokoPose.x,state.z-mokoPose.z):null,now);
 trees.forEach((t,i)=>{if(t.type!=='fruit'||state.harvested.includes(i))return;for(let j=0;j<3;j++){let a=(j*2.35)+i;let x=t.x+Math.cos(a)*.80,y=2.05+.30*Math.sin(j*2.1),z=t.z+Math.sin(a)*.77;b.sphere(x,y,z,.22,.24,.22,'#ed8c72',5,7);b.leaf(x,y+.23,z,.13,'#79bc78')}});
 shells.forEach((s,i)=>{if(state.shells.includes(i))return;b.sphere(s.x,.08,s.z,.27,.17,.26,'#fff0d5',5,7);b.sphere(s.x+.12,.20,s.z,.09,.09,.09,'#fae0b3',4,5)});
 farmPlots.forEach((p,i)=>{const f=state.farm[i];if(!f)return;
 const age=Math.min(2,cropGrowth(f)),height=age>=2?.62:age>=1?.32:.16;
 const tone=age>=2?'#76aa5c':'#6ca96b';
 if(f.wateredDay===state.day){b.box(p.x,.213,p.z,1.01,.014,1.22,'#644b40');for(let k=0;k<4;k++)b.sphere(p.x-.36+k*.24,.237,p.z+.39,.045,.025,.045,'#86a7a0',4,5)}
 for(let a=0;a<3;a++){const x=p.x-.33+a*.33;b.cylinder(x,.29+height*.3,p.z,.035,height*.7,5,'#6ba564');b.sphere(x,.32+height*.7,p.z,.12+.12*age/2,.15+.09*age/2,.16+.08*age/2,tone,4,6);if(age>=2)b.sphere(x,.36,p.z,.14,.22,.14,'#e88c50',5,6)}
 });
 if(state.furniture>0)buildBench(b,-7.75,-1.65);
 if(state.houseLevel>=2){b.sphere(-8.15,.76,-5.2,.38,.45,.38,'#f7cba5',5,7);b.cylinder(-8.1,.24,-5.2,.23,.4,8,'#9e8667')}
 if(nearest){let t=now*.003;const x=nearest.x,z=nearest.z;let py=2.6+.15*Math.sin(t);b.sphere(x,py,z,.18,.23,.18,'#fff3a7',4,6);b.sphere(x,py,z,.09,.12,.09,'#ffe08d',4,6)}
 buildFishingGeometry(b,now);
 if(watering.active)window.KomorebiWatering?.draw(b,now,watering,state,farmPlots[watering.index]);
 return b.toFloat()}
let ctx2d=null, softwareWorld=null, lastSoftwareDraw=0;
let gl=null,prog=null,positionLoc=-1,normalLoc=-1,colorLoc=-1,uView=null,uProj=null,uFog=null,uLight=null,worldBuffer=null,dynamicBuffer=null,worldVerts=0,camFocus={x:state.x,z:state.z};
const vShader=`attribute vec3 aPos;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uProjection;uniform mat4 uView;varying vec3 vColor;varying float vDepth;void main(){vec4 p=uView*vec4(aPos,1.0);gl_Position=uProjection*p;float sun=max(0.0,dot(normalize(aNormal),normalize(vec3(0.5,0.92,0.45))));float light=0.76+sun*0.25;vColor=aColor*light;vDepth=length(p.xyz);}`;
const fShader=`precision mediump float;varying vec3 vColor;varying float vDepth;uniform vec3 uFog;uniform float uBrightness;void main(){vec3 c=mix(vColor,uFog,smoothstep(32.0,67.0,vDepth)*0.63);gl_FragColor=vec4(mix(c,c*vec3(0.22,0.34,0.58),clamp(uBrightness,0.0,1.0)),1.0);}`;
function makeShader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader error: '+gl.getShaderInfoLog(s));return s}
function initializeGL(){gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:false})||canvas.getContext('experimental-webgl',{alpha:false,antialias:true});if(!gl){ctx2d=canvas.getContext('2d',{alpha:false});if(!ctx2d)throw Error('描画機能が利用できません');softwareWorld=buildStatic();return;}prog=gl.createProgram();gl.attachShader(prog,makeShader(gl.VERTEX_SHADER,vShader));gl.attachShader(prog,makeShader(gl.FRAGMENT_SHADER,fShader));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('WebGL setup failed');gl.useProgram(prog);positionLoc=gl.getAttribLocation(prog,'aPos');normalLoc=gl.getAttribLocation(prog,'aNormal');colorLoc=gl.getAttribLocation(prog,'aColor');uView=gl.getUniformLocation(prog,'uView');uProj=gl.getUniformLocation(prog,'uProjection');uFog=gl.getUniformLocation(prog,'uFog');uLight=gl.getUniformLocation(prog,'uBrightness');worldBuffer=gl.createBuffer();dynamicBuffer=gl.createBuffer();const world=buildStatic();gl.bindBuffer(gl.ARRAY_BUFFER,worldBuffer);gl.bufferData(gl.ARRAY_BUFFER,world,gl.STATIC_DRAW);worldVerts=world.length/9;gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(.70,.87,.90,1);}
function perspective(fov,aspect,near,far){const t=1/Math.tan(fov/2),o=1/(near-far);return new Float32Array([t/aspect,0,0,0,0,t,0,0,0,0,(far+near)*o,-1,0,0,2*far*near*o,0])}
function lookAt(eye,center,up){let z=[eye[0]-center[0],eye[1]-center[1],eye[2]-center[2]];let ll=Math.hypot(...z)||1;z=z.map(v=>v/ll);let x=[up[1]*z[2]-up[2]*z[1],up[2]*z[0]-up[0]*z[2],up[0]*z[1]-up[1]*z[0]];ll=Math.hypot(...x)||1;x=x.map(v=>v/ll);let y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1])}
function bindGeometry(buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [loc,offset] of[[positionLoc,0],[normalLoc,12],[colorLoc,24]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,offset)}}
function drawSoftware(now,eye,aspect,lighting){
 if(now-lastSoftwareDraw<83)return;
 lastSoftwareDraw=now;
 const W=canvas.width,H=canvas.height,ctx=ctx2d;
 const cssColor=rgb=>'rgb('+rgb.map(v=>Math.round(v*255)).join(',')+')';
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,indoor.room?'#e3e8dc':cssColor(lighting.top));sky.addColorStop(.61,indoor.room?'#f6e8cb':cssColor(lighting.horizon));sky.addColorStop(1,indoor.room?'#d8c1a1':cssColor(lighting.fog));ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 const view=lookAt(eye,indoor.room?[0,.95,-.35]:[camFocus.x,0,camFocus.z],[0,1,0]);
 const perspectiveX=1/Math.tan((indoor.room?26:24)*Math.PI/180)/aspect;
 const perspectiveY=1/Math.tan((indoor.room?26:24)*Math.PI/180);
 const triangles=[];
 function process(data,start=0,end=data.length){for(let i=start;i<end;i+=27){
  let tri=[],depth=0,skip=false;
  for(let j=0;j<3;j++){
   let k=i+j*9,x=data[k],y=data[k+1],z=data[k+2];
   let vx=view[0]*x+view[4]*y+view[8]*z+view[12],vy=view[1]*x+view[5]*y+view[9]*z+view[13],vz=view[2]*x+view[6]*y+view[10]*z+view[14];
   if(vz>=-.2){skip=true;break}
   tri.push((vx/-vz*perspectiveX*.5+.5)*W,(-vy/-vz*perspectiveY*.5+.5)*H);
   depth+=-vz;
  }
  if(skip)continue;
  const minx=Math.min(tri[0],tri[2],tri[4]),maxx=Math.max(tri[0],tri[2],tri[4]),miny=Math.min(tri[1],tri[3],tri[5]),maxy=Math.max(tri[1],tri[3],tri[5]);
  if(minx>W+3||maxx< -3||miny>H+3||maxy< -3)continue;
  const nx=data[i+3],ny=data[i+4],nz=data[i+5],lit=.76+.25*Math.max(0,(nx*.5+ny*.92+nz*.45)/1.145);
  const dark=indoor.room?.07:lighting.darkness;
   let rgb=[Math.round(clamp(data[i+6]*lit*255*(1-.78*dark),0,255)),Math.round(clamp(data[i+7]*lit*255*(1-.64*dark),0,255)),Math.round(clamp(data[i+8]*lit*255*(1-.43*dark),0,255))];
  triangles.push({depth:depth/3,tri,c:'rgb('+rgb.join(',')+')'});
 }}
 const paint=()=>{triangles.sort((a,b)=>b.depth-a.depth);for(let v of triangles){const t=v.tri;ctx.beginPath();ctx.moveTo(t[0],t[1]);ctx.lineTo(t[2],t[3]);ctx.lineTo(t[4],t[5]);ctx.closePath();ctx.fillStyle=v.c;ctx.fill();}triangles.length=0};
 // Same 3D projection for indoor scenes when WebGL is unavailable.
 if(indoor.room){process(indoor.mesh,0,indoor.floor*9);paint();process(indoor.mesh,indoor.floor*9);process(buildDynamic(now));paint();return}
 // Terrain is always behind objects: avoids the painter's-algorithm wedge artifact.
 process(softwareWorld,0,softwareSeaCount*9);paint();
 process(softwareWorld,softwareSeaCount*9,softwareSandCount*9);paint();
 process(softwareWorld,softwareSandCount*9,softwareTerrainCount*9);paint();
 process(softwareWorld,softwareTerrainCount*9,softwareGroundCount*9);paint();
 process(softwareWorld,softwareGroundCount*9);process(buildDynamic(now));paint();
}
function resize(){const dpr=ctx2d?1:Math.min(window.devicePixelRatio||1,1.7),width=Math.floor(canvas.clientWidth*dpr),height=Math.floor(canvas.clientHeight*dpr);if(canvas.width!==width||canvas.height!==height){canvas.width=Math.max(1,width);canvas.height=Math.max(1,height)}if(gl)gl.viewport(0,0,canvas.width,canvas.height)}
let playerFacing=Math.PI,previous=0,npcGiftToday=false;
function render(now){if(!gameReady)return;if(indoor.walkIn&&!indoor.room){const w=indoor.walkIn,k=clamp((now-w.start)/390,0,1);state.x=w.x+(w.toX-w.x)*k;state.z=w.z+(w.toZ-w.z)*k;playerFacing=Math.atan2(w.toX-w.x,w.toZ-w.z)}const dt=Math.min(.07,(now-previous)/1000||0);previous=now;tick+=dt;
 if(!document.hidden&&(lastClockSampleRaf<0||now-lastClockSampleRaf>=900)){lastClockSampleRaf=now;syncRealClock();}
 if(!indoor.room)updateMoko(now);
 const speed=4.1;let sx=Number(input.right)-Number(input.left),sy=Number(input.down)-Number(input.up);if(!paused&&(sx||sy)){let n=Math.hypot(sx,sy);sx/=n;sy/=n;const c=Math.cos(state.angle),s=Math.sin(state.angle);let dx=(indoor.room?sx:(sx*c+sy*s))*speed*dt,dz=(indoor.room?sy:(-sx*s+sy*c))*speed*dt;const canWalk=(x,z)=>{if(indoor.room)return roomWalkable(x,z);if(!EXPANSION.canWalk(x,z))return false;if(dist(x,z,-6,-5)<2.35||dist(x,z,6,-5)<2.55)return false;if(dist(x,z,-7,6)<2.24)return false;for(const t of trees)if(dist(x,z,t.x,t.z)<.56)return false;return true};if(canWalk(state.x+dx,state.z+dz)){state.x+=dx;state.z+=dz}else if(canWalk(state.x+dx,state.z))state.x+=dx;else if(canWalk(state.x,state.z+dz))state.z+=dz;playerFacing=Math.atan2(dx,dz);if(tick-lastAutoSave>3){save();lastAutoSave=tick}}
 const fishingActive=fishing.stage!=='idle',roomActive=!!indoor.room;
  const focusX=fishingActive?(state.x-7)*.5:state.x, focusZ=fishingActive?(state.z+6)*.5:state.z;
  if(!roomActive){camFocus.x+=(focusX-camFocus.x)*Math.min(1,dt*(fishingActive?3.6:6));camFocus.z+=(focusZ-camFocus.z)*Math.min(1,dt*(fishingActive?3.6:6));}
 let next=findNearby();if(next?.id!==nearest?.id){nearest=next;setContext()}
 resize();
 const aspect=canvas.width/canvas.height;
 const distance=fishingActive?(aspect<.70?14.4:12.1):(aspect<.70?26.0:20.5);
 const eye=roomActive?(aspect<.70?[0,12.3,20.7]:[0,8.2,13.6]):[camFocus.x+Math.sin(state.angle)*distance,fishingActive?9.2:14.6,camFocus.z+Math.cos(state.angle)*distance];
 const center=roomActive?[0,.95,-.35]:[camFocus.x,0,camFocus.z];
 updateSpeechPosition(eye,center,aspect,(roomActive?52:48)*Math.PI/180);
 const lighting=DAYLIGHT.paletteAt(state.timeMinutes);
 if($('nightSky')?.style)$('nightSky').style.opacity=roomActive?'0':String(lighting.stars);
 if(ctx2d){drawSoftware(now,eye,aspect,lighting);requestAnimationFrame(render);return;}
 const indoorShade=roomActive?.06:lighting.darkness;
 gl.clearColor(roomActive?.86:lighting.top[0],roomActive?.84:lighting.top[1],roomActive?.77:lighting.top[2],1);
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.uniformMatrix4fv(uView,false,lookAt(eye,center,[0,1,0]));
 gl.uniformMatrix4fv(uProj,false,perspective((roomActive?52:48)*Math.PI/180,aspect,.1,130));
 gl.uniform3f(uFog,...(roomActive?[.89,.80,.68]:lighting.fog));
 gl.uniform1f(uLight,indoorShade);
 bindGeometry(roomActive?indoor.buffer:worldBuffer);
 gl.drawArrays(gl.TRIANGLES,0,roomActive?indoor.count:worldVerts);
 const d=buildDynamic(now);gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,d,gl.DYNAMIC_DRAW);bindGeometry(dynamicBuffer);gl.drawArrays(gl.TRIANGLES,0,d.length/9);
 requestAnimationFrame(render)}

// The phone's wall clock (formatted as Japan Standard Time) owns the game's date and sky.
// Manual fast-forward is intentionally disabled in real-time mode.
let shownClockMinute=-1,lastClockSampleRaf=-1,lastClockSave=0;
function updateClockHud(){
 const phase=DAYLIGHT.phaseOf(state.timeMinutes);
 const label=DAYLIGHT.format(state.timeMinutes);
 $('timePill').textContent=phase.icon+' '+label+' '+phase.label+' · JST';
 $('timePill').setAttribute?.('aria-label','日本標準時 '+label+' '+phase.label+' と同期中');
 $('dayPill').textContent=phase.icon+' '+state.day+'日目';
 $('app').dataset.timePhase=phase.id;
 if($('nightSky')?.style)$('nightSky').style.opacity=indoor.room?'0':String(DAYLIGHT.paletteAt(state.timeMinutes).stars);
 shownClockMinute=Math.floor(state.timeMinutes);
}
function syncRealClock(epochMilliseconds=Date.now(),notify=false){
 const live=DAYLIGHT.realTimeAt(epochMilliseconds);
 const previousPhase=DAYLIGHT.phaseOf(state.timeMinutes).id;
 const previousKey=state.realDateKey;
 const passed=previousKey?DAYLIGHT.calendarDayDiff(previousKey,live.dateKey):0;
 if(!previousKey||passed>0)state.realDateKey=live.dateKey;
 state.timeMinutes=live.minutes;
 // Resources refresh once per calendar day, including time spent away from the app.
 if(passed>0){
  state.day+=passed;
  state.harvested=[];state.shells=[];state.talkedDay=0;
 }
 if(passed>0||Math.floor(state.timeMinutes)!==shownClockMinute)updateClockHud();
 if(passed>0){
  save();
  if(notify)showToast('🌅 日付が変わったよ！ '+state.day+'日目');
 }else if(notify&&previousPhase!==DAYLIGHT.phaseOf(state.timeMinutes).id){
  const phase=DAYLIGHT.phaseOf(state.timeMinutes);
  showToast(phase.icon+' '+phase.label+'の時間になったよ');
 }
 if(tick-lastClockSave>=20){lastClockSave=tick;save();}
 return {dateKey:live.dateKey,minutes:live.minutes,daysPassed:Math.max(0,passed)};
}
function saveNow(){
 if(paused)return;
 syncRealClock();
 save();
 showToast('💾 セーブしたよ！ 時間は日本時間と同期中');
}

let lastAutoSave=0;
function showToast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toaster);toaster=setTimeout(()=>el.classList.remove('show'),2900)}
function save(){try{const snapshot=(indoor.room||indoor.transition)&&indoor.original?{...state,x:indoor.original.x,z:indoor.original.z,angle:indoor.original.angle}:state;localStorage.setItem(KEY,JSON.stringify(snapshot));$('saveStatus').textContent='● セーブ済'}catch{$('saveStatus').textContent='⚠ 保存できません'}}
function updateHud(){ updateClockHud();$('coinPill').textContent='🪙 '+state.coins;
 let msg='🎉 おねがい達成！';if(!state.claimed[0])msg='🍎 木の実を3個集めよう '+Math.min(3,state.questBerries)+'/3';else if(!state.claimed[1])msg='🏪 お店で何か売ってみよう';else if(!state.claimed[2])msg='🥕 畑でにんじんを育てよう';$('missionShort').textContent=msg}
function setContext(){if(fishing.stage!=='idle'||indoor.transition||watering.active)return;const t=nearest;if(indoor.room){const names={exit:'島に出る',clerk:'店員さんと話す',seeds:'商品を見る',goods:'買取をお願い',bed:'ベッドで休む',dresser:'着替える',table:'作業テーブルを見る'};$('interactHint').textContent=t?t.icon+' '+t.name+' に近づいたよ':'🏠 室内を歩いて探検しよう';$('actionBtn').textContent=t?'✨ '+names[t.id]:'✨ 調べる';return}$('interactHint').textContent=t?t.icon+' '+t.name+' が近くにあるよ':'🌱 島を自由に探検しよう';$('actionBtn').textContent=t?'✨ '+(t.id==='shop'?'お店に入る':(t.id==='npc'||t.id==='moko')?'話しかける':t.id==='home'?'家に入る':t.id==='cottage'?'コテージに入る':t.id==='camp'?'休憩する':t.id==='falls'?'滝を眺める':t.id==='pier'?'海を眺める':t.id==='pond'?'釣りをする':t.id.startsWith('plot')?plotActionLabel(Number(t.id.slice(4))):t.id.startsWith('shell')?'拾う':'採集する'):'✨ 調べる'}
function give(id,amount){state.inventory[id]=(state.inventory[id]||0)+amount}
function price(id){return Math.max(1,Math.round(basePrice[id]*(.86+(state.day*37+id.length*13)%29/100)))}
function maybeQuest(){if(!state.claimed[0]&&state.questBerries>=3){state.claimed[0]=true;state.coins+=70;showToast('🎉 おねがい達成！ 70コインをゲット');return}if(state.claimed[0]&&!state.claimed[1]&&state.questSold){state.claimed[1]=true;state.coins+=80;showToast('🎉 商売の達人！ 80コインをゲット');return}if(state.claimed[1]&&!state.claimed[2]&&state.questGrown){state.claimed[2]=true;state.coins+=100;showToast('🎉 初めての収穫！ 100コインをゲット')}}
function interact(){if(paused)return;if(indoor.room){interactInside();return}const t=findNearby();if(!t){showToast('🌿 気になる場所に近づいて「調べる」を押そう');return}const id=t.id;
 if(id.startsWith('tree')){const i=Number(id.slice(4));if(state.harvested.includes(i)){showToast('🌳 今日はもう採集したよ');return}state.harvested.push(i);if(trees[i].type==='pine'){give('wood',2);showToast('🪵 木材を2個手に入れた！')}else{give('berry',2);give('wood',1);state.questBerries+=2;showToast('🍎 木の実2個と木材1個を手に入れた！')}maybeQuest()}
 else if(id.startsWith('shell')){const i=Number(id.slice(5));state.shells.push(i);give('shell',1);showToast('🐚 貝がらを拾った！')}
 else if(id.startsWith('plot')){const i=Number(id.slice(4)),f=state.farm[i];
  if(!f){if(state.inventory.seed<=0){showToast('🌱 種がないよ。お店で買おう！');return}state.inventory.seed--;state.farm[i]={day:state.day};showToast('🌱 種をまいたよ！ 次は水をあげてみよう')}
  else if(cropGrowth(f)>=2){state.farm[i]=null;give('carrot',3);state.questGrown=true;maybeQuest();showToast('🥕 にんじんを3個収穫した！')}
  else if(f.wateredDay===state.day){showToast('💦 この畑は今日もう水やり済み！')}
  else{beginWatering(i);return}
 }
 else if(id==='pond'){startFishing()}
 else if(id==='npc'){const first=state.talkedDay!==state.day;npcGiftToday=first;state.talkedDay=state.day;if(first){give('seed',1);save()}openRoomDialogue('mimi')}
 else if(id==='moko'){
  const first=state.mokoGiftDay!==state.day;
  mokoGiftToday=first;mokoConversation=0;mokoHold={...mokoPose};
  if(first){state.mokoGiftDay=state.day;give('berry',1);save();updateHud()}
  openRoomDialogue('moko');
 }
 else if(id==='cottage')enterRoom('home',{x:9.5,z:-7.95});
  else if(id==='camp')showToast('🏕️ 森のキャンプ場。焚き火を囲んでひと休み！');
  else if(id==='falls')showToast('💦 滝から流れる小川。木の橋を渡ってみよう！');
  else if(id==='pier')showToast('🛶 海辺の桟橋。波がきらきらしているよ！');
  else if(id==='shop')enterRoom('shop');else if(id==='home')enterRoom('home');
 updateHud();save();setContext()}


// NPC speech follows the same camera projection as the 3D island (including Canvas2D fallback).
const speech={actor:null};
const speechAnchors={clerk:[0,2.97,-3.24],mimi:[1.9,2.95,.9],moko:[mokoPose.x,2.37,mokoPose.z]};
function showSpeech(actor,name,message){
 if(!speechAnchors[actor])return;
 speech.actor=actor;
 $('speechName').textContent=name;
 $('speechText').textContent=message;
 $('speechBubble').hidden=false;
 $('speechBubble').style.visibility='visible';
 if(indoor.room)$('roomHud').hidden=true;
}
function hideSpeech(){
 const previous=speech.actor;
 speech.actor=null;
 if(previous==='moko')mokoHold=null;
 $('speechBubble').hidden=true;
 if(indoor.room)$('roomHud').hidden=false;
}
function updateSpeechPosition(eye,center,aspect,fov){
 if(!speech.actor||$('speechBubble').hidden)return;
 const target=speechAnchors[speech.actor],bubble=$('speechBubble');
 const view=lookAt(eye,center,[0,1,0]);
 const x=view[0]*target[0]+view[4]*target[1]+view[8]*target[2]+view[12];
 const y=view[1]*target[0]+view[5]*target[1]+view[9]*target[2]+view[13];
 const depth=-(view[2]*target[0]+view[6]*target[1]+view[10]*target[2]+view[14]);
 if(depth<=.2){bubble.style.visibility='hidden';return}
 const width=canvas.clientWidth||canvas.width||1,height=canvas.clientHeight||canvas.height||1;
 const projection=1/Math.tan(fov/2);
 const px=(.5+(x/depth)*projection/aspect*.5)*width;
 const py=(.5-(y/depth)*projection*.5)*height;
 if(!Number.isFinite(px)||!Number.isFinite(py)){bubble.style.visibility='hidden';return}
 bubble.style.visibility='visible';
 const bubbleWidth=bubble.offsetWidth||Math.min(width*.76,308);
 const half=Math.min(width/2,bubbleWidth/2+12);
 const bubbleX=clamp(px,half,width-half);
 const size=bubble.offsetHeight||105;
 const minY=Math.min(height-30,142+size);
 const maxY=Math.max(minY,height-160);
 bubble.style.left=Math.round(bubbleX)+'px';
 bubble.style.top=Math.round(clamp(py-12,minY,maxY))+'px';
 const tail=clamp(px-bubbleX+bubbleWidth/2,16,bubbleWidth-16);
 bubble.style.setProperty('--speech-tail-x',Math.round(tail)+'px');
}

function makeRoomAction(label,handler){
 const btn=document.createElement('button');
 btn.textContent=label;
 btn.addEventListener('click',handler);
 $('roomDialogActions').appendChild(btn);
 return btn;
}
function makeRoomOffer(icon,name,detail,label,handler,disabled=false){
 const row=document.createElement('div');row.className='room-offer';
 const left=document.createElement('div');
 const strong=document.createElement('strong');strong.textContent=icon+' '+name;
 const small=document.createElement('small');small.textContent=detail;
 left.append(strong,small);row.appendChild(left);
 if(label){
  const button=document.createElement('button');button.className='room-choice';
  button.textContent=label;button.disabled=disabled;
  button.addEventListener('click',handler);row.appendChild(button);
 }
 $('roomDialogBody').appendChild(row);
}
function closeRoomDialogue(){
 if($('roomDialogue').hidden)return;
 $('roomDialogue').hidden=true;
 $('roomDialogue').classList.remove('npc-choice-mode');
 hideSpeech();
 document.querySelector('.bottom-ui').classList.remove('room-dialoguing');
 paused=false;setContext();
 $('actionBtn').focus({preventScroll:true});
}
function openRoomDialogue(mode){
 if((!indoor.room&&mode!=='mimi'&&mode!=='moko')||indoor.transition)return;
 paused=true;
 for(const dir of Object.keys(input))input[dir]=false;
 $('roomDialogue').hidden=false;
 document.querySelector('.bottom-ui').classList.add('room-dialoguing');
 renderRoomDialogue(mode);
}
function renderRoomDialogue(mode){
 const head=$('roomDialogTitle'),content=$('roomDialogBody'),actions=$('roomDialogActions');
 content.replaceChildren();actions.replaceChildren();
 const speechMode=mode==='welcome'||mode==='mimi'||mode==='moko';
 $('roomDialogue').classList.toggle('npc-choice-mode',speechMode);
 if(!speechMode)hideSpeech();
 const write=txt=>{const p=document.createElement('p');p.textContent=txt;content.appendChild(p)};
 const refresh=()=>{save();updateHud();renderRoomDialogue(mode)};
 if(mode==='welcome'){
  head.textContent='🐱 店員さん';
  showSpeech('clerk','🐱 店員さん','いらっしゃいませ！ 今日は何をしますか？');
  makeRoomAction('🛍️ お買い物',()=>renderRoomDialogue('buy'));
  makeRoomAction('🪙 買取をお願い',()=>renderRoomDialogue('sell'));
  makeRoomAction('また来ます',closeRoomDialogue);
  }else if(mode==='mimi'){
  head.textContent='🐱 ミミとのおしゃべり';
  showSpeech('mimi','🐱 ミミ',npcGiftToday
   ?'こんにちは！ 今日もいい日だね。にんじんの種を1個あげるよ！'
   :'また会えたね！ お庭のにんじんは育っているかな？');
  makeRoomAction('😊 ありがとう！',closeRoomDialogue);
 }else if(mode==='moko'){
  head.textContent='🌿 モコとのおしゃべり';
  const phase=DAYLIGHT.phaseOf(state.timeMinutes).id;
  showSpeech('moko','🌿 モコ',MOKO.talk(phase,mokoGiftToday&&mokoConversation===0,mokoConversation));
  makeRoomAction('🌼 もっとおはなし',()=>{mokoConversation++;renderRoomDialogue('moko')});
  makeRoomAction('🌱 またね！',closeRoomDialogue);
 }else if(mode==='buy'){
  head.textContent='🛍️ 商品を買う';
  write('「今日も新鮮な種が入荷していますよ！」');
  makeRoomOffer('🌱','にんじんの種','30コイン','買う',()=>{
   if(state.coins<30)return;state.coins-=30;give('seed',1);refresh();showToast('🌱 種を買いました！');
  },state.coins<30);
  makeRoomOffer('🪑','お庭のベンチ','160コイン・家の前に設置','買う',()=>{
   if(state.coins<160||state.furniture>0)return;
   state.coins-=160;state.furniture=1;refresh();showToast('🪑 ベンチを買いました！');
  },state.coins<160||state.furniture>0);
  makeRoomAction('⬅ 店員さんに戻る',()=>renderRoomDialogue('welcome'));
  makeRoomAction('閉じる',closeRoomDialogue);
 }else if(mode==='sell'){
  head.textContent='🧺 持ち物を売る';
  write('「査定しますね！ 今日の買取価格はこちらです。」');
  for(const id of ['berry','wood','shell','fish','carrot']){
   const count=state.inventory[id]||0,p=price(id);
   makeRoomOffer(itemIcons[id],itemLabels[id]+' ×'+count,'1個 '+p+'コイン','1個売る',()=>{
    if(state.inventory[id]<=0)return;
    state.inventory[id]--;state.coins+=p;state.questSold=true;maybeQuest();
    refresh();showToast('🪙 '+p+'コインで売れました！');
   },count===0);
  }
  makeRoomAction('⬅ 店員さんに戻る',()=>renderRoomDialogue('welcome'));
  makeRoomAction('閉じる',closeRoomDialogue);
 }else if(mode==='bed'){
  head.textContent='🛏️ ふかふかのベッド';
  write('「今日もよくがんばったね。ここで休んでセーブしよう。時間は日本の実際の時刻と同じだよ。」');
  makeRoomAction('💤 休んでセーブ',()=>{closeRoomDialogue();saveNow();showToast('💤 おうちでひと休み。セーブしたよ！')});
  makeRoomAction('まだ起きている',closeRoomDialogue);
 }else if(mode==='dresser'){
  head.textContent='👕 服を着替える';
  write('「どの服を着ようかな？」 お気に入りの色を選ぼう。');
  const colors=[['🌿 ミント',0],['🍑 コーラル',1],['🪻 ラベンダー',2]];
  for(const [name,index] of colors)makeRoomAction(name,()=>{
   state.outfit=index;refresh();showToast('👕 '+name+'色の服に着替えたよ！');
  });
  makeRoomAction('閉じる',closeRoomDialogue);
 }else if(mode==='table'){
  head.textContent='🔨 作業テーブル';
  write('「島のおうちをもっと素敵にしよう！ 現在のおうちレベル：'+state.houseLevel+'」');
  makeRoomOffer('🏠','おうちを増築する','400コイン・部屋にソファを追加','増築',()=>{
   if(state.houseLevel>=2||state.coins<400)return;
   state.coins-=400;state.houseLevel=2;
   loadRoom('home');refresh();showToast('🏡 おうちが大きくなったよ！');
  },state.houseLevel>=2||state.coins<400);
  makeRoomAction('閉じる',closeRoomDialogue);
 }
}
function interactInside(){
 const t=findNearby();
 if(!t){showToast('🏡 室内を歩いて、気になる家具や店員に近づこう');return}
 if(t.id==='exit'){leaveRoom();return}
 const modes={clerk:'welcome',seeds:'buy',goods:'sell',bed:'bed',dresser:'dresser',table:'table'};
 if(modes[t.id])openRoomDialogue(modes[t.id]);
}



function row(icon,title,detail,button,handler,disabled=false){const el=document.createElement('div');el.className='item-row';const sym=document.createElement('span');sym.className='item-symbol';sym.textContent=icon;const center=document.createElement('div');center.className='details';const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=detail;center.append(strong,small);el.append(sym,center);if(button){const btn=document.createElement('button');btn.textContent=button;btn.disabled=disabled;btn.addEventListener('click',handler);el.append(btn)}return el}
function paragraph(parent,text,cls){let p=document.createElement('p');p.textContent=text;if(cls)p.className=cls;parent.appendChild(p);return p}
function tag(parent,name,txt){let e=document.createElement(name);e.textContent=txt;parent.appendChild(e);return e}
function addButton(parent,label,fn,cls='primary'){const el=document.createElement('button');el.textContent=label;el.className=cls;el.addEventListener('click',fn);parent.appendChild(el);return el}
function openPanel(type){panelType=type;paused=true;for(let dir of Object.keys(input))input[dir]=false;document.querySelectorAll('[data-dir]').forEach(e=>e.classList.remove('pressed'));const overlay=$('panelOverlay'),title=$('panelTitle'),content=$('panelContent');content.replaceChildren();overlay.hidden=false;
 if(type==='bag'){title.textContent='🎒 持ち物';for(let id of Object.keys(itemLabels)){let count=state.inventory[id];content.appendChild(row(itemIcons[id],itemLabels[id],count+' 個',null,null))}paragraph(content,'📦 収集したアイテムは、商店へ行くと売れるよ。','tip-box');addButton(content,'セーブデータをバックアップ',exportSave,'secondary')}
 else if(type==='shop'){title.textContent='🏪 こもれび商店';paragraph(content,'いらっしゃいませ！ 今日の買取価格はこちら。');for(let id of ['berry','wood','shell','fish','carrot']){const count=state.inventory[id],p=price(id);content.appendChild(row(itemIcons[id],itemLabels[id]+' ×'+count,'1個 '+p+'コイン','1個売る',()=>{if(state.inventory[id]<=0)return;state.inventory[id]--;state.coins+=p;state.questSold=true;maybeQuest();save();updateHud();openPanel('shop');showToast('🪙 '+p+'コインで売れた！')},count<1))}
 tag(content,'h3','🛍️ お買い物');content.appendChild(row('🌱','にんじんの種','30コイン','買う',()=>{if(state.coins<30)return;state.coins-=30;give('seed',1);save();updateHud();openPanel('shop');showToast('🌱 種を1つ買ったよ！')},state.coins<30));content.appendChild(row('🪑','お庭のベンチ','160コイン・家の前に置かれる','買う',()=>{if(state.coins<160||state.furniture>=1)return;state.coins-=160;state.furniture=1;save();updateHud();openPanel('shop');showToast('🪑 お庭にベンチを置いたよ！')},state.coins<160||state.furniture>=1));paragraph(content,'価格は日によって少し変わるよ。木の実は毎朝また採れるから、少しずつ貯めてね。','tip-box')}
 else if(type==='home'){title.textContent='🏡 わたしの家';paragraph(content,'木の香りがする小さなおうち。お庭をもっと素敵にしてみよう。');content.appendChild(row('🏠','おうちレベル '+state.houseLevel,'島の暮らしを充実させよう',null,null));content.appendChild(row('🔨','おうちを増築する','400コイン・庭に飾りが増える','増築',()=>{if(state.houseLevel>=2||state.coins<400)return;state.coins-=400;state.houseLevel=2;save();updateHud();openPanel('home');showToast('🏠 おうちを増築したよ！')},state.houseLevel>=2||state.coins<400));paragraph(content,'今後は家の中に入れる機能や家具の配置も増やしていく予定です。','tip-box')}
 else if(type==='npc'){title.textContent='🐱 ミミとのおしゃべり';paragraph(content,'「こんにちは！ ここはのんびり過ごすのがいちばんだよ。木の実は木から集められるし、畑の野菜も立派に育つの！」');paragraph(content,npcGiftToday?'「はい、今日のプレゼント。にんじんの種を1個あげるね。また明日お話しよう！」':'「さっきあげた種、植えてみた？ 明日またお話ししようね！」','tip-box');addButton(content,'ありがとう！',closePanel)}
 else if(type==='map'){title.textContent='🗺 こもれび島の地図';const map=document.createElement('canvas');map.width=520;map.height=420;map.setAttribute('aria-label','島の地図と現在位置');map.style.cssText='display:block;width:100%;height:auto;border-radius:17px;border:2px solid #f7ead0;background:#abdadd';content.appendChild(map);EXPANSION.paintMap(map,state);paragraph(content,'🔴 赤い点が現在地。十字キーで歩いて、新しいコテージ・キャンプ場・滝・桟橋も探検してみよう。','tip-box')}
  else if(type==='quests'){title.textContent='📋 島のおねがい';const quests=[{done:state.questBerries>=3,claimed:state.claimed[0],txt:'🍎 木の実を3個集めよう',progress:Math.min(3,state.questBerries)+'/3',reward:70},{done:state.questSold,claimed:state.claimed[1],txt:'🏪 商店で何か売ろう',progress:state.questSold?'達成':'未達成',reward:80},{done:state.questGrown,claimed:state.claimed[2],txt:'🥕 にんじんを育てて収穫しよう',progress:state.questGrown?'達成':'未達成',reward:100}];for(const q of quests){content.appendChild(row(q.claimed?'✅':'⭐',q.txt,q.progress+' ・報酬 '+q.reward+'コイン',null,null))}paragraph(content,'おねがいは自動で達成・報酬受け取りになるよ。','tip-box')}
 updateHud()}
function closePanel(){$('panelOverlay').hidden=true;paused=false;panelType='';setContext()}
function exportSave(){const data=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download='komorebi-save-day'+state.day+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('セーブデータを書き出したよ')}
function bindControls(){const dirs=document.querySelectorAll('[data-dir]');dirs.forEach(btn=>{const dir=btn.dataset.dir;btn.addEventListener('pointerdown',e=>{e.preventDefault();input[dir]=true;btn.classList.add('pressed');try{btn.setPointerCapture(e.pointerId)}catch{}});const release=e=>{input[dir]=false;btn.classList.remove('pressed')};btn.addEventListener('pointerup',release);btn.addEventListener('pointercancel',release);btn.addEventListener('lostpointercapture',release)});
 const codes={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 document.addEventListener('keydown',e=>{if(fishing.stage!=='idle'){if(e.code==='Escape'){e.preventDefault();stopFishing()}else if(e.code==='Space'||e.code==='KeyE'){e.preventDefault();if(!e.repeat)fishAction()}else if(codes[e.code])e.preventDefault();return}if(codes[e.code]){e.preventDefault();input[codes[e.code]]=true}else if(e.code==='Space'||e.code==='KeyE'){e.preventDefault();if(!e.repeat)interact()}else if(e.code==='Escape'){if(!$('roomDialogue').hidden)closeRoomDialogue();else if(!$('panelOverlay').hidden)closePanel();else if(indoor.room)leaveRoom()}});document.addEventListener('keyup',e=>{if(codes[e.code]){e.preventDefault();input[codes[e.code]]=false}});window.addEventListener('blur',()=>Object.keys(input).forEach(d=>input[d]=false));
 $('islandMapBtn').addEventListener('click',()=>{if(!indoor.room&&fishing.stage==='idle')openPanel('map')});$('rotateLeft').addEventListener('click',()=>{state.angle-=Math.PI/4;save()});$('rotateRight').addEventListener('click',()=>{state.angle+=Math.PI/4;save()});$('cameraReset').addEventListener('click',()=>{state.angle=0;save();showToast('📷 カメラを戻したよ')});$('actionBtn').addEventListener('click',()=>{if(fishing.stage==='idle')interact();else fishAction()});$('bagBtn').addEventListener('click',()=>openPanel('bag'));$('questBtn').addEventListener('click',()=>openPanel('quests'));$('nextDayBtn').addEventListener('click',saveNow);$('panelClose').addEventListener('click',closePanel);$('panelOverlay').addEventListener('click',e=>{if(e.target===$('panelOverlay'))closePanel()});
 let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,angle:state.angle,pointerId:e.pointerId};try{canvas.setPointerCapture(e.pointerId)}catch{}});canvas.addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==e.pointerId)return;state.angle=drag.angle+(e.clientX-drag.x)*.0055});canvas.addEventListener('pointerup',()=>{if(drag)save();drag=null});canvas.addEventListener('pointercancel',()=>drag=null);
 $('fishBack').addEventListener('click',stopFishing);$('roomDialogClose').addEventListener('click',closeRoomDialogue);
 $('startBtn').addEventListener('click',()=>{$('welcomeOverlay').hidden=true;paused=false;state.welcomeSeen=true;save();showToast('🌿 島を探検しよう！')});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(fishing.stage!=='idle')stopFishing();if(watering.active)finishWatering();save()}else{syncRealClock();save()}});window.addEventListener('pageshow',()=>syncRealClock());window.addEventListener('pagehide',save);
}
function start(){try{initializeGL();bindControls();syncRealClock();updateHud();setContext();$('poster').classList.add('hidden');$('loadingBanner').hidden=true;gameReady=true;if(!state.welcomeSeen){$('welcomeOverlay').hidden=false;paused=true}requestAnimationFrame(render);window.__komorebiTest={getState:()=>JSON.parse(JSON.stringify(state)),getIslandBounds:()=>({grass:EXPANSION.grass,sand:EXPANSION.sand}),moveTo:(x,z)=>{state.x=x;state.z=z;setContext()},interact,saveNow,openPanel,price,vertices:worldVerts,getFishingStage:()=>fishing.stage,fishAction,stopFishing,getRoom:()=>indoor.room,enterRoom,leaveRoom,openRoomDialogue,closeRoomDialogue,getNear:()=>findNearby(),getMokoPose:()=>({...mokoPose}),updateMoko,getSpeechActor:()=>speech.actor,updateSpeechPosition,getClock:()=>({day:state.day,dateKey:state.realDateKey,minutes:state.timeMinutes,phase:DAYLIGHT.phaseOf(state.timeMinutes).id}),syncClock:syncRealClock,getWatering:()=>({active:watering.active,index:watering.index}),cropGrowth,plotActionLabel,previewWaterMesh:()=>{const b=new MeshBuilder();window.KomorebiWatering?.draw(b,performance.now()+500,watering,state,farmPlots[watering.index]);return b.toFloat()}};}catch(err){console.error(err);$('loadingBanner').hidden=true;$('errorMessage').hidden=false;$('errorMessage').textContent='⚠️ 3D表示を開始できませんでした。SafariでWeb公開したURLを開いてください。詳細: '+String(err.message||err)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

