import {WORLDS,SPAWN,MAX_PLAYERS,EMOTES,normalizeRoomCode,makeRoomCode,cleanName,cleanChat,limitPosition} from './dimension-protocol.mjs';
import {createDimension2D,FLOWERS} from './dimension-art2d.mjs';

const $=id=>document.getElementById(id);
const colorNames=['杏','空','藤','若葉','金','桜'];
const url=new URL(window.location.href);
const ROOM_URL=String(window.KOMOREBI_ROOM_WS_URL||'').trim();
const ENDPOINT_VALID=/^wss:\/\/[^\s]+\/ws$/.test(ROOM_URL);
const MY_KEY='komorebi_dimension_display_v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(MY_KEY)||'{}')||{};}catch{}
const nick=cleanName(saved.name||'たびびと');
const player={id:'offline',name:nick,world:WORLDS.THREE_D,...SPAWN.plaza3d,color:Number.isInteger(saved.color)?saved.color%6:Math.floor(Math.random()*6),facing:0};
let world=player.world,started=false,connection=null,connected=false,connecting=false,players=new Map(),myId='offline';
let world3d=null,frame=0,last=0,lastSent=0,worldLock=false,collected=new Set();
const inputs={up:false,down:false,left:false,right:false};
const art2d=createDimension2D($('dimension2d'));
const room=normalizeRoomCode(url.searchParams.get('room'))||makeRoomCode();
$('roomCode').value=room;$('playerName').value=player.name;
$('networkNotice').textContent=ENDPOINT_VALID?'招待コードを送ると最大'+MAX_PLAYERS+'人で遊べます。':'オンラインサーバーはまだ接続されていません。今は一人用の世界を遊べます。';
$('copyRoom').disabled=!ENDPOINT_VALID;
$('connectRoom').disabled=!ENDPOINT_VALID;
if(!ENDPOINT_VALID)$('connectRoom').textContent='🔌 サーバー接続待ち';
function status(text,isOnline=false){
 $('connectionStatus').textContent=(isOnline?'● ':'◯ ')+text;
 $('connectionStatus').style.background=isOnline?'#2d8b72e8':'#163e54dc';
 $('onlineCount').textContent=(connected?players.size+1:1)+'人';
}
function eventChat(text,kind=''){
 const box=$('chatFeed'),line=document.createElement('p');line.textContent=text;
 if(kind==='notice')line.style.background='#6e6896dd';
 box.appendChild(line);
 while(box.children.length>4)box.firstChild.remove();
}
function playerList(){
 const target=$('playerList');target.replaceChildren();
 const add=text=>{
  const span=document.createElement('span');span.textContent=text;target.appendChild(span);
 };
 add(player.name+(connected?'（自分）':'（オフライン）'));
 for(const other of players.values())add(other.name+(other.world===world?' ✨':' 🌀'));
 $('onlineCount').textContent=(connected?players.size+1:1)+'人';
}
function inviteUrl(){
 const s=new URL(window.location.href);s.search='';
 s.searchParams.set('room',$('roomCode').value);
 return s.toString();
}
function doSend(data){
 if(!connected||connection?.readyState!==WebSocket.OPEN)return false;
 try{connection.send(JSON.stringify(data));return true;}catch{return false;}
}
function disconnect(){
 if(connection){try{connection.close(1000,'leave');}catch{}}
 connection=null;connected=false;connecting=false;players.clear();myId='offline';player.id='offline';
 status('オフライン体験');playerList();
}
function joinRoom(){
 if(!ENDPOINT_VALID){$('networkNotice').textContent='Cloudflareの部屋サーバーを公開するとオンラインで遊べます。今は一人用体験版です。';return;}
 const code=normalizeRoomCode($('roomCode').value);
 if(!code){$('networkNotice').textContent='招待コードは英数字6文字です。';return;}
 player.name=cleanName($('playerName').value);
 $('playerName').value=player.name;
 try{localStorage.setItem(MY_KEY,JSON.stringify({name:player.name,color:player.color}));}catch{}
 disconnect();
 connecting=true;status('接続中…');
 const endpoint=new URL(ROOM_URL);endpoint.searchParams.set('room',code);
 endpoint.searchParams.set('name',player.name);endpoint.searchParams.set('color',String(player.color));
 const ws=new WebSocket(endpoint.href);connection=ws;
 ws.addEventListener('open',()=>{if(connection!==ws)return;status('参加を確認中…');});
 ws.addEventListener('message',event=>{
  if(connection!==ws)return;
  let data;try{data=JSON.parse(event.data);}catch{return;}
  handlePacket(data);
 });
 ws.addEventListener('close',event=>{
  if(connection!==ws)return;
  const reason=event.code===1000?'部屋から退出しました':'接続が切れました。再入室できます';
  disconnect();$('networkNotice').textContent=reason;
 });
 ws.addEventListener('error',()=>{if(connection===ws)$('networkNotice').textContent='サーバーに接続できません。URLとCloudflareの設定を確認してください。';});
}
function handlePacket(msg){
 if(!msg||typeof msg!=='object')return;
 if(msg.type==='welcome'){
  myId=String(msg.you);player.id=myId;connected=true;connecting=false;
  players.clear();
  for(const person of msg.players||[])if(person.id!==myId&&person.world)players.set(person.id,person);
  status('オンライン接続中',true);
  $('networkNotice').textContent='同じ招待コードの友達と同じ空間で遊べます（最大'+MAX_PLAYERS+'人）。';
  playerList();eventChat('🌿 ルームに入りました','notice');
  if(world!==WORLDS.THREE_D)doSend({type:'world',world});
  doSend({type:'move',x:player.x,z:player.z});
 }
 if(!connected)return;
 if(msg.type==='join'&&msg.player?.id!==myId){
  players.set(msg.player.id,msg.player);playerList();eventChat('👋 '+msg.player.name+' がやってきました');
 }
 if(msg.type==='leave'){if(players.has(msg.id)){const p=players.get(msg.id);players.delete(msg.id);playerList();eventChat('👋 '+p.name+' が退出しました');}}
 if(msg.type==='move'){
  const p=players.get(msg.id);if(!p)return;
  const coords=limitPosition(msg.world,msg.x,msg.z);
  if(!coords)return;Object.assign(p,coords,{world:msg.world});
 }
 if(msg.type==='world'){
  const p=players.get(msg.id);
  if(p){Object.assign(p,{world:msg.world,x:msg.x,z:msg.z});playerList();eventChat('🌀 '+p.name+' が世界を移動しました','notice');}
 }
 if(msg.type==='chat')eventChat('💬 '+cleanName(msg.name)+': '+cleanChat(msg.text));
 if(msg.type==='emote')eventChat('✨ '+(players.get(msg.id)?.name||'だれか')+' が '+({wave:'手を振った',heart:'ハートを送った',dance:'ダンスした',cheer:'応援した'}[msg.emote]||'あいさつした'));
}
function switchWorld(next){
 if(worldLock||!started)return;
 worldLock=true;$('sceneFade').classList.add('active');
 window.setTimeout(()=>{
  world=next&&next!==world?next:(world===WORLDS.THREE_D?WORLDS.TWO_D:WORLDS.THREE_D);
  player.world=world;player.x=SPAWN[world].x;player.z=SPAWN[world].z;
  document.documentElement.dataset.dimension=world;
  if(world===WORLDS.TWO_D)collected=new Set();
  const two=world===WORLDS.TWO_D;
  $('dimension3d').hidden=two;$('dimension2d').hidden=!two;
  $('worldName').textContent=two?'2D・花びらのガーデン':'3D・星の交流広場';
  $('toggleWorld').textContent=two?'🚪 3Dの世界へ':'🚪 2Dの世界へ';
  $('portalAction').textContent=two?'🌈 3Dへ戻る':'🌈 2Dへ行く';
  $('minigameHud').hidden=!two;
  $('helpMessage').textContent=two?'🌼 8枚の花びらを集めよう！':'🌟 星の門から2Dの庭へ冒険しよう！';
  doSend({type:'world',world});
  playerList();eventChat(two?'🌼 ドット絵の世界に入った！':'✨ 3Dの広場に戻った！','notice');
  window.setTimeout(()=>{$('sceneFade').classList.remove('active');worldLock=false;},220);
 },180);
}
function collectFlowers(){
 if(world!==WORLDS.TWO_D)return;
 for(let i=0;i<FLOWERS.length;i++){
  if(collected.has(i))continue;
  const f=FLOWERS[i];if(Math.hypot(player.x-f.x,player.z-f.z)<1.1){
   collected.add(i);$('petals').textContent=String(collected.size);
   eventChat('🌼 花びらを発見！ '+collected.size+' / 8','notice');
   if(collected.size===8){
    $('helpMessage').textContent='🎉 全部集めた！ 3Dに戻るとまた遊べるよ';
    eventChat('🎉 花びらを全部集めた！','notice');
   }
  }
 }
}
function step(now){
 if(!started){frame=requestAnimationFrame(step);return;}
 let dt=last?Math.min(.052,(now-last)/1000):1/60;last=now;
 if(!worldLock&&!document.hidden&&$('friendsPanel').hidden&&$('chatForm').hidden){
  const dx=(inputs.right?1:0)-(inputs.left?1:0),dz=(inputs.down?1:0)-(inputs.up?1:0);
  if(dx||dz){
   const len=Math.hypot(dx,dz)||1,step=5.2*dt;
   const next=limitPosition(world,player.x+dx/len*step,player.z+dz/len*step);
   if(next){
    const elliptical=(next.x/29)**2+(next.z/22)**2;
    if(elliptical<.94){player.x=next.x;player.z=next.z;}
   }
   player.facing=Math.atan2(dx,dz);
   collectFlowers();
   if(connected&&now-lastSent>220){doSend({type:'move',x:player.x,z:player.z});lastSent=now;}
  }
 }
 const visible=[...players.values()].filter(x=>x.world===world);
 if(world===WORLDS.THREE_D){
  if(world3d)world3d.render(player,visible,now,dt);
 }else{
  art2d.render(player,visible,collected,now);
 }
 frame=requestAnimationFrame(step);
}
async function enter(){
 if(started)return;
 started=true;$('startWelcome').hidden=true;status('オフライン体験');
 try{
  const {createDimension3D}=await import('./dimension-scene3d.mjs?v=20261114-a1');
  world3d=createDimension3D($('dimension3d'));
  document.documentElement.dataset.dimension=WORLDS.THREE_D;
 }catch(error){
  console.error(error);
  world=WORLDS.TWO_D;player.world=world;player.x=0;player.z=3;
  document.documentElement.dataset.dimension=WORLDS.TWO_D;
  $('dimension3d').hidden=true;$('dimension2d').hidden=false;
  $('worldName').textContent='2D・花びらのガーデン';
  $('toggleWorld').textContent='3D（読込失敗）';
  $('minigameHud').hidden=false;
  eventChat('3Dの読み込みに失敗したため2Dで遊べます','notice');
 }
 playerList();
 if(ENDPOINT_VALID&&normalizeRoomCode(url.searchParams.get('room')))joinRoom();
 last=0;
 if(!frame)frame=requestAnimationFrame(step);
}
function bind(){
 $('enterWorld').addEventListener('click',enter);
 $('toggleWorld').addEventListener('click',()=>switchWorld());
 $('portalAction').addEventListener('click',()=>switchWorld());
 $('openFriends').addEventListener('click',()=>{$('friendsPanel').hidden=false;playerList();});
 $('closeFriends').addEventListener('click',()=>{$('friendsPanel').hidden=true;});
 $('newRoom').addEventListener('click',()=>{
  if(connected)disconnect();
  $('roomCode').value=makeRoomCode();
  $('networkNotice').textContent='新しい招待コードができました。友達にURLを送ろう。';
 });
 $('roomCode').addEventListener('input',()=>{
  const code=$('roomCode').value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
  $('roomCode').value=code;
 });
 $('connectRoom').addEventListener('click',joinRoom);
 $('copyRoom').addEventListener('click',async()=>{
  const code=normalizeRoomCode($('roomCode').value);
  if(!ENDPOINT_VALID){$('networkNotice').textContent='オンラインサーバー配備後に招待URLを共有できます。';return;}
  if(!code){$('networkNotice').textContent='先に招待コードを設定してください。';return;}
  try{await navigator.clipboard.writeText(inviteUrl());$('networkNotice').textContent='招待URLをコピーしました！';}
  catch{$('networkNotice').textContent='この環境ではコピーできません。URLを直接共有してください。';}
 });
 $('emoteButton').addEventListener('click',()=>{
  eventChat('👋 '+player.name+' が手を振った');
  doSend({type:'emote',emote:'wave'});
 });
 $('chatToggle').addEventListener('click',()=>{$('chatForm').hidden=!$('chatForm').hidden;if(!$('chatForm').hidden)$('chatInput').focus();});
 $('chatForm').addEventListener('submit',event=>{
  event.preventDefault();
  const text=cleanChat($('chatInput').value);if(!text)return;
  if(connected)doSend({type:'chat',text});
  else eventChat('🔒 オフライン中は他の人に届きません','notice');
  $('chatInput').value='';$('chatForm').hidden=true;
 });
 for(const button of document.querySelectorAll('[data-move]')){
  const key=button.dataset.move;
  const release=()=>{inputs[key]=false;button.classList.remove('pressed');};
  button.addEventListener('pointerdown',ev=>{
   ev.preventDefault();inputs[key]=true;button.classList.add('pressed');
   try{button.setPointerCapture(ev.pointerId);}catch{}
  },{passive:false});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
 }
 const KEY={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right'};
 window.addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;
  if(KEY[e.code]){inputs[KEY[e.code]]=true;e.preventDefault();}
  if(e.code==='KeyE'&&!e.repeat){switchWorld();e.preventDefault();}
  if(e.code==='Escape'){$('friendsPanel').hidden=true;$('chatForm').hidden=true;}
 });
 window.addEventListener('keyup',e=>{
  if(KEY[e.code]){inputs[KEY[e.code]]=false;e.preventDefault();}
 });
 window.addEventListener('blur',()=>Object.keys(inputs).forEach(k=>inputs[k]=false));
 window.addEventListener('pagehide',()=>{
  if(connection)try{connection.close(1000,'pagehide');}catch{}
  cancelAnimationFrame(frame);
 });
}
bind();
playerList();
window.__dimensionTest={get:()=>({world,player:{...player},connected,peers:players.size,petals:collected.size,started}),
 enter,switchWorld,to2D:()=>switchWorld(WORLDS.TWO_D),to3D:()=>switchWorld(WORLDS.THREE_D),handlePacket};
if(new URLSearchParams(location.search).get('demo')==='dimensions2d'){
 enter().then(()=>{window.setTimeout(()=>switchWorld(WORLDS.TWO_D),300);});
}else if(new URLSearchParams(location.search).get('demo')==='dimensions3d')enter();
