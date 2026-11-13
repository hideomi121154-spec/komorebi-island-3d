/* Komorebi Grand Prix Preview 01 — standalone race controller.
   Imported engine failure never affects the legacy island or existing save data. */
const $=id=>document.getElementById(id);
const kart=window.KomorebiKart;
const state={ready:false,started:false,finished:false,last:0,frames:0,quality:'auto',displayMessage:'',messageUntil:0,engine:null,scene:null,frameHandle:0};
const fmt=(seconds)=>{
 const whole=Math.max(0,Math.floor(seconds)),mins=Math.floor(whole/60),secs=whole%60;
 return String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');
};
function failure(msg){
 document.documentElement.dataset.kart3d='error';
 $('fatal').hidden=false;$('fatalText').textContent='高品質3Dモードを起動できませんでした: '+String(msg);
 $('loadMessage').textContent='新しい3Dエンジンの読み込みに失敗しました。';
 $('startRace').disabled=true;console.error('Komorebi Grand Prix:',msg);
}
function controls(){
 const links={left:'left',right:'right',brake:'brake',drift:'drift'};
 for(const [id,name] of Object.entries(links)){
  const el=$(id);if(!el)continue;
  const up=()=>{kart?.setInput(name,false);el.classList.remove('pressed');};
  el.addEventListener('pointerdown',e=>{
   if(!state.started)return;
   e.preventDefault();kart.setInput(name,true);
   el.classList.add('pressed');
   try{el.setPointerCapture(e.pointerId);}catch{}
  },{passive:false});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,up);
  el.addEventListener('contextmenu',e=>e.preventDefault());
 }
 $('item').addEventListener('click',()=>{
  if(!state.started)return;
  if(kart.useItem())message('✨ アイテム発動！');
 });
 $('rescue').addEventListener('click',()=>{if(state.started)kart.rescue();});
 $('auto').addEventListener('click',()=>{
  if(!state.started)return;
  kart.toggleAuto();$('auto').textContent=kart.getState().autoDrive?'🚗 オート加速 ON':'🚘 マニュアル加速';
 });
 $('quality').addEventListener('click',()=>{
  const values=['auto','quality','performance'],labels={auto:'画質：自動',quality:'画質：高',performance:'画質：軽量'};
  state.quality=values[(values.indexOf(state.quality)+1)%values.length];
  state.scene?.setQuality(state.quality);$('quality').textContent=labels[state.quality];
 });
 $('restart').addEventListener('click',()=>startRace());
 $('startRace').addEventListener('click',()=>startRace());
 window.addEventListener('keydown',e=>{
  if(e.code==='Escape'){window.location.href='./index.html';return;}
  if(e.code==='KeyR'&&state.finished){startRace();e.preventDefault();return;}
  if(!state.started)return;
  if(kart.keyInput(e.code,true))e.preventDefault();
 });
 window.addEventListener('keyup',e=>{
  if(state.started&&kart.keyInput(e.code,false))e.preventDefault();
 });
 window.addEventListener('blur',()=>{
  ['left','right','brake','drift','accelerate'].forEach(x=>kart?.setInput(x,false));
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)state.last=0;
 });
}
function message(text){
 const element=$('message');
 element.textContent=text;element.classList.add('visible');
 state.messageUntil=performance.now()+2300;
}
function startRace(){
 if(!state.ready)return;
 kart.start();state.started=true;state.finished=false;state.last=performance.now();
 document.documentElement.dataset.kart3d='running';
 $('splash').hidden=true;$('finishScreen').hidden=true;$('hud').hidden=false;
 $('auto').textContent='🚗 オート加速 ON';$('raceCall').textContent='🏁 3・2・1… START!';
 message('🌊 群島グランプリへようこそ！');
 if(!state.frameHandle)state.frameHandle=requestAnimationFrame(tick);
}
function updateUI(info,now){
 if(!info.player)return;
 $('position').textContent=info.place+'位 / 8台';
 $('lap').textContent=Math.min(3,Math.max(1,info.lap))+' / 3 LAP';
 $('speed').textContent=Math.round((info.player.speed||0)*8)+' km/h';
 $('time').textContent=fmt(info.elapsed);
 $('item').textContent=info.item?({turbo:'⚡ ターボ',bubble:'🫧 バリア',seed:'🌰 木の実',gust:'🍃 追い風',star:'🌟 スター'}[info.item]||'🎁 アイテム'):'🎁 アイテム';
 $('item').disabled=!info.item;
 if(info.star>0)$('raceCall').textContent='🌟 スター無敵！';
 else if(info.shield>0)$('raceCall').textContent='🫧 バリア展開中';
 else if(info.jumpTimer>0)$('raceCall').textContent='🪽 ジャンプ！';
 else if(info.player.boost>0)$('raceCall').textContent='⚡ ターボ加速！';
 else if(info.item)$('raceCall').textContent='🎁 アイテムを使おう！';
 else $('raceCall').textContent='🏁 KOMOREBI GRAND PRIX';
 if(state.messageUntil<now)$('message').classList.remove('visible');
}
function miniMap(info){
 const c=$('trackMap').getContext('2d');if(!c||!info.player)return;
 const w=c.canvas.width,h=c.canvas.height,b=kart.COURSE_BOUNDS;
 const scale=Math.min((w-24)/(b.maxX-b.minX),(h-24)/(b.maxZ-b.minZ));
 const x=v=>w/2+(v-(b.minX+b.maxX)/2)*scale;
 const z=v=>h/2+(v-(b.minZ+b.maxZ)/2)*scale;
 c.clearRect(0,0,w,h);c.lineJoin='round';c.lineCap='round';
 c.beginPath();for(let j=0;j<=160;j++){const p=kart.at(kart.length*j/160);if(j===0)c.moveTo(x(p.x),z(p.z));else c.lineTo(x(p.x),z(p.z));}
 c.strokeStyle='#fff7dd';c.lineWidth=10;c.stroke();c.strokeStyle='#52778c';c.lineWidth=6;c.stroke();
 for(const opp of info.opponents){
  c.beginPath();c.arc(x(opp.x),z(opp.z),3.0,0,Math.PI*2);c.fillStyle='#db748e';c.fill();
 }
 c.beginPath();c.arc(x(info.player.x),z(info.player.z),5.3,0,Math.PI*2);
 c.fillStyle='#f5bd53';c.fill();c.strokeStyle='#234854';c.lineWidth=2;c.stroke();
}
function tick(now){
 if(!state.started){state.frameHandle=0;return;}
 state.frameHandle=requestAnimationFrame(tick);
 const dt=state.last?Math.min(.045,Math.max(0,(now-state.last)/1000)):1/60;state.last=now;
 try{
  kart.step(dt);
  const data=kart.getState();
  state.scene.update(data,now,dt);
  state.scene.render();
  state.frames++;
  if(state.frames%3===0)miniMap(data);
  if(state.frames%4===0)updateUI(data,now);
  if(data.finished&&!state.finished){
   state.finished=true;
   $('finishResult').textContent=data.place+'位でゴール！ 走行タイム '+fmt(data.elapsed);
   $('finishScreen').hidden=false;
   state.engine?.setLevel(0);
  }
  if(state.frames%4===0)state.engine?.setLevel(Math.max(0,Math.min(1,(data.player?.speed||0)/24)));
 }catch(error){
  state.started=false;cancelAnimationFrame(state.frameHandle);state.frameHandle=0;failure(error.message||String(error));
 }
}
function createEngineSound(){
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio)return null;
 try{
  const ctx=new Audio(),volume=ctx.createGain(),low=ctx.createOscillator(),filter=ctx.createBiquadFilter();
  low.type='sawtooth';low.frequency.value=58;filter.type='lowpass';filter.frequency.value=230;
  volume.gain.value=.0;low.connect(filter);filter.connect(volume);volume.connect(ctx.destination);low.start();
  return {
   setLevel(value){
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    low.frequency.setTargetAtTime(55+value*130,ctx.currentTime,.07);
    filter.frequency.setTargetAtTime(180+value*320,ctx.currentTime,.07);
    volume.gain.setTargetAtTime(value*.032,ctx.currentTime,.11);
   },
   stop(){low.stop();ctx.close().catch(()=>{});}
  };
 }catch{return null;}
}
async function init(){
 if(!kart)throw Error('従来レースのシミュレーションを読み込めません');
 $('loadMessage').textContent='専用3Dエンジンとコースを読み込み中…';
 const {createRaceView}=await import('./kart-next-scene.js?v=20261113-a1');
 state.scene=await createRaceView(kart,$('raceCanvas'));
 // Pre-render the new world before the player presses start.
 const start=kart.at(3);
 state.scene.camera.position.set(start.x-4,6,start.z-9);
 state.scene.camera.lookAt(start.x,0,start.z);
 state.scene.render();state.ready=true;
 document.documentElement.dataset.kart3d='ready';
 $('startRace').disabled=false;
 $('loadMessage').textContent='準備完了！ スタートを押すと音が出ます。';
 controls();
 // Audio only begins inside a real user tap, never on page load.
 $('startRace').addEventListener('click',()=>{if(!state.engine)state.engine=createEngineSound();});
 $('restart').addEventListener('click',()=>{if(!state.engine)state.engine=createEngineSound();});
 // Headless Chrome may start the race for visual regression screenshots.
 if(new URLSearchParams(location.search).get('preview')==='1')startRace();
}
init().catch(error=>failure(error.message||error));
