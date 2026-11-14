/* Komorebi Grand Prix Preview 01 — standalone race controller.
   Imported engine failure never affects the legacy island or existing save data. */
import {TYPES,readWallet,selectValid,estimateOdds,makeTicket,placeTicket,settleTicket,ticketLabel} from './kart-forecast.mjs';
const $=id=>document.getElementById(id);
const DRIVER_COLORS=['#ffc45a','#ef6d82','#70c3d4','#b3a0ef','#7dcc9a','#f0a66c','#72c1c1','#d5b674'];
const kart=window.KomorebiKart;
const state={ready:false,started:false,finished:false,last:0,frames:0,quality:'auto',displayMessage:'',messageUntil:0,engine:null,scene:null,frameHandle:0,mode:'drive',spectatorSeed:0,spectatorGrid:null,activeTicketId:null,watchCamera:'leader'};
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
 $('restart').addEventListener('click',()=>state.mode==='spectate'?openForecast():startRace());
 bindForecastControls();
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
function startRace(options={}){
 if(!state.ready)return;
 const watching=options.mode==='spectate';
 kart.start(watching?{playerAtBack:true,spectator:true,seed:state.spectatorSeed}:{playerAtBack:true});
 state.mode=watching?'spectate':'drive';
 state.scene.setSpectatorCamera?.(watching?'leader':'drive');
 state.started=true;state.finished=false;state.last=performance.now();
 document.documentElement.dataset.kart3d='running';
 $('splash').hidden=true;$('forecastOverlay').hidden=true;$('finishScreen').hidden=true;$('hud').hidden=false;
 $('hud').classList.toggle('spectating',watching);$('spectatorBoard').hidden=!watching;
 $('resultPayout').hidden=true;
 $('restart').textContent=watching?'🎟️ 次の予想レース':'もう一度走る';
 $('auto').textContent='🚗 オート加速 ON';$('raceCall').textContent='🏁 3・2・1… START!';
 message(watching?'📺 AI8台のレースが始まります！':'🌊 群島グランプリへようこそ！');
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
 if(state.mode==='spectate')$('raceCall').textContent='📺 AI GRAND PRIX 中継';
 else if(info.star>0)$('raceCall').textContent='🌟 スター無敵！';
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
  if(state.mode==='spectate'&&state.frames%10===0)showLivePositions(data);
  if(state.frames%4===0)updateUI(data,now);
  if(data.finished&&!state.finished){
   state.finished=true;
   if(state.mode==='spectate')finishSpectator(data);
   else $('finishResult').textContent=data.place+'位でゴール！ 走行タイム '+fmt(data.elapsed);
   $('finishScreen').hidden=false;
   state.engine?.setLevel(0);
  }
  if(state.frames%4===0)state.engine?.setLevel(Math.max(0,Math.min(1,(data.player?.speed||0)/24)));
 }catch(error){
  state.started=false;cancelAnimationFrame(state.frameHandle);state.frameHandle=0;failure(error.message||String(error));
 }
}
function fillSelect(select,entries,selected){
 select.replaceChildren();
 for(const entry of entries){
  const option=document.createElement('option');option.value=String(entry.number);
  option.textContent=entry.number+'号 '+entry.name;select.appendChild(option);
 }
 select.value=String(selected);
}
function showHistory(){
 const w=readWallet(localStorage);
 $('medalBalance').textContent=w.balance.toLocaleString('ja-JP');
 const container=$('betHistory');container.replaceChildren();
 const rows=w.history.slice(-8).reverse();
 if(!rows.length){container.textContent='まだ予想はありません';return;}
 for(const t of rows){
  const row=document.createElement('p');
  const label=ticketLabel(t);
  row.textContent=label+' / '+(t.status==='settled'?(t.hit?'的中 ＋'+t.payout+' B':'不的中 0 B'):'結果待ち');
  container.appendChild(row);
 }
}
function updateOdds(){
 const type=$('betType').value,stake=Number($('stake').value);
 $('pick2Label').hidden=TYPES[type].count<2;
 $('pick3Label').hidden=TYPES[type].count<3;
 const picks=[$('pick1'),$('pick2'),$('pick3')].slice(0,TYPES[type].count).map(x=>Number(x.value));
 const valid=selectValid(type,picks);
 const odds=valid?estimateOdds(state.spectatorGrid,type,picks):null;
 $('watchBegin').disabled=!!stake&&(!valid||readWallet(localStorage).balance<stake);
 $('oddsPreview').textContent=stake===0?'🎫 無料観戦です。メダルを使わず全8台のレースを見られます。':!valid?'番号が重複しています。別の番号を選んでください':stake>readWallet(localStorage).balance?'メダルが足りません。無料観戦も可能です':'予想倍率 ×'+odds.toFixed(1)+' ｜ 的中時の払戻 '+Math.floor(stake*odds)+' B（元金込み）';
}
function openForecast(){
 state.started=false;state.finished=false;
 state.spectatorSeed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;
 state.spectatorGrid=kart.forecastGrid(state.spectatorSeed);
 $('finishScreen').hidden=true;$('hud').hidden=true;$('splash').hidden=true;
 const box=$('raceLineup');box.replaceChildren();
 for(const entry of state.spectatorGrid){
  const el=document.createElement('div');el.className='racer-row';
  const num=document.createElement('span');num.className='racer-number';num.style.setProperty('--driver-color',DRIVER_COLORS[entry.number-1]);num.textContent=entry.number;
  const desc=document.createElement('div');const name=document.createElement('strong');name.textContent=entry.name;
  const meta=document.createElement('small');meta.className='racer-meta';meta.textContent='速さ ★'+entry.speed.toFixed(1)+' / 操作性 '+('★'.repeat(entry.handling));
  desc.append(name,meta);el.append(num,desc);box.appendChild(el);
 }
 for(const [i,id] of ['pick1','pick2','pick3'].entries())fillSelect($(id),state.spectatorGrid,i+1);
 $('betType').value='win';$('stake').value='0';
 $('forecastError').textContent='';
 showHistory();updateOdds();
 $('forecastOverlay').hidden=false;
}
function beginSpectating(){
 const type=$('betType').value,picks=[$('pick1'),$('pick2'),$('pick3')].slice(0,TYPES[type].count).map(el=>Number(el.value));
 const stake=Number($('stake').value);
 $('forecastError').textContent='';
 try{
  state.activeTicketId=null;
  if(stake>0){
   const id='gp-'+Date.now()+'-'+Math.floor(Math.random()*1000000);
   const ticket=makeTicket({id,grid:state.spectatorGrid,type,picks,stake,seed:state.spectatorSeed});
   placeTicket(localStorage,ticket);
   state.activeTicketId=id;
  }
  startRace({mode:'spectate'});
  message(stake>0?'🎟️ 予想確定！ 発走後は変更できません':'📺 無料で観戦中');
 }catch(e){$('forecastError').textContent=e.message||String(e);updateOdds();}
}
function showLivePositions(data){
 const all=[data.player,...data.opponents].map((p,i)=>({number:i+1,distance:p.distance}));
 all.sort((a,b)=>b.distance-a.distance);
 const box=$('livePositions');box.replaceChildren();
 for(let i=0;i<all.length;i++){
  const row=document.createElement('div');
  const name=state.spectatorGrid?.[all[i].number-1]?.name||'CPU';
  const left=document.createElement('span'),right=document.createElement('span');
  left.textContent=(i+1)+'位 '+all[i].number+'号 '+name;
  right.textContent=Math.max(0,Math.min(100,Math.floor(all[i].distance/(kart.length*3)*100)))+'%';
  row.append(left,right);box.appendChild(row);
 }
}
function finishSpectator(data){
 const order=data.finishOrder;
 $('finishResult').textContent='🏆 確定着順 '+order.slice(0,3).map((n,i)=>(i+1)+'着 '+n+'号 '+state.spectatorGrid[n-1].name).join(' / ')+'　全8台完走 '+fmt(data.elapsed);
 const p=$('resultPayout');p.hidden=false;
 if(state.activeTicketId){
  try{
   const result=settleTicket(localStorage,state.activeTicketId,order);
   p.textContent=(result.ticket.hit?'🎉 予想的中！':'今回は不的中')+'　払戻 '+result.ticket.payout+' B / 残高 '+result.wallet.balance+' B';
  }catch(e){p.textContent='精算エラー：'+(e.message||e);}
 }else p.textContent='🎫 無料観戦のため、メダルの増減はありません。';
}
function bindForecastControls(){
 $('watchRace').addEventListener('click',openForecast);
 $('forecastClose').addEventListener('click',()=>{$('forecastOverlay').hidden=true;$('splash').hidden=false;});
 for(const id of ['betType','pick1','pick2','pick3','stake'])$(id).addEventListener('change',updateOdds);
 $('watchBegin').addEventListener('click',beginSpectating);
 $('spectatorCamera').addEventListener('click',()=>{
  state.watchCamera=state.watchCamera==='leader'?'overhead':'leader';
  state.scene?.setSpectatorCamera?.(state.watchCamera);
  $('spectatorCamera').textContent=state.watchCamera==='leader'?'📷 全体俯瞰に切替':'📷 先頭追走に切替';
 });
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
 $('startRace').disabled=false;$('watchRace').disabled=false;
 $('loadMessage').textContent='準備完了！ スタートを押すと音が出ます。';
 controls();
 // Audio only begins inside a real user tap, never on page load.
 $('startRace').addEventListener('click',()=>{if(!state.engine)state.engine=createEngineSound();});
 $('restart').addEventListener('click',()=>{if(!state.engine)state.engine=createEngineSound();});
 // Headless Chrome may start the race for visual regression screenshots.
 if(new URLSearchParams(location.search).get('preview')==='watch'){
  openForecast();$('stake').value='0';$('watchBegin').click();
 }
 if(new URLSearchParams(location.search).get('preview')==='1'){
  startRace();
  // Move a deterministic few seconds into the race for reproducible visuals.
  for(let frame=0;frame<600;frame++)kart.step(1/60);
  state.last=performance.now();
  const data=kart.getState();
  // Screenshot fast-forward skips real camera frames; settle chase interpolation
  // so visual tests show the true in-race angle, not the old start position.
  for(let n=0;n<55;n++)state.scene.update(data,performance.now()+n*16,1/60);
  state.scene.render();updateUI(data,performance.now());miniMap(data);
 }
}
init().catch(error=>failure(error.message||error));
