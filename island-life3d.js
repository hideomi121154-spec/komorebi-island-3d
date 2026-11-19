/* Original low-poly island residents and wildlife, independent of battle mode. */
(()=>{
'use strict';
const TAU=Math.PI*2;
const residents=[
 {name:'散歩する女の子',kind:'person',x:-4.7,z:1.2,rx:2.0,rz:1.4,speed:.00022,phase:0,shirt:'#e99eaa',hair:'#77554a',style:0},
 {name:'緑帽子の少年',kind:'person',x:3.0,z:3.8,rx:2.4,rz:1.7,speed:.00024,phase:1.7,shirt:'#72aa77',hair:'#664c37',style:1},
 {name:'青い服の女性',kind:'person',x:6.4,z:2.5,rx:1.7,rz:1.5,speed:.00016,phase:2.9,shirt:'#8faacb',hair:'#493b37',style:2},
 {name:'釣り人',kind:'person',x:-6.8,z:7.0,rx:1.3,rz:.7,speed:.00010,phase:1.0,shirt:'#7aabc4',hair:'#674b3b',style:1},
 {name:'工事スタッフ',kind:'person',x:8.1,z:-1.1,rx:1.0,rz:1.5,speed:.00015,phase:2.2,shirt:'#f3b74b',hair:'#674a37',style:3},
 {name:'花を眺める人',kind:'person',x:-2.5,z:5.1,rx:1.8,rz:1.0,speed:.00013,phase:3.6,shirt:'#b18ac4',hair:'#8a6047',style:2},
 {name:'買い物客',kind:'person',x:4.1,z:-3.1,rx:2.1,rz:1.2,speed:.00019,phase:4.3,shirt:'#d9a57b',hair:'#5b4c43',style:0},
 {name:'モコモコ',kind:'monster',variant:'cloud',x:-2.3,z:2.8,rx:1.5,rz:.9,speed:.00028,phase:2.1},
 {name:'わかばっこ',kind:'monster',variant:'leaf',x:2.0,z:5.5,rx:1.1,rz:.8,speed:.00026,phase:1.1},
 {name:'パンダ',kind:'animal',variant:'panda',x:-5.1,z:4.0,rx:1.6,rz:1.0,speed:.00015,phase:1.2},
 {name:'犬',kind:'animal',variant:'dog',x:4.7,z:6.0,rx:2.2,rz:1.2,speed:.00036,phase:2.7},
 {name:'レッサーパンダ',kind:'animal',variant:'redpanda',x:-.2,z:7.3,rx:1.5,rz:.9,speed:.00020,phase:4.2}
];
const ground=(b,x,z)=>b.sphere(x,.025,z,.38,.025,.28,'#82b876',5,7);
function person(b,a,t,walking){
 const step=Math.sin(t*11)*.23*(walking?1:0.13),swing=Math.sin(t*11)*.19*(walking?1:.12);
 const skin='#f6d9bb',pants='#9aa7a3';
 b.sphere(0,1.64,0,.39,.43,.36,skin,6,9);
 b.sphere(0,1.91,-.045,.42,.22,.38,a.hair,5,8);
 if(a.style===1||a.style===3){b.cylinder(0,2.08,-.04,.46,.16,9,a.style===3?'#e8b947':'#609a65');b.box(0,2.02,.26,.68,.06,.30,a.style===3?'#dca73d':'#508756')}
 if(a.style===2){b.sphere(-.38,1.62,-.02,.17,.28,.20,a.hair,5,7);b.sphere(.38,1.62,-.02,.17,.28,.20,a.hair,5,7)}
 for(const side of [-1,1]){
  b.sphere(side*.16,1.68,.33,.044,.055,.027,'#353d3b',4,5);
  b.box(side*.20,.33,step*side*.25,.21,.52,.24,pants);
  b.sphere(side*.20,.09,.12+step*side*.65,.18,.12,.25,'#f0eee3',4,6);
  b.sphere(side*.49,.99,-swing*side,.15,.31,.17,skin,5,7);
 }
 b.sphere(0,1.05,0,.44,.57,.32,a.shirt,6,9);
 b.sphere(0,1.54,.35,.075,.055,.025,'#d68f85',4,5);
 if(a.style===3)b.box(0,1.05,.30,.53,.12,.06,'#fff4d2');
}
function panda(b,t){
 const foot=Math.sin(t*12)*.15;
 b.sphere(0,.67,0,.67,.52,.50,'#f5f5e9',7,10);
 b.sphere(0,1.16,.25,.51,.48,.47,'#f8f8ef',7,9);
 for(const s of [-1,1]){
  b.sphere(s*.38,1.48,.12,.20,.22,.20,'#323a39',5,7);
  b.sphere(s*.23,1.20,.66,.16,.20,.07,'#303638',5,7);
  b.sphere(s*.23,1.22,.72,.055,.07,.03,'#f8f9ef',4,5);
  b.sphere(s*.23,1.22,.748,.027,.038,.015,'#242b2b',4,5);
  for(const zz of [-.31,.33])b.sphere(s*.40,.27,zz+foot*s*(zz>0?1:-1),.23,.27,.22,'#333938',5,7);
 }
 b.sphere(0,1.01,.74,.14,.11,.09,'#313637',5,6);
}
function dog(b,t){
 const leg=Math.sin(t*14)*.22;
 b.sphere(0,.62,0,.60,.42,.32,'#d79555',6,9);
 b.sphere(0,1.01,.31,.35,.39,.32,'#e4a866',6,9);
 b.sphere(0,1.09,.51,.36,.34,.31,'#e8b375',6,9);
 b.sphere(0,.96,.81,.23,.18,.19,'#f8e5c8',5,7);
 for(const s of [-1,1]){
  b.sphere(s*.32,1.27,.42,.16,.31,.14,'#a46b3f',5,7);
  b.sphere(s*.17,1.12,.79,.055,.064,.028,'#3d3834',4,5);
  for(const z of [-.27,.33])b.sphere(s*.38,.26,z+s*leg*(z>0?1:-1),.16,.26,.16,'#c88a51',5,6);
 }
 b.sphere(0,1.0,.97,.09,.07,.06,'#353535',4,5);
 const wag=Math.sin(t*17)*.35;
 b.cylinder(wag,.93,-.67,.12,.48,6,'#d79555');
}
function redPanda(b,t){
 const wag=Math.sin(t*7)*.21;
 b.sphere(0,.61,0,.61,.40,.36,'#bb623b',6,9);
 b.sphere(0,1.06,.31,.40,.39,.34,'#c66b40',6,9);
 b.sphere(0,1.14,.48,.43,.35,.34,'#d67a4b',6,9);
 b.sphere(0,1.03,.76,.27,.20,.13,'#f8e2bb',5,7);
 for(const s of [-1,1]){
  b.sphere(s*.32,1.43,.34,.17,.22,.16,'#b85f3e',5,6);
  b.sphere(s*.32,1.43,.46,.09,.12,.05,'#f9e9cf',4,5);
  b.sphere(s*.21,1.18,.76,.11,.13,.055,'#f4ead6',4,5);
  b.sphere(s*.21,1.18,.81,.038,.048,.024,'#333431',4,5);
  for(const z of [-.28,.28])b.sphere(s*.35,.25,z+.12*Math.sin(t*12+s+z),.15,.24,.16,'#44382f',5,6);
 }
 b.sphere(0,1.02,.89,.085,.06,.05,'#44382f',4,5);
 for(let i=0;i<5;i++)b.sphere(wag*(i+1)/5,.75+Math.sin(i*.65)*.08,-.55-i*.23,.24-i*.019,.20-i*.014,.25,i%2?'#f4c68d':'#b85c3a',5,7);
}
function monster(b,a,t){
 const leaf=a.variant==='leaf',base=leaf?'#9ecb72':'#a2d8eb',dark=leaf?'#6da55e':'#7fb4d1';
 b.sphere(0,.69,0,.54,.55,.48,base,7,9);
 b.sphere(0,1.05,.18,.48,.47,.44,base,7,9);
 for(const s of [-1,1]){
  b.sphere(s*.22,1.05,.56,.07,.09,.04,'#364d4a',4,5);
  b.sphere(s*.41,.44,.12,.20,.22,.24,dark,5,7);
  b.sphere(s*.34,1.45,.05,.21,.27,.17,leaf?'#77b76a':'#b9e8f5',5,7);
 }
 b.sphere(0,.89,.62,.09,.07,.04,'#e4a39c',4,5);
 if(leaf){b.cylinder(0,1.66,0,.07,.30,5,'#689d56');b.sphere(.19,1.78,0,.27,.09,.15,'#76b968',5,7)}
 else b.sphere(0,1.66,-.07,.25,.19,.24,'#e8f8fb',5,7);
}
// Independent, spatially separated destinations. Each resident pauses at landmarks
// instead of circling a common centre. No randomness per frame: motion is smooth.
const paths=[
 [[-8.7,1.2],[-7.9,2.4],[-6.9,1.7],[-8.3,.5]],
 [[1.8,2.5],[3.5,2.0],[4.1,3.1],[2.7,4.0]],
 [[7.4,3.6],[8.9,3.1],[9.2,4.8],[7.7,5.0]],
 [[-8.0,7.5],[-7.5,8.2],[-6.7,8.0]],
 [[9.6,-1.2],[10.1,-.4],[9.8,.2]],
 [[-3.5,7.0],[-2.4,7.6],[-1.6,6.8],[-2.8,6.1]],
 [[2.8,-6.9],[4.2,-7.1],[4.7,-5.9],[3.3,-5.5]],
 [[-10.2,4.7],[-9.3,5.4],[-9.8,6.2]],
 [[5.8,8.3],[6.9,8.7],[7.3,7.6]],
 [[-10.6,-3.4],[-9.4,-2.7],[-9.8,-1.5]],
 [[8.1,7.0],[9.6,7.5],[10.1,6.1],[8.7,5.7]],
 [[-5.2,-7.7],[-4.1,-8.4],[-3.4,-7.3]]
];
const pause=[2.8,1.2,2.4,8,5,6,3,2.1,3.5,7,1.1,4.5];
const pace=[.8,1.1,.65,.4,.55,.35,.95,1.0,.85,.32,1.8,.7];
const phases=[0,5.1,12.4,3.3,9.2,18.1,7.6,14.2,2.4,8.1,11.2,6.3];
function pose(a,now){
 const index=residents.indexOf(a);
 if(index<0)return {x:a.x,z:a.z,yaw:0,t:now*.001,walking:false};
 const route=paths[index],speed=pace[index],stop=pause[index];
 let total=0;const segments=[];
 for(let i=0;i<route.length;i++){
  const from=route[i],to=route[(i+1)%route.length];
  const d=Math.hypot(to[0]-from[0],to[1]-from[1]);
  const travel=d/speed;
  segments.push({from,to,travel,start:total});
  total+=travel+stop;
 }
 let time=((now*.001+phases[index])%total+total)%total;
 let segment=segments[segments.length-1];
 for(const item of segments)if(time<item.start+item.travel+stop){segment=item;break}
 const elapsed=time-segment.start;
 const walking=elapsed<segment.travel;
 const u=walking?Math.max(0,Math.min(1,elapsed/segment.travel)):1;
 const eased=u*u*(3-2*u);
 const x=segment.from[0]+(segment.to[0]-segment.from[0])*eased;
 const z=segment.from[1]+(segment.to[1]-segment.from[1])*eased;
 const yaw=Math.atan2(segment.to[0]-segment.from[0],segment.to[1]-segment.from[1]);
 return {x,z,yaw,t:now*.001+phases[index],walking};
}
function drawDynamic(b,now){
 for(const a of residents){
  const p=pose(a,now),bob=p.walking?Math.abs(Math.sin(p.t*6))*(a.kind==='monster'?.12:.045):a.kind==='monster'?.035*Math.sin(p.t*2):0;
  ground(b,p.x,p.z);
  b.setTransform(p.x,bob,p.z,p.yaw);
  if(a.kind==='person')person(b,a,p.t,p.walking);
  else if(a.kind==='monster')monster(b,a,p.t);
  else if(a.variant==='panda')panda(b,p.t);
  else if(a.variant==='dog')dog(b,p.t);
  else redPanda(b,p.t);
  b.clearTransform();
 }
}
window.KomorebiIslandLife={residents,pose,drawDynamic};
})();