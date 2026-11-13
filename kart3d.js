/* こもれび島3D kart circuit — dependency-free 8-kart racing on the same island scene. */
(()=>{
'use strict';
const E=window.KomorebiExpansion;
if(!E) throw Error('kart3d.js requires expansion3d.js');
const CENTER={x:24,z:12},LAND={x:44,z:58,rx:25,rz:21},WIDTH=4.55,AI_COUNT=7,LAPS=3;
// 島全体の海岸線を走る壮大な外周ルート。海上は橋で横断する。
const WAYPOINTS=[[30,57],[17,43],[-5,38],[-27,35],[-40,19],[-41,-5],[-31,-28],[-7,-34],[24,-28],[53,-25],[83,-14],[94,10],[89,32],[74,52],[55,65],[38,68]];
const COURSE_BOUNDS={minX:-48,maxX:101,minZ:-41,maxZ:76};
const ITEM_TYPES=['turbo','bubble','seed','gust','star'];
const ITEM_ICONS={turbo:'⚡',bubble:'🫧',seed:'🌰',gust:'🍃',star:'🌟'};
const ITEM_NAMES={turbo:'ターボ',bubble:'バリア',seed:'木の実ショット',gust:'追い風',star:'スター'};
// Fictional event partners, unrelated to real companies or their trademarks.
const SPONSORS=[
 {code:'KOMO',name:'こもれびモーターズ',color:'#69afb0',accent:'#ffe6a8'},
 {code:'MINT',name:'ミントエナジー',color:'#79b88b',accent:'#f7edb7'},
 {code:'NOVA',name:'ノヴァテック',color:'#7d9abb',accent:'#f9d7cd'},
 {code:'WAVE',name:'ウェーブマリン',color:'#73b7ce',accent:'#e9ebd0'},
 {code:'SUN',name:'サンベーカリー',color:'#d8a267',accent:'#fff0bb'}
];
const VENUES=[
 {fraction:.02,side:1,brand:0},{fraction:.20,side:1,brand:1},
 {fraction:.38,side:-1,brand:2},{fraction:.56,side:-1,brand:3},
 {fraction:.75,side:1,brand:4},{fraction:.92,side:1,brand:0}
];
const FONT={
 A:['010','101','111','101','101'],E:['111','100','110','100','111'],
 I:['111','010','010','010','111'],K:['101','101','110','101','101'],
 M:['101','111','111','101','101'],N:['101','111','111','111','101'],
 O:['111','101','101','101','111'],S:['111','100','111','001','111'],
 T:['111','010','010','010','010'],U:['101','101','101','101','111'],
 V:['101','101','101','101','010'],W:['101','101','111','111','101']
};
function sponsorText(b,code,y,z,color,unit=.24){
 const w=(code.length*4-1)*unit;
 for(let i=0;i<code.length;i++)for(let row=0;row<5;row++)for(let col=0;col<3;col++){
  if(FONT[code[i]]?.[row]?.[col]==='1')
   b.box(-w/2+(i*4+col)*unit,y+(4-row)*unit,z,unit*.86,unit*.86,.10,color);
 }
}
function venuePosition(v){
 const p=at(v.fraction*length),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
 return {x:p.x+nx*v.side*(WIDTH+10),z:p.z+nz*v.side*(WIDTH+10),yaw:p.yaw,side:v.side};
}
function drawGrandstand(b,v,index){
 const p=venuePosition(v),sponsor=SPONSORS[v.brand];
 b.setTransform(p.x,0,p.z,p.yaw);
 // The grandstand is supported by a solid platform even over the sea.
 b.box(0,.45,0,7.5,.90,21,'#c7d5cf');
 b.box(0,1.10,0,7.9,.23,21,'#a1babd');
 for(let row=0;row<3;row++){
  const x=(row-1)*p.side*2.05,y=1.26+row*.55;
  b.box(x,y-.28,0,2.1,.50,19.5,row%2?'#d6e3de':'#a6c7cb');
  for(let seat=0;seat<8;seat++){
   const z=-8.1+seat*2.32+.24*(row%2),k=index*24+row*8+seat;
   const color=['#e5a8a3','#9fc8d3','#b6aad7','#efcb91','#a9cea7','#dcb4b4'][k%6];
   b.box(x,y+.35,z,.59,.68,.48,color);
   b.sphere(x,y+.84,z,.33,.32,.33,k%4?'#f1caaa':'#bd8d72',5,6);
   b.box(x,y+1.12,z,.66,.15,.56,k%3?'#7f9db4':'#f2d47b');
   b.box(x-.42,y+.68,z,.16,k%3===0?.63:.35,.17,'#eac8a7');
   b.box(x+.42,y+.68,z,.16,k%4===0?.62:.35,.17,'#eac8a7');
  }
 }
 // Canopy, floodlights, guardrails and sponsor-color flags.
 b.box(0,4.18,0,8.5,.30,22.0,'#f3e2bd');
 for(const z of[-9.5,0,9.5]){
  b.box(0,2.35,z,.18,3.4,.18,'#93b2b8');
  b.box(0,4.36,z,.90,.15,.65,'#fff0c6');
 }
 b.box(-p.side*3.9,1.55,0,.22,2.0,19,sponsor.color);
 for(let i=0;i<5;i++)b.box(-p.side*4.03,1.60,-8+i*4,.24,1.6,1.3,sponsor.accent);
 b.clearTransform();
 // Trackside advertisement faces the driving direction.
 const road=at(v.fraction*length),nx=Math.cos(road.yaw),nz=-Math.sin(road.yaw);
 b.setTransform(road.x-nx*v.side*(WIDTH+7),0,road.z-nz*v.side*(WIDTH+7),road.yaw);
 b.box(0,2.13,0,6.8,3.2,.30,sponsor.color);
 b.box(0,3.82,0,7.1,.23,.38,sponsor.accent);
 sponsorText(b,sponsor.code,1.72,-.23,'#fff8de',.30);
 for(const x of[-2.8,2.8])b.box(x,.5,0,.30,1.0,.35,'#8da8aa');
 b.clearTransform();
}
function sponsorBridge(b,fraction,id){
 const p=at(length*fraction),sponsor=SPONSORS[id];
 b.setTransform(p.x,0,p.z,p.yaw);
 for(const side of[-1,1]){
  b.box(side*(WIDTH+1.45),2.90,0,.32,5.80,.35,sponsor.color);
  b.box(side*(WIDTH+1.45),.28,0,.75,.44,.72,sponsor.accent);
 }
 b.box(0,5.56,0,WIDTH*2+3.4,1.88,.40,sponsor.color);
 b.box(0,4.60,-.24,WIDTH*2+3.4,.15,.32,sponsor.accent);
 sponsorText(b,sponsor.code,5.06,-.28,'#fff8df',.28);
 b.clearTransform();
}
function drawCheeringFlags(b,now){
 if(!race.active||!race.player)return;
 for(const venue of VENUES){
  const p=venuePosition(venue);
  if(Math.hypot(race.player.x-p.x,race.player.z-p.z)>50)continue;
  b.setTransform(p.x,0,p.z,p.yaw);
  for(let i=0;i<4;i++){
   const x=i%2?2.0:-2.0,z=-7.0+i*4.5,y=3.05+.24*Math.sin(now*.008+i*1.8);
   b.box(x,y-.65,z,.11,1.25,.11,'#f5f2df');
   b.box(x+.36,y,z,.70,.39,.10,SPONSORS[venue.brand].accent);
  }
  b.clearTransform();
 }
}

const COLORS=['#f8c65a','#ec7185','#70b8dc','#9f9ad9','#84c49a','#f3a76c','#69bec3','#d6bb77'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mod=(x,n)=>((x%n)+n)%n;
function spline(i,t) {
 const n=WAYPOINTS.length,a=WAYPOINTS[mod(i-1,n)],b=WAYPOINTS[mod(i,n)],c=WAYPOINTS[mod(i+1,n)],d=WAYPOINTS[mod(i+2,n)];
 return {x:.5*((2*b[0])+(-a[0]+c[0])*t+(2*a[0]-5*b[0]+4*c[0]-d[0])*t*t+(-a[0]+3*b[0]-3*c[0]+d[0])*t*t*t),
         z:.5*((2*b[1])+(-a[1]+c[1])*t+(2*a[1]-5*b[1]+4*c[1]-d[1])*t*t+(-a[1]+3*b[1]-3*c[1]+d[1])*t*t*t)};
}
const STEPS=320,points=[];
for(let i=0;i<STEPS;i++)points.push(spline(Math.floor(i/STEPS*WAYPOINTS.length),(i/STEPS*WAYPOINTS.length)%1));
const cumulative=[0];for(let i=0;i<STEPS;i++){const a=points[i],b=points[(i+1)%STEPS];cumulative.push(cumulative[i]+Math.hypot(b.x-a.x,b.z-a.z));}
const length=cumulative[STEPS],START=3;
const ITEM_DISTANCES=[.085,.19,.31,.43,.56,.69,.81,.92].map(t=>t*length);
const JUMP_DISTANCES=[.13,.48,.84].map(t=>t*length);
function at(distance){
 const d=mod(distance,length);let lo=0,hi=STEPS-1;
 while(lo<hi){const m=(lo+hi+1)>>1;if(cumulative[m]<=d)lo=m;else hi=m-1;}
 const i=lo,a=points[i],b=points[(i+1)%STEPS],t=(d-cumulative[i])/(cumulative[i+1]-cumulative[i]||1);
 const yaw=Math.atan2(b.x-a.x,b.z-a.z);
 return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,yaw};
}
function roadNearest(x,z){
 let best=Infinity,bestD=0;
 for(let i=0;i<STEPS;i++){
  const a=points[i],b=points[(i+1)%STEPS],dx=b.x-a.x,dz=b.z-a.z;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
  const px=a.x+dx*t,pz=a.z+dz*t,ds=(x-px)**2+(z-pz)**2;
  if(ds<best){best=ds;bestD=cumulative[i]+t*(cumulative[i+1]-cumulative[i]);}
 }
 return {distance:bestD,offset:Math.sqrt(best)};
}
function roadQuad(b,a,c,half,y,col){
 const dx=c.x-a.x,dz=c.z-a.z,m=Math.hypot(dx,dz)||1,nx=-dz/m*half,nz=dx/m*half;
 b.quad([a.x+nx,y,a.z+nz],[c.x+nx,y,c.z+nz],[c.x-nx,y,c.z-nz],[a.x-nx,y,a.z-nz],col);
}
const oldWalk=E.canWalk;
E.canWalk=(x,z)=>oldWalk(x,z)||((x-LAND.x)**2/(LAND.rx-.6)**2+(z-LAND.z)**2/(LAND.rz-.6)**2<1);
function drawTerrain(b){
 b.ellipseDisc(LAND.x,-.17,LAND.z,LAND.rx+1.2,LAND.rz+1.2,'#efdab2',48);
 b.ellipseDisc(LAND.x,-.041,LAND.z,LAND.rx,LAND.rz,'#9ccc91',48);
 // Ground route toward the industrial area, with an obvious visual link to the island.
 roadQuad(b,{x:36,z:43},{x:36,z:56},2.8,.045,'#d8c4a8');
  // Reinforced seawall bridge supports beneath the outer circuit.
  for(let i=0;i<STEPS;i+=12){
   const p=points[i];b.cylinder(p.x,-.19,p.z,.32,.74,6,'#a6c6c9');
   b.box(p.x,.02,p.z,1.5,.12,1.4,'#c2c8ba');
  }
 for(let i=0;i<STEPS;i++){
  const a=points[i],c=points[(i+1)%STEPS];
  roadQuad(b,a,c,WIDTH+.44,.09,i%8<4?'#f5e6be':'#e4d4ba');
  roadQuad(b,a,c,WIDTH,.105,i%28<14?'#596c78':'#536774');
 }
 // Alternating kerbs are readable on iPhone, but use the existing lightweight mesh builder.
 for(let i=0;i<STEPS;i+=4){
  const a=points[i],c=points[(i+4)%STEPS],dx=c.x-a.x,dz=c.z-a.z,m=Math.hypot(dx,dz)||1;
  for(const side of[-1,1]){
   const nx=-dz/m*side*(WIDTH+.18),nz=dx/m*side*(WIDTH+.18);
   roadQuad(b,{x:a.x+nx,z:a.z+nz},{x:c.x+nx,z:c.z+nz},.24,.121,(i/4)%2?'#f9f8ef':'#e46e62');
  }
 }
 // Low-poly reflective guardrails along the archipelago bridges.
  for(let i=0;i<STEPS;i+=10){
   const a=points[i],c=points[(i+7)%STEPS],dx=c.x-a.x,dz=c.z-a.z,d=Math.hypot(dx,dz)||1;
   for(const side of[-1,1]){
    const nx=-dz/d*side*(WIDTH+.77),nz=dx/d*side*(WIDTH+.77);
    roadQuad(b,{x:a.x+nx,z:a.z+nz},{x:c.x+nx,z:c.z+nz},.14,.38,'#d8f4ec');
   }
  }
  // Three elevated jump ramp surfaces spaced around the grand loop.
  for(const d of JUMP_DISTANCES){
   const p=at(d),ahead=at(d+2.6),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
   b.quad([p.x-nx*2.6,.15,p.z-nz*2.6],[p.x+nx*2.6,.15,p.z+nz*2.6],
    [ahead.x+nx*2.6,.78,ahead.z+nz*2.6],[ahead.x-nx*2.6,.78,ahead.z-nz*2.6],'#edb86a');
   b.box(p.x,.20,p.z,1.6,.035,.65,'#fff0bd');
  }
  for(const frac of[.16,.39,.63,.87]){
   const p=at(frac*length);
   b.setTransform(p.x,0,p.z,p.yaw);
   b.box(0,.145,0,3.5,.04,1.1,'#f7d271');
   b.clearTransform();
  }
  // Starting grid crosses the tangent, not the world's X axis.
 const st=at(START),nx=Math.cos(st.yaw),nz=-Math.sin(st.yaw);
 for(let j=0;j<8;j++){
  const side=j-3.5,c=side*.72;
  b.box(st.x+nx*c,.131,st.z+nz*c,.69,.018,.18,j%2?'#fcfaf1':'#202e36');
 }
}
function drawStatic(b){
  for(let i=0;i<VENUES.length;i++)drawGrandstand(b,VENUES[i],i);
  for(let i=0;i<5;i++)sponsorBridge(b,[.10,.30,.50,.70,.89][i],i);
 // Low grandstand, pits, lamp posts and arches stay away from the racing line.
 b.box(43,.42,76,17,.75,4.2,'#b7c9c6');
 b.box(43,1.25,77,17,1.1,1.75,'#d7dee1');
 b.box(43,2.18,77,17,.23,2.8,'#739bb6');
 for(let i=0;i<11;i++){const x=35+i*1.55;b.box(x,.72,75.6,1.2,.19,.55,i%2?'#ffe1a5':'#f3a49b');}
 b.box(44,1.12,80,10,2.2,2.2,'#f4e2c4');b.box(44,2.3,80,11,.3,2.6,'#9ec9b2');
 for(const x of[40.4,43,45.6,48])b.box(x,1.1,78.86,1.9,1.25,.09,'#84a9b4');
 for(const d of[START,START+length*.25,START+length*.50,START+length*.75]){
  const p=at(d),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
  for(const side of[-1,1]){const x=p.x+nx*side*(WIDTH+1.6),z=p.z+nz*side*(WIDTH+1.6);b.cylinder(x,2.25,z,.10,4.3,5,'#b2c4bb');b.sphere(x,4.51,z,.28,.28,.28,'#fff3b7',4,6);}
 }
 const gate=at(START);
 const gx=Math.cos(gate.yaw),gz=-Math.sin(gate.yaw);
 for(const side of[-1,1])b.box(gate.x+gx*side*(WIDTH+1.0),2.1,gate.z+gz*side*(WIDTH+1.0),.25,4.2,.25,'#f2d990');
 b.box(gate.x,4.30,gate.z,8.9,.58,.38,'#f3ca76');
 // Grandstand figures; fixed low-poly objects only.
 for(let i=0;i<24;i++){
   const x=32.5+(i%12)*1.12,z=76.4+Math.floor(i/12)*.75;
   b.sphere(x,1.85,z,.23,.32,.23,['#ef9b7c','#f6df8e','#9fcbd1','#b2a5da'][i%4],4,6);
  }
  // Finish arches and festival balloons give this track an original personality.
  for(const t of[.04,.28,.54,.78]){
   const p=at(length*t),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
   for(const sign of[-1,1]){
    const x=p.x+nx*(WIDTH+1)*sign,z=p.z+nz*(WIDTH+1)*sign;
    b.box(x,3.1,z,.30,6.1,.30,'#87c9cb');
    b.sphere(x,6.3,z,.65,.60,.65,t<.5?'#ffe095':'#ec9cb4',5,7);
   }
   b.setTransform(p.x,0,p.z,p.yaw);
   b.box(0,6.20,0,WIDTH*2+2.3,.48,.41,'#ffe5aa');
   b.clearTransform();
  }
  for(let i=0;i<18;i++){
   const p=at(length*(i+.3)/18),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
   const x=p.x+nx*(WIDTH+7.5),z=p.z+nz*(WIDTH+7.5);
   const col=['#92c5bd','#f2b4ae','#cab6df','#f9d582'][i%4];
   b.cylinder(x,1.15,z,.17,2.2,5,'#bba992');
   b.sphere(x,2.55,z,1.38,.95,1.39,col,5,7);
  }
}
function drawKart(b,x,z,yaw,color,isPlayer=false,drift=false,variation=0,effects=null){
 const hop=effects?.hop||0;
 b.setTransform(x,.10+hop,z,yaw);
 // Visible driver, chassis, wide wheels and a recognizable kart silhouette.
 b.box(0,.32,0,1.48,.41,2.30,effects?.star>0?'#ffe46e':color);
 b.box(0,.39,.95,1.54,.29,.37,'#f4ead5');
 b.box(0,.52,-.72,1.40,.26,.35,'#d8dfe2');
 for(const xx of[-.87,.87])for(const zz of[-.71,.79]){
  b.box(xx,.32,zz,.35,.57,.54,'#2a343b');
  b.box(xx+(xx>0?.18:-.18),.32,zz,.05,.28,.20,'#dfe2dc');
 }
 b.box(0,.62,-.24,.91,.29,.88,'#314752');
 const suit=isPlayer?'#f07e5b':['#719fcb','#a48ddb','#75bea2','#e4b76c','#d887ac','#87b6c6','#9ab478'][variation%7];
 const hat=isPlayer?'#ffe4a1':['#b9e4ee','#d7c4ed','#bde3c6','#ffe1ac','#f2b7cc','#d7eeee','#e5e6a9'][variation%7];
 b.box(0,1.05,-.31,.67,.68,.57,suit);
 b.sphere(0,1.64,-.32,.53,.48,.53,hat,7,9); // helmet
 b.box(0,1.70,.15,.73,.25,.10,'#40546a');  // visor
 b.box(0,1.47,.23,.51,.12,.09,'#e6bda0');
 for(const xx of[-.14,.14])b.sphere(xx,1.50,.285,.055,.060,.047,'#253545',4,5);
 b.box(0,2.06,-.40,.55,.18,.43,isPlayer?'#eda268':'#e7f0e6'); // crest
 for(const xx of[-.48,.48]){
  b.box(xx,.98,.04,.22,.43,.20,suit); // arms
  b.sphere(xx,.78,.19,.16,.15,.18,'#faf0d4',4,6); // gloves
 }
 b.cylinder(0,.78,.36,.34,.10,9,'#394b56'); // steering wheel
 b.box(0,.52,1.18,1.05,.15,.18,'#f4d8a7');
 b.box(0,.43,-1.16,1.25,.15,.18,'#afcbd2');
 b.box(0,.49,-1.11,.12,.55,.12,'#edece1');
 b.sphere(0,.83,-1.11,.16,.16,.16,isPlayer?'#f3c85e':'#b7d9da',4,6);
 if(drift)for(const xx of[-.58,.58]){
  b.sphere(xx,.22,-1.42,.27,.17,.35,'#ffe4a9',4,6);
  b.sphere(xx*1.1,.20,-1.66,.17,.13,.21,'#f2a3a5',4,5);
 }
 if(effects?.boost>0)for(const xx of[-.46,.46])b.sphere(xx,.35,-1.37,.25,.22,.42,'#fdd279',4,6);
 if(effects?.shield>0)b.sphere(0,1.03,-.12,1.43,1.20,1.71,'#b0dfe2',5,7);
 b.clearTransform();
}
const PILOTS=['こもれび','ミント','そら','あかね','しおかぜ','ルナ','こはく','モモ'];
function forecastGrid(seed=1){
 let x=(Number(seed)>>>0)||1;const random=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
 return PILOTS.map((name,index)=>{
  const speed=12.9+random()*3.55,handling=2+Math.round(random()*3),form=2+Math.round(random()*3);
  return {number:index+1,name,speed:Number(speed.toFixed(2)),handling,form};
 });
}
const controls={left:false,right:false,accelerate:false,brake:false,drift:false};
const race={active:false,finished:false,elapsed:0,countdown:0,player:null,opponents:[],lastHud:0,placement:1,finishPlace:0,autoDrive:true,offTrackTime:0,rescueFlash:0,item:null,pickups:0,lastItemBox:null,shield:0,star:0,itemMessage:'',jumpTimer:0,lastJump:null,jumps:0,spectator:false,grid:[],finishTimes:[],finishOrder:[],seed:1};
function spawn(offset,index){
 const distance=START-offset,p=at(distance),side=index%2===0?-.80:.80;
 return {x:p.x+Math.cos(p.yaw)*side,z:p.z-Math.sin(p.yaw)*side,yaw:p.yaw,speed:0,distance,drift:0,boost:0,place:index+1};
}
function start(options={}){
 race.active=true;race.finished=false;race.elapsed=0;race.countdown=3.2;race.lastHud=0;race.placement=1;race.finishPlace=0;race.autoDrive=true;race.offTrackTime=0;race.rescueFlash=0;race.item=null;race.pickups=0;race.lastItemBox=null;race.shield=0;race.star=0;race.itemMessage='';race.jumpTimer=0;race.lastJump=null;race.jumps=0;
 // The new renderer uses a rear grid start to keep competing karts in view;
 // the classic mode retains its original front grid by default.
 const backGrid=options.playerAtBack===true;
 race.spectator=options.spectator===true;
 race.seed=(Number(options.seed)>>>0)||1;race.grid=race.spectator?forecastGrid(race.seed):[];
 race.finishTimes=Array(8).fill(null);race.finishOrder=[];
 race.player=spawn(backGrid?3.5*AI_COUNT:0,0);
 race.opponents=Array.from({length:AI_COUNT},(_,i)=>({...spawn(backGrid?3.5*i:3.5*(i+1),i+1),targetSpeed:12.2+(i*13%5)*1.25,style:i,hitTimer:0}));
 if(race.spectator){
  race.player.targetSpeed=race.grid[0].speed;
  for(let i=0;i<AI_COUNT;i++)race.opponents[i].targetSpeed=race.grid[i+1].speed;
 }
 Object.keys(controls).forEach(k=>controls[k]=false);
 const root=document.getElementById('app');root?.classList.add('kart-racing');
 const hud=document.getElementById('kartHud');if(hud)hud.hidden=false;
 const restart=document.getElementById('kartRestart');if(restart)restart.hidden=true;
 const auto=document.getElementById('kartAutoToggle');if(auto)auto.textContent='🚗 オート加速 ON';
 updateHud(true);
 return true;
}
function stop(){
 race.active=false;race.finished=false;race.player=null;race.opponents=[];
 Object.keys(controls).forEach(k=>controls[k]=false);
 document.getElementById('app')?.classList.remove('kart-racing');
 const hud=document.getElementById('kartHud');if(hud)hud.hidden=true;
}
function setInput(k,on){if(Object.prototype.hasOwnProperty.call(controls,k))controls[k]=!!on;}
function keyInput(code,on){
 if(code==='KeyE'||code==='KeyQ'){if(on)useItem();return true;}
  const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'accelerate',KeyW:'accelerate',ArrowDown:'brake',KeyS:'brake',Space:'drift',ShiftLeft:'drift',ShiftRight:'drift'};
 if(keys[code]){setInput(keys[code],on);return true}
 return false;
}
function useItem(){
 if(!race.active||race.finished||race.countdown>0||!race.item)return false;
 const kind=race.item,p=race.player;
 race.item=null;
 race.itemMessage=ITEM_NAMES[kind]+' を使用！';
 if(kind==='turbo'){p.boost=Math.max(3,p.boost);p.speed=Math.max(17,p.speed);}
 else if(kind==='bubble')race.shield=8;
 else if(kind==='star'){race.star=5;p.boost=Math.max(p.boost,4.5);}
 else if(kind==='gust'){
  let hits=0;
  for(const ai of race.opponents){
   if(mod(ai.distance-p.distance,length)<95){ai.hitTimer=Math.max(ai.hitTimer,2.8);hits++;}
  }
  race.itemMessage='🍃 追い風で'+hits+'台を妨害！';
 }else if(kind==='seed'){
  let target=null,nearest=Infinity;
  for(const ai of race.opponents){
   const delta=mod(ai.distance-p.distance,length);
   if(delta<nearest&&delta<75){nearest=delta;target=ai;}
  }
  if(target){target.hitTimer=Math.max(target.hitTimer,3.5);race.itemMessage='🌰 木の実が命中！';}
  else {p.boost=Math.max(p.boost,1.3);race.itemMessage='🌰 木の実ブースト！';}
 }
 updateHud(true);return true;
}
function collectItem(p,offset){
 if(race.item||offset>WIDTH+.65)return;
 const lap=Math.max(0,Math.floor((p.distance-START)/length)),where=mod(p.distance,length);
 for(let i=0;i<ITEM_DISTANCES.length;i++){
  const d=ITEM_DISTANCES[i],gap=Math.min(Math.abs(where-d),length-Math.abs(where-d)),key=lap+'-'+i;
  if(gap<2.35&&race.lastItemBox!==key){
   race.lastItemBox=key;
   race.item=ITEM_TYPES[(race.pickups*2+Math.floor(race.pickups/3))%ITEM_TYPES.length];
   race.pickups++;
   race.itemMessage=ITEM_ICONS[race.item]+' '+ITEM_NAMES[race.item]+' をゲット！';
   updateHud(true);break;
  }
 }
}
function rescue(){
 if(!race.active||!race.player||race.finished)return false;
 const p=race.player,target=at(p.distance);
 p.x=target.x;p.z=target.z;p.yaw=target.yaw;p.speed=7;p.drift=0;p.boost=0;
 race.offTrackTime=0;race.rescueFlash=2;
 updateHud(true);return true;
}
function toggleAuto(){
 race.autoDrive=!race.autoDrive;
 const button=document.getElementById('kartAutoToggle');
 if(button)button.textContent=race.autoDrive?'🚗 オート加速 ON':'🎮 手動加速';
 return race.autoDrive;
}
function step(dt){
 if(!race.active||race.finished)return;
 dt=clamp(dt,0,.05);
 if(race.countdown>0){race.countdown=Math.max(0,race.countdown-dt);updateHud();return;}
 race.elapsed+=dt;race.rescueFlash=Math.max(0,race.rescueFlash-dt);race.shield=Math.max(0,race.shield-dt);race.star=Math.max(0,race.star-dt);race.jumpTimer=Math.max(0,race.jumpTimer-dt);
 if(race.spectator){
  const actors=[race.player,...race.opponents],limit=START+length*LAPS;
  for(let i=0;i<actors.length;i++){
   const actor=actors[i],entry=race.grid[i],k=actor.distance;
   const swing=1+.048*Math.sin(race.elapsed*(.65+i*.11)+i*1.17+race.seed%13);
   const bend=Math.cos(k*.045+i*.73)*.025*(6-entry.handling);
   actor.speed=entry.speed*(swing-bend);
   actor.distance+=Math.max(5,actor.speed)*dt;
   const pos=at(actor.distance),lane=(i%3-1)*.83;
   actor.x=pos.x+Math.cos(pos.yaw)*lane;
   actor.z=pos.z-Math.sin(pos.yaw)*lane;
   actor.yaw=pos.yaw;
   if(actor.distance>=limit&&race.finishTimes[i]===null)race.finishTimes[i]=race.elapsed;
  }
  race.placement=1+race.opponents.filter(a=>a.distance>race.player.distance).length;
  if(race.finishTimes.every(t=>t!==null)){
   race.finishOrder=Array.from({length:8},(_,i)=>i+1).sort((a,b)=>race.finishTimes[a-1]-race.finishTimes[b-1]||a-b);
   race.finished=true;race.finishPlace=race.finishOrder.indexOf(1)+1;
  }
  updateHud();return;
 }
 const p=race.player,acc=race.autoDrive||controls.accelerate,brake=controls.brake,steer=Number(controls.right)-Number(controls.left);
 const drifting=controls.drift&&Math.abs(steer)>.2&&p.speed>5;
 const oldDrift=p.drift;
 if(drifting)p.drift=Math.min(2,p.drift+dt);
 else if(oldDrift>.65){p.boost=1.65;p.speed=Math.max(p.speed,16);p.drift=0;}
 else p.drift=0;
 if(p.boost>0)p.boost=Math.max(0,p.boost-dt);
 p.speed=clamp(p.speed+(acc?12:-6)*dt-(brake?22*dt:0),0,race.star>0?25:p.boost>0?23:15.6);
 // With our rear-follow camera, positive yaw points to screen-LEFT.
 // Thus RIGHT steering must DECREASE yaw (opposite the old version).
 p.yaw-=steer*(.95+p.speed*.093)*(drifting?1.22:1)*dt;
 p.x+=Math.sin(p.yaw)*p.speed*dt;
 p.z+=Math.cos(p.yaw)*p.speed*dt;
 const road=roadNearest(p.x,p.z);
 // Mario Kart-style smart steering: help the driver remain on asphalt.
 const ahead=at(road.distance+Math.max(3,p.speed*.48));
 const desired=Math.atan2(ahead.x-p.x,ahead.z-p.z);
 const error=mod(desired-p.yaw+Math.PI,Math.PI*2)-Math.PI;
 const assist=clamp((road.offset-WIDTH*.40)/(WIDTH*.9),0,1);
 if(!steer&&race.autoDrive)p.yaw+=clamp(error,-dt*1.6,dt*1.6)*.65;
  if(!drifting&&assist>0){
  const pull=steer?assist*.50:assist*.95;
  p.yaw+=clamp(error,-dt*2.7,dt*2.7)*pull;
 }
 if(road.offset>WIDTH-.45&&race.star<=0){
  p.speed=Math.min(p.speed,road.offset>WIDTH+1.8?8.5:11.5);
 }
 // Keep the lap counter tied to real FORWARD travel near the road.
 // A jump in closest segment or being stationary can no longer add laps.
 let difference=road.distance-mod(p.distance,length);
 if(difference>length/2)difference-=length;
 if(difference< -length/2)difference+=length;
 const aligned=Math.cos(p.yaw-at(road.distance).yaw);
 const maxMove=Math.max(.03,p.speed*dt*1.4+.03);
 if(road.offset<WIDTH+1.1&&aligned>.20&&Math.abs(difference)<5&&p.speed>.30){
  p.distance+=clamp(difference,-maxMove,maxMove);
 }
 if(road.offset>WIDTH+1.8){race.offTrackTime+=dt;if(race.offTrackTime>1.10)rescue();}
 else race.offTrackTime=0;
 for(const ai of race.opponents){
  ai.hitTimer=Math.max(0,ai.hitTimer-dt);
   ai.distance+=ai.targetSpeed*(ai.hitTimer>0?.49:1)*dt;
  const path=at(ai.distance);
  const lane=((ai.style%3)-1)*.85+.16*Math.sin(ai.distance*.08+ai.style);
  ai.x=path.x+Math.cos(path.yaw)*lane;
  ai.z=path.z-Math.sin(path.yaw)*lane;
  ai.yaw=path.yaw;ai.speed=ai.targetSpeed*(ai.hitTimer>0?.49:1);
  const dx=p.x-ai.x,dz=p.z-ai.z,d=Math.hypot(dx,dz);
  if(d<1.04&&d>.001){if(race.shield<=0&&race.star<=0)p.speed*=.96;p.x+=dx/d*.10;p.z+=dz/d*.10;}
 }
 collectItem(p,road.offset);
  if(road.offset<WIDTH*.70&&p.speed>5.5){
   const lap=Math.max(0,Math.floor((p.distance-START)/length)),where=mod(p.distance,length);
   for(let i=0;i<JUMP_DISTANCES.length;i++){
    const d=JUMP_DISTANCES[i],gap=Math.min(Math.abs(where-d),length-Math.abs(where-d)),key=lap+'-'+i;
    if(gap<1.45&&race.lastJump!==key){
     race.lastJump=key;race.jumpTimer=1.0;race.jumps++;
     p.boost=Math.max(p.boost,1.3);break;
    }
   }
  }
  if(road.offset<WIDTH*.8&&[.16,.39,.63,.87].some(t=>Math.abs(mod(p.distance,length)-t*length)<1.3))p.boost=Math.max(p.boost,.85);
  race.placement=1+race.opponents.filter(ai=>ai.distance>p.distance).length;
 if(p.distance>=START+length*LAPS){
  race.finished=true;race.finishPlace=race.placement;
  const retry=document.getElementById('kartRestart');if(retry)retry.hidden=false;
 }
 updateHud();
}
function timeString(sec){const m=Math.floor(sec/60),s=Math.floor(sec%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function updateHud(force=false){
 if(!race.active)return;
 const now=typeof performance!=='undefined'?performance.now():Date.now();
 if(!force&&now-race.lastHud<85)return;
 race.lastHud=now;
 const p=race.player;const label=document.getElementById('kartStatus'),meta=document.getElementById('kartRaceMeta');
  const itemBtn=document.getElementById('kartItem');
  if(itemBtn){itemBtn.textContent=race.item?ITEM_ICONS[race.item]+' '+ITEM_NAMES[race.item]:'🎁 アイテム';itemBtn.disabled=!race.item||race.countdown>0||race.finished;}
 const lap=Math.min(LAPS,Math.max(1,1+Math.floor((p.distance-START)/length)));
 if(label)label.textContent=race.finished?'🏁 GOAL！ '+race.finishPlace+'位 / 8台':race.countdown>0?'🏎️ '+Math.ceil(race.countdown)+'…':race.rescueFlash>0?'🔄 コースに復帰！':race.jumpTimer>0?'🪽 海風ジャンプ！':race.star>0?'🌟 スター無敵！':race.shield>0?'🫧 バリア展開中！':race.item?'🎁 '+ITEM_NAMES[race.item]+'を使おう':VENUES.some(v=>{const spot=venuePosition(v);return Math.hypot(p.x-spot.x,p.z-spot.z)<23})?'📣 観客席から大歓声！':p.boost>0?'⚡ ターボ加速！':p.drift>.7?'💨 ドリフトチャージ！':'🏎️ こもれびカート';
 if(meta)meta.textContent='順位 '+race.placement+'/8 · '+lap+'/'+LAPS+'周 · '+Math.round(p.speed*9)+' km/h · '+timeString(race.elapsed);
 drawMiniMap();
}
function drawMiniMap(){
 const canvas=document.getElementById('kartMiniMap');
 if(!canvas||typeof canvas.getContext!=='function'||!race.player)return;
 const c=canvas.getContext('2d');if(!c)return;
 const W=canvas.width,H=canvas.height,s=Math.min((W-12)/(COURSE_BOUNDS.maxX-COURSE_BOUNDS.minX),(H-12)/(COURSE_BOUNDS.maxZ-COURSE_BOUNDS.minZ));
 const xy=(x,z)=>[W/2+(x-(COURSE_BOUNDS.minX+COURSE_BOUNDS.maxX)/2)*s,H/2+(z-(COURSE_BOUNDS.minZ+COURSE_BOUNDS.maxZ)/2)*s];
 c.clearRect(0,0,W,H);
 c.lineJoin='round';c.lineCap='round';c.strokeStyle='#b9e3e3';c.lineWidth=11;
 c.beginPath();points.forEach((p,i)=>{const [x,y]=xy(p.x,p.z);if(!i)c.moveTo(x,y);else c.lineTo(x,y)});c.closePath();c.stroke();
 c.strokeStyle='#4e626f';c.lineWidth=6;c.stroke();
 for(const ai of race.opponents){const [x,y]=xy(ai.x,ai.z);c.fillStyle='#f7b69d';c.beginPath();c.arc(x,y,2.6,0,Math.PI*2);c.fill();}
 const p=race.player,[x,y]=xy(p.x,p.z);
 c.save();c.translate(x,y);c.rotate(-p.yaw);c.fillStyle='#ffe16f';c.strokeStyle='#172b37';c.lineWidth=1.7;c.beginPath();c.moveTo(0,-7);c.lineTo(-5,6);c.lineTo(5,6);c.closePath();c.fill();c.stroke();c.restore();
}
function drawDynamic(b,now=0){
 if(!race.active)return;
 drawCheeringFlags(b,now);
 for(let i=0;i<ITEM_DISTANCES.length;i++){
  const pt=at(ITEM_DISTANCES[i]);b.setTransform(pt.x,1.2+.14*Math.sin(now*.003+i),pt.z,now*.0007);
  b.box(0,0,0,.90,.91,.90,['#97dfdf','#f4c68f','#bdafe7'][i%3]);
  b.sphere(0,0,0,.32,.32,.33,'#fff5cc',4,6);b.clearTransform();
 }
 for(let i=0;i<race.opponents.length;i++){
  const ai=race.opponents[i];drawKart(b,ai.x,ai.z,ai.yaw,COLORS[i+1],false,false,i);
 }
 const p=race.player;drawKart(b,p.x,p.z,p.yaw,COLORS[0],true,p.drift>.7,0,{boost:p.boost,shield:race.shield,star:race.star,hop:race.jumpTimer>0?Math.sin(Math.PI*(1-race.jumpTimer))*1.2:0});
}
 function camera(){
 if(!race.active||!race.player)return null;
 const p=race.player,si=Math.sin(p.yaw),co=Math.cos(p.yaw);
 return {eye:[p.x-si*5.6,3.3,p.z-co*5.6],center:[p.x+si*9,1.28,p.z+co*9],fov:63};
}
function bindControls(onQuit){
 const names={kartSteerLeft:'left',kartSteerRight:'right',kartBrake:'brake',kartDrift:'drift'};
 for(const [id,k] of Object.entries(names)){
  const btn=document.getElementById(id);if(!btn)continue;
  btn.addEventListener('pointerdown',e=>{if(!race.active)return;e.preventDefault();setInput(k,true);btn.classList.add('pressed');try{btn.setPointerCapture(e.pointerId)}catch{}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(event,()=>{setInput(k,false);btn.classList.remove('pressed');});
 }
 document.getElementById('kartRescue')?.addEventListener('click',rescue);
  document.getElementById('kartItem')?.addEventListener('click',useItem);
 document.getElementById('kartAutoToggle')?.addEventListener('click',toggleAuto);
 document.getElementById('kartQuit')?.addEventListener('click',onQuit);
 document.getElementById('kartRestart')?.addEventListener('click',start);
 if(typeof window!=='undefined')window.addEventListener('blur',()=>Object.keys(controls).forEach(k=>controls[k]=false));
}
const places=[{id:'kartTrack',x:34,z:60,r:3.0,icon:'🏎️',name:'こもれび群島グランプリ'}];
window.KomorebiKart={CENTER,LAND,WIDTH,LAPS,length,COURSE_BOUNDS,ITEM_DISTANCES,JUMP_DISTANCES,ITEM_TYPES,SPONSORS,VENUES,venuePosition,forecastGrid,places,at,roadNearest,useItem,drawTerrain,drawStatic,drawDynamic,start,stop,rescue,toggleAuto,setInput,active:()=>race.active,finished:()=>race.finished,camera,step,bindControls,keyInput,getState:()=>({active:race.active,finished:race.finished,spectator:race.spectator,grid:race.grid.map(x=>({...x})),finishOrder:[...race.finishOrder],item:race.item,pickups:race.pickups,shield:race.shield,star:race.star,jumpTimer:race.jumpTimer,jumps:race.jumps,lap:race.player?Math.min(LAPS,1+Math.floor((race.player.distance-START)/length)):0,autoDrive:race.autoDrive,offTrackTime:race.offTrackTime,place:race.placement,elapsed:race.elapsed,player:race.player&&{...race.player},opponents:race.opponents.map(a=>({...a}))})};
})();
