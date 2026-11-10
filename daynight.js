/* Komorebi Island's independent game clock and daylight palette.
 * One in-game day lasts 12 active foreground minutes. The clock is not the device's time.
 * Pure helpers enable tests without a browser. Existing save files need no migration. */
(() => {
'use strict';
const DAY_MINUTES = 1440;
const GAME_MINUTES_PER_REAL_SECOND = 2;
const checkpoints = [
  {m:0,     top:'#132746', horizon:'#304a6b', fog:'#2a4563', darkness:.79, stars:1},
  {m:285,   top:'#34416f', horizon:'#766c8b', fog:'#68718a', darkness:.60, stars:.52},
  {m:360,   top:'#e79b82', horizon:'#f1cf9d', fog:'#c8bba2', darkness:.34, stars:0},
  {m:480,   top:'#a9dbe7', horizon:'#d4ede3', fog:'#afd9d0', darkness:.055, stars:0},
  {m:720,   top:'#b7e7f0', horizon:'#d7f0e2', fog:'#afdcd6', darkness:0, stars:0},
  {m:990,   top:'#91c9d8', horizon:'#f0d4af', fog:'#b9d8d2', darkness:.10, stars:0},
  {m:1110,  top:'#d7797e', horizon:'#f6b77d', fog:'#b88c91', darkness:.43, stars:0},
  {m:1200,  top:'#38446e', horizon:'#64597b', fog:'#535b7a', darkness:.70, stars:.8},
  {m:1320,  top:'#152b4f', horizon:'#344e70', fog:'#304962', darkness:.78, stars:1},
  {m:1440,  top:'#132746', horizon:'#304a6b', fog:'#2a4563', darkness:.79, stars:1}
];
const parseHex=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const mix=(a,b,t)=>a+(b-a)*t;
const normalMinutes=minutes=>((Number.isFinite(minutes)?minutes:480)%DAY_MINUTES+DAY_MINUTES)%DAY_MINUTES;
function phaseOf(minutes){
 const m=normalMinutes(minutes);
 if(m>=300&&m<600)return {id:'morning',label:'朝',icon:'🌅'};
 if(m>=600&&m<1020)return {id:'day',label:'昼',icon:'☀️'};
 if(m>=1020&&m<1170)return {id:'evening',label:'夕方',icon:'🌇'};
 return {id:'night',label:'夜',icon:'🌙'};
}
function format(minutes){
 const whole=Math.floor(normalMinutes(minutes));
 return String(Math.floor(whole/60)).padStart(2,'0')+':'+String(whole%60).padStart(2,'0');
}
function paletteAt(minutes){
 const m=normalMinutes(minutes);
 let a=checkpoints[0],b=checkpoints[1];
 for(let i=1;i<checkpoints.length;i++){
  if(m<=checkpoints[i].m){a=checkpoints[i-1];b=checkpoints[i];break}
 }
 const t=Math.max(0,Math.min(1,(m-a.m)/(b.m-a.m)));
 const colors=key=>parseHex(a[key]).map((v,i)=>mix(v,parseHex(b[key])[i],t));
 return {top:colors('top'),horizon:colors('horizon'),fog:colors('fog'),
  darkness:mix(a.darkness,b.darkness,t),stars:mix(a.stars,b.stars,t)};
}
function advance(minutes,elapsedSeconds){
 const elapsed=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0);
 const total=normalMinutes(minutes)+elapsed*GAME_MINUTES_PER_REAL_SECOND;
 return {minutes:total%DAY_MINUTES,days:Math.floor(total/DAY_MINUTES)};
}
function nextPeriod(minutes){
 const m=normalMinutes(minutes);
 const targets=[360,720,1080,1260];
 const next=targets.find(t=>t>m+1e-6);
 if(next!==undefined)return {minutes:next,days:0};
 return {minutes:targets[0],days:1};
}
window.KomorebiTime={DAY_MINUTES,GAME_MINUTES_PER_REAL_SECOND,normalMinutes,phaseOf,format,paletteAt,advance,nextPeriod};
})();
