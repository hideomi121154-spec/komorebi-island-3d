/* Komorebi Island's real-world Japanese time and daylight palette.
 * Reads the device clock and formats the date/time in Asia/Tokyo; no accelerated time.
 * Pure helpers let tests exercise midnight changes without affecting saved inventory. */
(() => {
'use strict';
const DAY_MINUTES = 1440;
const TZ='Asia/Tokyo';
const jstFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
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
function realTimeAt(epochMilliseconds=Date.now()){
 const date=new Date(epochMilliseconds);
 if(!Number.isFinite(date.getTime()))throw new Error('Invalid system clock');
 const parts=Object.fromEntries(jstFormatter.formatToParts(date).map(p=>[p.type,p.value]));
 const hour=Number(parts.hour),minute=Number(parts.minute),second=Number(parts.second);
 return {
  dateKey:parts.year+'-'+parts.month+'-'+parts.day,
  minutes:hour*60+minute+second/60,
  formatted:parts.hour+':'+parts.minute,
  hour,minute,second,
  timeZone:TZ
 };
}
function calendarDayDiff(previousDateKey,currentDateKey){
 const regex=/^(\d{4})-(\d{2})-(\d{2})$/;
 const before=regex.exec(String(previousDateKey||'')),after=regex.exec(String(currentDateKey||''));
 if(!before||!after)return 0;
 const toUTC=p=>Date.UTC(Number(p[1]),Number(p[2])-1,Number(p[3]));
 return Math.round((toUTC(after)-toUTC(before))/86400000);
}
window.KomorebiTime={DAY_MINUTES,TZ,normalMinutes,phaseOf,format,paletteAt,realTimeAt,calendarDayDiff};
})();
