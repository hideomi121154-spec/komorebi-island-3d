/* Moko is an original, friendly island creature made entirely from procedural geometry.
   No character art, textures or sounds from any existing work are used. */
(() => {
'use strict';
const waypoints=[
 {x:-3.2,z:-1.4},{x:-2.3,z:-.9},{x:-1.45,z:.35},
 {x:-2.2,z:1.25},{x:-3.5,z:.65},{x:-3.15,z:-.45}
];
const NIGHT_SPOT={x:-3.15,z:-1.4};
const SEGMENT_MS=6600,WALK_MS=4400;
function poseAt(timeMs,period='day',held=null){
 if(held)return {...held,moving:false,bob:.025*Math.sin(timeMs*.003)};
 const now=Math.max(0,Number.isFinite(timeMs)?timeMs:0);
 if(period==='night'){
  return {x:NIGHT_SPOT.x,z:NIGHT_SPOT.z,yaw:.12*Math.sin(now*.00037),
   bob:.016*Math.sin(now*.0022),moving:false,sleepy:true};
 }
 const idx=Math.floor(now/SEGMENT_MS)%waypoints.length;
 const frac=(now%SEGMENT_MS)/WALK_MS;
 const from=waypoints[idx],to=waypoints[(idx+1)%waypoints.length];
 const f=Math.max(0,Math.min(1,frac));
 const eased=f*f*(3-2*f);
 const moving=frac<1;
 return {x:from.x+(to.x-from.x)*eased,z:from.z+(to.z-from.z)*eased,
  yaw:Math.atan2(to.x-from.x,to.z-from.z),
  bob:moving?.055*Math.abs(Math.sin(now*.011)):.015*Math.sin(now*.003),
  moving,sleepy:false};
}
const dialogue={
 morning:'おはよう…。あさのかぜ、ふわふわするね。',
 day:'きょうの島、きもちいいね。木の実をみつけたよ。',
 evening:'ゆうやけ、わたあめみたい…。きれいだね。',
 night:'ふあぁ…。おほしさまが、きらきらしてる…。'
};
const extraDialogue=[
 'ぼくは木の実がすき。あまいにおいがするから。',
 'この島には、まだ知らないすてきな場所があるんだって。',
 'そっと歩くと、草の音が聞こえるよ。'
];
function talk(phase='day',gift=false,conversation=0){
 const line=conversation>0?extraDialogue[(conversation-1)%extraDialogue.length]:(dialogue[phase]||dialogue.day);
 return line+(gift?' はい、木の実をひとつどうぞ！':'');
}
function draw(b,pose,lookToward=null,now=0){
 if(!pose)return;
 const facing=lookToward==null?pose.yaw:lookToward;
 b.setTransform(pose.x,pose.bob,pose.z,facing);
 // Tiny boots under a light, rounded body. A single leaf sprout is Moko's signature.
 for(const side of[-1,1]){
  const leg=pose.moving?Math.sin(now*.012+side*1.7)*.075:0;
  b.sphere(side*.24,.15+Math.max(0,leg),.08,.23,.16,.25,'#97b9a0',5,7);
 }
 b.sphere(0,.63,0,.47,.48,.44,'#f3e9d9',7,10);
 b.sphere(0,1.18,.06,.60,.57,.54,'#fff5e9',8,12);
 // Soft asymmetrical fluffy tufts, distinct from animal ears.
 b.sphere(-.46,1.42,-.10,.24,.23,.22,'#fff7ed',5,8);
 b.sphere(.46,1.36,-.07,.20,.23,.20,'#f8ebdf',5,8);
 for(const side of[-1,1]){
  b.sphere(side*.48,.69,.18,.19,.27,.22,'#f3e8d8',5,7);
  b.sphere(side*.22,1.22,.559,.057,.074,.027,'#534f4c',5,7);
  b.sphere(side*.39,1.07,.525,.14,.075,.034,'#ecbdb1',4,7);
 }
 if(pose.sleepy){
  for(const side of[-1,1])b.box(side*.22,1.22,.589,.16,.022,.022,'#655b55');
 }
 b.sphere(0,1.08,.608,.055,.038,.026,'#a17c71',4,6);
 b.sphere(0,.38,.40,.25,.20,.12,'#c7dcc3',5,7);
 // Leaf antenna and a woven sage-colored cross-body bag.
 b.cylinder(0,1.79,-.055,.055,.30,6,'#739b73');
 b.sphere(-.18,1.94,-.03,.24,.085,.12,'#78b78a',5,8);
 b.sphere(.17,2.01,-.035,.22,.075,.11,'#91c79a',5,8);
 b.box(.36,.66,.12,.06,.54,.10,'#9cac86');
 b.sphere(.38,.47,.28,.22,.24,.16,'#83ac8d',5,8);
 b.sphere(.41,.48,.43,.075,.07,.025,'#e8cb93',4,6);
 b.clearTransform();
}
window.KomorebiMoko={poseAt,draw,talk,waypoints,nightSpot:NIGHT_SPOT};
})();