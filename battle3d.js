/* こもれび島 3D - experimental original creature battle.
   All creatures, meshes and gameplay are original; no third-party game assets. */
(()=>{
'use strict';
const marker={id:'battleArena',x:-.7,z:10.2,r:2.65,icon:'⚔️',name:'島のバトル広場'};
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const define=()=>({
 active:true,phase:'command',turn:0,activeIndex:0,kit:1,result:null,
 team:[
  {id:'pirimo',name:'ピリモ',type:'spark',icon:'⚡',level:16,hp:48,maxHp:48},
  {id:'lumino',name:'ルミノ',type:'wind',icon:'🌬️',level:15,hp:42,maxHp:42}
 ],
 foe:{id:'haruriza',name:'ハルリザ',type:'leaf',icon:'🍃',level:15,hp:52,maxHp:52},
 log:'🌿 森の対戦相手が現れた！ 好きな技を選んでね。',
 effect:null
});
const moves=[
 {id:'thunder',name:'⚡ ひかりスパーク',type:'spark',power:15,detail:'草に強い・命中100%'},
 {id:'quick',name:'💨 ひらりアタック',type:'normal',power:10,detail:'すばやい一撃'},
 {id:'burst',name:'🌟 きらめきボール',type:'spark',power:12,detail:'光の力で攻撃'},
 {id:'rest',name:'💚 ひとやすみ',type:'heal',power:13,detail:'HPを13回復'}
];
const alive = p=>Math.max(0,p.hp)>0;
const unit=(s)=>s.team[s.activeIndex];
function damage(power,type,foeType,rand){
 const base=power+Math.floor(clamp(Number(rand?.()??.5),0,.9999)*4);
 const multiplier=type==='spark'&&foeType==='leaf'?1.35:type==='leaf'&&foeType==='spark'?.78:1;
 return Math.max(1,Math.round(base*multiplier));
}
function enemyReply(s,rand=()=>.5){
 if(!alive(s.foe))return;
 const hero=unit(s),leaf= s.turn%3===1;
 const n=damage(leaf?9:8,leaf?'leaf':'normal',hero.type,rand);
 hero.hp=Math.max(0,hero.hp-n);
 s.log+='　'+s.foe.name+'の '+(leaf?'はっぱカッター':'たいあたり')+'！ '+hero.name+'に'+n+'ダメージ！';
 s.effect={type:'leaf',target:'hero',at:0};
 if(!alive(hero)){
  const reserve=s.team.findIndex((p,i)=>i!==s.activeIndex&&alive(p));
  if(reserve>=0){s.activeIndex=reserve;s.log+='　'+unit(s).name+'が応援に駆けつけた！';}
  else{s.phase='end';s.result='lose';s.log+='　おしい！ また挑戦しよう。';}
 }
}
function move(s,id,rand=()=>.5){
 if(!s||s.phase!=='command')return false;
 const m=moves.find(x=>x.id===id);if(!m)return false;
 const hero=unit(s);s.turn++;
 if(m.type==='heal'){
  const before=hero.hp;hero.hp=Math.min(hero.maxHp,hero.hp+m.power);
  s.log=hero.name+'は休んでHPを'+(hero.hp-before)+'回復した！';
  s.effect={type:'heal',target:'hero',at:0};
 }else{
  const n=damage(m.power,m.type,s.foe.type,rand);
  s.foe.hp=Math.max(0,s.foe.hp-n);
  s.log=hero.name+'の '+m.name.replace(/^[^ ]+ /,'')+'！ '+s.foe.name+'に'+n+'ダメージ！';
  if(m.type==='spark'&&s.foe.type==='leaf')s.log+=' 効果ばつぐん！';
  s.effect={type:m.type,target:'foe',at:0};
 }
 if(!alive(s.foe)){s.result='win';s.phase='end';s.log+='　🏆 '+hero.name+'の勝利！';return true;}
 enemyReply(s,rand);
 s.effect={type:m.type,target:m.type==='heal'?'hero':'foe',at:0};
 return true;
}
function switchFriend(s){
 if(!s||s.phase!=='command')return false;
 const next=s.team.findIndex((p,i)=>i!==s.activeIndex&&alive(p));
 if(next<0){s.log='いま交代できる仲間はいないよ。';return false;}
 s.activeIndex=next;s.turn++;s.log='🌬️ '+unit(s).name+'に交代した！';
 enemyReply(s);return true;
}
function item(s){
 if(!s||s.phase!=='command'||s.kit<=0)return false;
 const hero=unit(s);s.kit--;s.turn++;
 const healed=Math.min(18,hero.maxHp-hero.hp);
 hero.hp+=healed;s.log='🧰 きずぐすりで '+hero.name+'のHPが'+healed+'回復！';
 enemyReply(s);s.effect={type:'heal',target:'hero',at:0};return true;
}
function flee(s){
 if(!s||s.phase!=='command')return false;
 s.phase='end';s.result='flee';s.log='🏃 バトルをやめて島の散策に戻ろう。';return true;
}
function elementTree(b,x,z,h,type){
 b.cylinder(x,.64,z,.17,1.26,6,'#926e52');
 if(type==='pine'){b.cylinder(x,1.8,z,.72,1.45,6,'#4a9b80',0);b.cylinder(x,2.5,z,.48,1.1,6,'#74bf8e',0);}
 else {b.sphere(x,1.85,z,.90,.81,.84,'#78ba84',5,8);b.sphere(x+.28,2.04,z-.2,.50,.48,.49,'#9ad49a',5,7);}
}
function drawStatic(b){
 const {x,z}=marker;
 b.ellipseDisc(x,.066,z,4.15,3.0,'#e8d6aa',30);
 b.ellipseDisc(x,.077,z,3.84,2.72,'#e0bd94',30);
 b.ellipseDisc(x,.086,z,3.35,2.28,'#efdbb9',30);
 for(let i=0;i<18;i++){
  const t=i*2*Math.PI/18;
  b.sphere(x+4.10*Math.cos(t),.16,z+3.0*Math.sin(t),.12,.10,.13,'#fff0cd',4,5);
 }
 // A set of small spectator bleachers and a friendly scoreboard.
 for(const xx of[x-4.38,x+4.35]){
  b.box(xx,.38,z-.95,.52,.55,2.5,'#d8c6a4');
  b.box(xx,.75,z-.95,.58,.18,2.5,'#bda47d');
 }
 b.box(x,1.28,z-3.15,2.55,1.0,.14,'#e8d4ae');
 b.box(x,1.29,z-3.02,2.22,.74,.07,'#7eada2');
 for(const off of[-1.02,1.02])b.cylinder(x+off,.73,z-3.14,.09,1.28,6,'#ab8b66');
 for(const [xx,zz] of [[x-5.15,z+2.6],[x+5.25,z+2.5],[x-5.2,z-2.7]])elementTree(b,xx,zz,1,'broad');
 // Small painted lines mark the centre and approach path.
 b.box(x,.092,z,1.2,.017,.085,'#fff5e3');
 b.box(x,.092,z,.085,.017,1.12,'#fff5e3');
}
function drawBattleScene(b){
 // Dedicated scenic arena while fighting: the 3D village is deliberately omitted.
 // This avoids the foreground of the island hiding creatures on portrait phones.
 const x=marker.x,z=marker.z;
 b.ellipseDisc(x,-.23,z,14.3,10.5,'#e8d4a5',48);
 b.ellipseDisc(x,-.16,z,13.9,10.1,'#8fcf9c',48);
 b.ellipseDisc(x,-.10,z,10.25,6.0,'#a5d59b',40);
 b.ellipseDisc(x,-.08,z,5.15,3.33,'#dfbd93',38);
 drawStatic(b);
 // Two raised circular platforms keep combatants easy to locate.
 for(const xx of[x-1.88,x+1.85]){
  b.cylinder(xx,.07,z+.40,1.47,.26,20,'#b4c5a0');
  b.ellipseDisc(xx,.212,z+.40,1.35,1.12,'#eee6c8',28);
  b.ellipseDisc(xx,.219,z+.40,1.17,.96,'#d1e9c7',28);
 }
 // Festival lanterns and spectators on the far side, clear of the combatants.
 for(const xx of[x-7.5,x+7.5]){
  for(const zz of[z-4.7,z+3.4]){
   b.cylinder(xx,1.65,zz,.12,3.30,6,'#927e68');
   b.sphere(xx,3.38,zz,.36,.43,.36,'#fff0b4',6,8);
   b.cylinder(xx,3.82,zz,.18,.16,6,'#eecb83');
  }
 }
 for(let i=0;i<8;i++){
  const xx=x-4.0+i*1.17,zz=z-5.55;
  b.cylinder(xx,.66,zz,.24,.74,6,['#bba6d4','#87b8cb','#f0bc85','#91bf9f'][i%4]);
  b.sphere(xx,1.28,zz,.28,.29,.27,'#f4ddbd',5,7);
  b.sphere(xx,1.53,zz,.31,.13,.29,['#87695d','#b29274','#d0a568'][i%3],5,7);
 }
 for(let i=0;i<30;i++){
  const xx=x-9.8+(i*1.73)%19.6,zz=z-8.9+(i*3.31)%14.7;
  if(Math.abs(xx-x)<4.7&&Math.abs(zz-z)<3.3)continue;
  b.sphere(xx,.19,zz,.14,.12,.13,['#fce8a2','#eac4e2','#fff4e4'][i%3],4,5);
 }
}
function sphere(b,x,y,z,s,c,lat=5,lon=8){b.sphere(x,y,z,s,s*.88,s,c,lat,lon);}
function sparky(b,x,y,z,now){
 // A golden hedgehog / otter-like spark spirit, with starry quills and antenna,
 // distinct from existing copyrighted game character silhouettes.
 const bob=Math.sin(now*.0034)*.075;
 b.sphere(x,y+.78+bob,z,.78,.75,.69,'#f7ce60',7,10);
 b.sphere(x,y+.52+bob,z+.49,.48,.38,.27,'#ffedb1',5,8);
 for(const dir of[-1,1]){
  b.sphere(x+dir*.55,y+.24+bob,z+.3,.27,.19,.3,'#dba54e',5,7);
  b.sphere(x+dir*.38,y+1.04+bob,z+.55,.087,.10,.06,'#383d43',5,7);
  b.sphere(x+dir*.27,y+.76+bob,z+.645,.13,.08,.05,'#e8a972',4,7);
 }
 b.sphere(x,y+.70+bob,z+.74,.11,.08,.08,'#b98247',4,6);
 for(const dx of[-.50,0,.50]){
  b.tri([x+dx-.23,y+1.22+bob,z-.29],[x+dx,y+1.94+bob,z-.08],[x+dx+.23,y+1.22+bob,z-.29],'#fce07a');
  b.tri([x+dx-.23,y+1.22+bob,z-.29],[x+dx,y+1.94+bob,z-.08],[x+dx+.23,y+1.22+bob,z-.29],'#f1b74d');
 }
 b.cylinder(x,.87+bob,z-.71,.20,1.15,6,'#eec05a',.10);
 b.sphere(x,.3+bob,z+.24,.20,.15,.22,'#f4cd73',4,6);
}
function leafling(b,x,y,z,now){
 const bob=Math.sin(now*.0029+1.4)*.065;
 b.sphere(x,y+.80+bob,z,.89,.64,.93,'#5dc3b3',7,10);
 b.sphere(x,y+1.25+bob,z+.48,.49,.45,.50,'#6dd2bc',6,9);
 for(const dir of[-1,1]){
  b.sphere(x+dir*.63,y+.26+bob,z+.48,.36,.25,.44,'#419e91',5,7);
  b.sphere(x+dir*.26,y+1.36+bob,z+.90,.09,.12,.09,'#335d60',5,7);
  b.tri([x+dir*.23,y+1.67+bob,z-.12],[x+dir*.69,y+2.45+bob,z-.27],[x+dir*.15,y+2.07+bob,z+.44],'#7ac770');
 }
 for(const k of[-1,0,1]){
  b.tri([x+k*.38-.31,y+1.44+bob,z-.40],[x+k*.39,y+2.60+bob,z-.48],[x+k*.38+.32,y+1.42+bob,z-.44],'#66bd6a');
 }
 b.sphere(x,y+1.07+bob,z+1.02,.15,.09,.10,'#b0e9d6',4,6);
}
function cloudling(b,x,y,z,now){
 const bob=Math.sin(now*.003)*.1;
 b.sphere(x,y+.86+bob,z,.72,.57,.69,'#a8d5f7',6,9);
 for(const k of[-1,0,1])b.sphere(x+k*.41,y+1.04+bob,z-.12,.37,.34,.4,'#e4f4ff',5,7);
 b.sphere(x-.21,y+1.02+bob,z+.53,.10,.13,.06,'#5c7194',4,6);
 b.sphere(x+.21,y+1.02+bob,z+.53,.10,.13,.06,'#5c7194',4,6);
 for(const dir of[-1,1])b.sphere(x+dir*.78,y+.59+bob,z,.40,.19,.22,'#c9e8f9',4,6);
}
function trainer(b,now){
 const x=marker.x+3.6,z=marker.z-1.3;
 b.sphere(x,1.75,z,.34,.41,.32,'#f1d0b0',5,7);
 b.sphere(x,2.02,z,.39,.21,.39,'#846d63',5,7);
 b.sphere(x,.97,z,.48,.65,.37,'#e3a2bb',5,7);
 b.cylinder(x-.18,.31,z,.12,.62,6,'#647c85');
 b.cylinder(x+.18,.31,z,.12,.62,6,'#647c85');
 b.sphere(x-.28,1.43,z+.09,.15,.27,.12,'#f3dab8',4,6);
 b.sphere(x+.30,1.45+Math.sin(now*.004)*.06,z+.1,.15,.26,.12,'#f3dab8',4,6);
 b.box(x,2.21,z,.81,.14,.73,'#f9c481');
}
function fx(b,s,now){
 const e=s?.effect;if(!e)return;
 const elapsed=now-e.at;if(elapsed<0||elapsed>1000)return;
 const t=elapsed/1000,f=1-t;
 const target=e.target==='foe'?{x:marker.x+1.85,z:marker.z+.24}:{x:marker.x-1.82,z:marker.z+.35};
 const col=e.type==='leaf'?'#87d26e':e.type==='heal'?'#a4eabd':'#ffe17d';
 for(let i=0;i<20;i++){
  const theta=i*2.39996+Math.sin(t*4),radius=f*(.2+(i%7)*.30);
  const yy=.55+(i%5)*.21+(t*1.8);
  const px=target.x+Math.cos(theta)*radius,pz=target.z+Math.sin(theta)*radius;
  b.sphere(px,yy,pz,.065+.05*f,.075+.06*f,.06,col,4,5);
 }
}
const lerp=(a,b,t)=>a+(b-a)*t;
function ribbon(b,ax,ay,az,bx,by,bz,w,col){
 const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1,nx=-dy/len*w,ny=dx/len*w;
 b.quad([ax+nx,ay+ny,az],[bx+nx,by+ny,bz],[bx-nx,by-ny,bz],[ax-nx,ay-ny,az],col);
}
function combatPose(s,now){
 const seq=s?.cinematic;
 if(!seq)return {heroX:0,heroY:0,foeX:0,foeY:0,t:1,id:null};
 const t=clamp((now-seq.at)/seq.duration,0,1),id=seq.id;
 const attack= !['item','rest','friend'].includes(id);
 const lunge=attack&&t>.16&&t<.54?Math.sin(Math.PI*clamp((t-.16)/.38)):0;
 const hit=attack&&t>.51&&t<.72?Math.sin(Math.PI*clamp((t-.51)/.21)):0;
 const reply=attack&&t>.74&&t<.94?Math.sin(Math.PI*clamp((t-.74)/.20)):0;
 return {id,t,heroX:.45*lunge-.13*reply*Math.sin(t*150),heroY:.46*lunge+.23*reply,
  foeX:.23*hit*Math.sin(t*150)-.26*reply,foeY:.23*hit+.40*reply};
}
function drawSpell3D(b,now,s){
 const seq=s?.cinematic;if(!seq)return;
 const t=(now-seq.at)/seq.duration;if(t<0||t>1)return;
 const {x,z}=marker,hero={x:x-1.88,y:1.24,z:z+.57},foe={x:x+1.85,y:1.30,z:z+.37};
 const isHeal=['rest','item','friend'].includes(seq.id),yellow=seq.id==='thunder';
 const main=isHeal?'#a1f9bd':yellow?'#fff3a8':seq.id==='burst'?'#ffe9a5':'#c2f4ff';
 const glow=isHeal?'#74d89a':yellow?'#f3c953':seq.id==='burst'?'#f5c77b':'#95d8e9';
 if(isHeal){
  for(let i=0;i<3;i++){
   const rr=.48+(i%3)*.32+.18*Math.sin(t*9+i),a=t*5+i*2.094;
   b.sphere(hero.x+Math.cos(a)*rr,1.1+t*1.1,hero.z+Math.sin(a)*rr,.17,.19,.17,main,5,7);
  }
  for(let i=0;i<16;i++){
   const a=i*Math.PI*2/16+t*4,rr=1.0+.6*Math.sin(t*5+i);
   b.sphere(hero.x+rr*Math.cos(a),.4+(i%5)*.27+t*.7,hero.z+rr*Math.sin(a),.07,.10,.07,'#dfffea',4,5);
  }
  return;
 }
 if(t<.24){
  const p=t/.24,r=.7+p*.7;
  b.sphere(hero.x,hero.y+.06,hero.z,r,r*.73,r*.68,glow,7,10);
  for(let i=0;i<14;i++){
   const a=i*2.399+p*6;
   b.sphere(hero.x+Math.cos(a)*r,hero.y+Math.sin(a)*r,hero.z+.68,.08,.10,.08,main,4,5);
  }
 }else if(t<.51){
  const p=clamp((t-.24)/.27),xx=lerp(hero.x,foe.x,p),yy=hero.y+.16*Math.sin(p*12);
  for(let i=0;i<4;i++){
   const offset=(i-1.5)*.17;
   ribbon(b,hero.x,hero.y+offset,hero.z+.78,
     xx,yy+offset+Math.sin(p*19+i)*.18,foe.z+.87,.065,main);
  }
  b.sphere(xx,yy,foe.z+.82,.64,.61,.58,main,8,10);
  b.sphere(xx,yy,foe.z+1.20,.29,.26,.26,'#fffefa',6,8);
  for(let i=0;i<17;i++){
   const a=i*2.399+p*10,dist=.44+(i%4)*.20;
   b.sphere(xx+Math.cos(a)*dist,yy+Math.sin(a)*dist,foe.z+.9,.08,.08,.08,glow,4,5);
  }
 }else if(t<.73){
  const p=clamp((t-.51)/.22),strength=1-p,r=.4+1.5*p;
  for(let i=0;i<30;i++){
   const a=i*Math.PI*2/30,dist=r*(.85+(i%5)*.17);
   b.sphere(foe.x+Math.cos(a)*dist,foe.y+Math.sin(a)*dist,foe.z+.87,
     .11+.21*strength,.12+.2*strength,.12, i%4===0?'#ffffff':main,4,5);
  }
  b.sphere(foe.x,foe.y,foe.z+.9,.45+.9*strength,.43+.7*strength,.34+.5*strength,'#fff7d7',7,9);
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7+p*7;
   ribbon(b,foe.x,foe.y,foe.z+1.3,
      foe.x+Math.cos(a)*(1.2+2*p),foe.y+Math.sin(a)*(1.2+2*p),foe.z+1.31,.08,main);
  }
 }else if(t<.93){
  const p=clamp((t-.73)/.20),xx=lerp(foe.x,hero.x,p);
  b.sphere(xx,1.3+.30*Math.sin(p*9),foe.z+.8,.46,.33,.36,'#75e5ac',7,8);
  for(let i=0;i<17;i++){
   const a=i*2.399+p*10,r=.52+(i%4)*.26;
   b.tri([xx+Math.cos(a)*r,1.3+Math.sin(a)*r,foe.z+1],
    [xx+Math.cos(a+.3)*(r+.38),1.35+Math.sin(a+.3)*(r+.38),foe.z+.92],
    [xx+Math.cos(a+.45)*r,1.0+Math.sin(a+.45)*r,foe.z+1.03],'#9df0a3');
  }
 }
}

function drawDynamic(b,now,session){
 // Characters can be seen sparring when the player walks by;
 // turns and damage only begin when the battle overlay is activated.
 const y=0,p=combatPose(session,now);
 const id=session?.active?session.team[session.activeIndex].id:'pirimo';
 if(id==='lumino')cloudling(b,marker.x-1.88+p.heroX,y+p.heroY,marker.z+.55,now);
 else sparky(b,marker.x-1.88+p.heroX,y+p.heroY,marker.z+.55,now);
 leafling(b,marker.x+1.85+p.foeX,y+p.foeY,marker.z+.27,now);
 trainer(b,now);
 drawSpell3D(b,now,session);
 if(!session?.cinematic)fx(b,session,now);
}
function camera(session,now=0){
 // Fixed portrait stage, subtle reactive shake on impact (not a full-screen strobe).
 const fx=session?.cinematic,t=fx?clamp((now-fx.at)/fx.duration,0,1):1;
 const hit=t>.51&&t<.66?.13*Math.sin(t*160):0;
 const counter=t>.85&&t<.91?.07*Math.sin(t*100):0;
 return {eye:[marker.x+.12+hit+counter,8.0,marker.z+13.4],
  center:[marker.x+hit*.7,-2.0,marker.z+.20],
  fov:t>.48&&t<.70?44:46};
}
window.KomorebiBattle={marker,moves,create:define,move,switchFriend,item,flee,drawStatic,drawBattleScene,drawDynamic,camera,damage};
})();