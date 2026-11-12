/* こもれび島 v1.3 — こもれびシーライン & walkable 商業島.
   Two fully connected procedural islands, independent of external graphics engines. */
(()=>{
'use strict';
const A={x:17.45,z:1.3}, B={x:43.6,z:-2.8};
const CENTER={x:52.0,z:-4.2}, RADII={x:20.8,z:16.4}; // ~2.85x city land
const dx=B.x-A.x,dz=B.z-A.z,run=Math.hypot(dx,dz),ux=dx/run,uz=dz/run,px=-uz,pz=ux;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const stations=[
 {id:'seaStationHome',x:17.4,z:2.85,r:1.65,icon:'🚉',name:'こもれび駅',island:'home'},
 {id:'seaStationCity',x:44.4,z:-1.25,r:1.9,icon:'🚉',name:'みなと駅',island:'commerce'}
];
const places=[
 {id:'cityMall',x:52.3,z:-1.2,r:2.0,icon:'🛍️',name:'みなとショッピングモール'},
 {id:'cityCafe',x:59.0,z:1.15,r:1.55,icon:'☕',name:'海辺のカフェ'},
 {id:'cityMarket',x:48.7,z:3.3,r:1.8,icon:'🧺',name:'駅前マルシェ'},
 {id:'cityHotel',x:51.8,z:-7.7,r:1.8,icon:'🏨',name:'みなとホテル'},
 {id:'cityOffice',x:58.5,z:-6.2,r:1.6,icon:'🏢',name:'オフィスビル'},
 {id:'cityWheel',x:63.6,z:7.2,r:2.1,icon:'🎡',name:'海の観覧車'},
 {id:'cityPromenade',x:61.1,z:-3.15,r:2.0,icon:'🌊',name:'海辺の遊歩道'}
];
const blocker=[
 {x:52.3,z:-4.7,w:5.8,d:4.5},{x:58.9,z:-.8,w:3.1,d:2.8},
 {x:51.6,z:-10.2,w:3.5,d:3.3},{x:58.3,z:-8.2,w:3.2,d:3.2},
 {x:63.6,z:5.0,w:2.8,d:2.4}
];
const lerp=(a,b,t)=>a+(b-a)*t;
function pointAt(t){t=clamp(t,0,1);return {x:lerp(A.x,B.x,t),z:lerp(A.z,B.z,t)};}
function commercialShape(x,z,margin=0){const xx=(x-CENTER.x)/(RADII.x-margin),zz=(z-CENTER.z)/(RADII.z-margin);return xx*xx+zz*zz<=1;}
function isCommercial(x,z){return commercialShape(x,z,0);}
function walkable(x,z){
 if(!commercialShape(x,z,.35))return false;
 for(const q of blocker)if(Math.abs(x-q.x)<q.w/2+.19&&Math.abs(z-q.z)<q.d/2+.19)return false;
 return true;
}
function nearestStation(x,z){
 // The home station shares a small peninsula with the original pier.
 // Favor boarding across the station approach instead of requiring one exact tile.
 const d0=Math.hypot(x-stations[0].x,z-stations[0].z);
 const d1=Math.hypot(x-stations[1].x,z-stations[1].z);
 return d0<=4.25?stations[0]:(d1<=3.5?stations[1]:null);
}
function clearStationTrees(trees){
 // Keep each array index unchanged so pre-existing harvested tree IDs remain valid.
 // Moving obstructing trees also reveals the station entrance on narrow iPhones.
 const openSpots=[[-15.4,9.0],[-12.6,-10.4],[10.6,12.0],[-16.8,-3.8],[3.2,13.4]];
 let index=0;
 for(const t of trees){
  if(Math.hypot(t.x-A.x,t.z-A.z)>4.45)continue;
  const target=openSpots[index++%openSpots.length];
  t.x=target[0];t.z=target[1];
 }
}
function branch(b,a,c,width,y,col){
 const sx=-(c[1]-a[1]),sz=c[0]-a[0],l=Math.hypot(sx,sz)||1,rx=sx/l*width/2,rz=sz/l*width/2;
 b.quad([a[0]+rx,y,a[1]+rz],[c[0]+rx,y,c[1]+rz],
   [c[0]-rx,y,c[1]-rz],[a[0]-rx,y,a[1]-rz],col);
}
function drawTerrain(b){
 // Second island, separated from the original island by real ocean.
 const count=64;
 for(let layer=0;layer<2;layer++){
  const rx=RADII.x+(layer?0:1.05),rz=RADII.z+(layer?0:1.05);
  const y=layer?-.045:-.19,base=layer?-.29:-.56;
  for(let i=0;i<count;i++){
   const a=i*2*Math.PI/count,bb=(i+1)*2*Math.PI/count;
   const k=1+Math.sin(i*.76)*.008,v=1+Math.sin((i+1)*.76)*.008;
   const p=[CENTER.x+Math.cos(a)*rx*k,CENTER.z+Math.sin(a)*rz*k];
   const q=[CENTER.x+Math.cos(bb)*rx*v,CENTER.z+Math.sin(bb)*rz*v];
   b.tri([CENTER.x,y,CENTER.z],[q[0],y,q[1]],[p[0],y,p[1]],layer?'#a4d891':'#f0dda8');
   b.quad([p[0],y,p[1]],[q[0],y,q[1]],[q[0],base,q[1]],[p[0],base,p[1]],layer?'#79b784':'#d7ba80');
  }
 }
 // Paved boulevard, main plaza, paths to hotel, cafe and waterfront.
 b.ellipseDisc(47.4,.038,-1.6,3.35,2.7,'#eee3c7',28);
 const roads=[
 [[44.7,-1.55],[51.8,-1.15]],[[51.8,-1.15],[57.95,1.25]],
 [[50.8,-1.3],[48.2,2.9]],[[50.9,-1.4],[51.8,-7.8]],
 [[55.6,-1.5],[59.4,-5.9]],[[58.2,-.6],[61.9,-3.25]],
 [[46.8,-2.7],[52,-7.1]],
 [[45.0,-2.7],[42.3,-7.2]],[[43.1,-1.0],[43.4,7.7]],
 [[51.8,-7.8],[57.5,-11.7]],[[59.4,-5.9],[65.1,-6.0]],
 [[58.3,1.8],[63.6,7.1]],[[61.9,-3.25],[68.0,-.3]]
 ];
 for(const [a,c] of roads)branch(b,a,c,1.75,.054,'#f2e3bb');
 // Patterned shopping plaza.
 for(let i=0;i<6;i++)b.box(47.35+i*.44,.062,-1.4,.06,.017,3.1,'#e6d8bc');
}
function seasideTree(b,x,z,r=1){
 b.cylinder(x,.62*r,z,.17*r,1.23*r,6,'#a3825b');
 b.sphere(x,1.73*r,z,.98*r,.92*r,.98*r,'#73b98a',5,7);
 b.sphere(x+.38*r,1.86*r,z-.3*r,.54*r,.50*r,.54*r,'#92cd90',4,7);
}
function windowRow(b,x,z,y,width,count){
 for(let i=0;i<count;i++){
  const xx=x+(i-(count-1)/2)*(width/count);
  b.box(xx,y,z,.59,.68,.08,'#fff9e8');
  b.box(xx,y,z+.075,.43,.51,.06,'#8fc9d2');
  b.box(xx,y-.35,z+.13,.62,.10,.34,'#dce8e8');
 }
}
function buildMall(b){
 const x=52.3,z=-4.7;
 b.box(x,2.24,z,5.9,4.4,4.6,'#f5ecd8');
 b.box(x,4.55,z,6.28,.21,4.98,'#b7dce3');
 for(let i=0;i<7;i++)b.box(x-2.63+i*.88,4.76,z,.12,.23,4.5,'#f9fbeb');
 for(let i=0;i<6;i++)b.box(x-2.2+i*.88,1.28,z+2.36,.58,1.65,.12,'#a6d7dc');
 b.box(x,1.12,z+2.43,1.65,1.8,.13,'#80bec2');
 b.box(x,.31,z+3.02,3.1,.17,1.20,'#e7d8b9');
 for(const side of[-1,1]){b.box(x+side*2.40,2.27,z+2.48,.78,.36,.10,'#f0bd7e');}
 // Tall illuminated sign fixed to facade.
 b.box(x,4.10,z+2.60,2.2,.48,.12,'#edcc8b');
}
function buildCafe(b){
 const x=59,z=-.8;
 b.box(x,1.1,z,3.3,1.99,2.7,'#fae7c9');
 b.roof(x,2.17,z,3.5,2.9,.78,'#c99f70');
 b.box(x,1.02,z+1.41,1.95,1.25,.10,'#9bbfc5');
 b.box(x,1.61,z+1.50,2.4,.35,.10,'#e5a782');
 for(const q of[-1.2,1.2]){
  b.cylinder(x+q,.4,z+2.35,.08,.8,5,'#a17f5e');
  b.ellipseDisc(x+q,.8,z+2.35,.49,.40,'#fff1d2',12);
  b.cylinder(x+q,.98,z+2.35,.65,.12,10,'#f8e5a7');
 }
}
function buildHotel(b){
 const x=51.6,z=-10.2;
 b.box(x,4.68,z,3.55,9.26,3.45,'#f5e5d4');
 b.box(x,9.42,z,3.88,.25,3.80,'#eff2e8');
 for(let i=0;i<4;i++)windowRow(b,x,z+1.80,1.38+i*1.89,3.15,3);
 b.box(x,1.02,z+1.88,.85,1.5,.08,'#c0aaa0');
 for(const xx of[x-1.48,x+1.48])b.box(xx,9.65,z,.30,.37,2.4,'#85b87d');
}
function buildOffice(b){
 const x=58.3,z=-8.2;
 b.box(x,6.13,z,3.4,12.20,3.2,'#c3d4de');
 for(let i=0;i<6;i++){
  b.box(x,1.35+i*1.85,z+1.64,2.85,1.49,.11,'#91c1d1');
  b.box(x,2.14+i*1.85,z+1.72,3.15,.09,.12,'#f3f0e6');
  for(const xx of[x-.85,x,x+.85])b.box(xx,1.35+i*1.85,z+1.73,.07,1.39,.11,'#e9f1e9');
 }
 b.box(x,12.33,z,3.73,.24,3.54,'#f8f5e8');
}
function buildMarket(b){
 for(let i=0;i<4;i++){
  const x=46.8+i*1.48,z=2.80+(i%2)*.40;
  b.box(x,.48,z,1.21,.73,.91,'#d9ad80');
  b.box(x,1.12,z,1.42,.15,1.34,['#eeb7a6','#f2da8f','#a4d2cc','#f0b5cb'][i]);
  for(const off of[-.53,.53])b.box(x+off,.8,z+.54,.07,.72,.07,'#fff1d5');
  for(let j=0;j<3;j++)b.sphere(x-.36+j*.34,.90,z+.42,.16,.12,.14,['#f6cb75','#88c782','#e99a80'][j],4,6);
 }
}
function wheel(b){
 // Bigger Ferris wheel: radius 5.25 vs the old 2.12, scaled against 2.2-unit visitors.
 const x=63.6,z=5.0,cy=6.1,r=5.25;
 for(let k=0;k<16;k++){
  const t=k*Math.PI/8,u=(k+1)*Math.PI/8,xx=x+r*Math.cos(t),yy=cy+r*Math.sin(t);
  const qx=x+r*Math.cos(u),qy=cy+r*Math.sin(u);
  b.quad([xx,yy,z-.14],[qx,qy,z-.14],[qx,qy,z+.14],[xx,yy,z+.14],'#ebd8a0');
  if(k%2===0){
   b.box(xx,yy-.36,z+.32,.75,.65,.65,['#f1bbbe','#a6d6d2','#f3d890','#bdd8f0'][k/2%4]);
   b.box(xx,yy+.11,z+.32,.07,.24,.05,'#f3eadc');
  }
  b.quad([x,cy,z],[xx,yy,z],[xx+.05,yy+.05,z],[x,cy,z],'#c2c2aa');
 }
 for(const off of[-1,1])b.quad([x,cy,z],[x+off*2.3,.16,z],[x+off*2.6,.16,z],[x,cy,z],'#b3a9a2');
 b.cylinder(x,cy,z,.46,.45,8,'#f8d7a7');
 b.box(x,.12,z,5.4,.24,2.8,'#d2bd9a');
}
function drawPromenade(b){
 const x=62.0,z=-3.20;
 for(let i=0;i<7;i++)b.box(x+i*.55,.10,z,.51,.19,2.55,'#bb946d');
 for(const xx of[x,x+1.8,x+3.15])for(const zz of[z-1.12,z+1.14])b.cylinder(xx,-.09,zz,.11,.79,6,'#8f7054');
 for(let i=0;i<8;i++)b.box(57.7+i*.62,.12,4.18,.48,.22,.42,'#e7d5ab');
}
function buildStation(b,x,z,large){
 const width=large?4.7:3.6,roof=large?'#8ecbd1':'#8dbaa9';
 b.box(x,.38,z,width,.48,3.0,'#e5d9bd');
 for(const off of[-1.12,1.12])for(const zz of[z-1.0,z+1.0])b.box(x+off,1.48,zz,.15,2.05,.15,'#d5e6df');
 b.box(x,2.54,z,width+.3,.28,3.34,roof);
 b.box(x,2.75,z,width+.15,.20,2.88,'#f4f4e9');
 b.box(x,1.13,z+.82,width-.8,.12,.60,'#f8efe0');
 // Ticket office and platform railing, small enough to not hide the view.
 b.box(x-.65,.95,z-.53,1.08,1.19,.78,'#f3e8ce');
 b.box(x-.65,1.06,z-.08,.81,.61,.08,'#abd1d0');
 b.box(x+width*.42,1.00,z,.12,.7,2.6,'#f7f2e4');
}
function bridge(b){
 const y=1.45;
 // Stable elevated rail bridge extends continuously between the two islands.
 branch(b,[A.x,A.z],[B.x,B.z],2.25,y-.27,'#d5d9d4');
 for(let i=0;i<=34;i++){
  const t=i/34,{x,z}=pointAt(t);
  b.box(x,y-.02,z,1.12,.12,1.92,'#b99a70');
 }
 for(const off of[-.62,.62]){
  const a=[A.x+px*off,A.z+pz*off],c=[B.x+px*off,B.z+pz*off];
  branch(b,a,c,.13,y+.10,'#718a8d');
 }
 for(const t of[.08,.19,.30,.41,.52,.63,.74,.85,.96]){
  const {x,z}=pointAt(t);
  b.cylinder(x,.23,z,.24,2.36,6,'#dbe1dd');
  b.box(x,.15,z,1.0,.18,1.0,'#c6d6d4');
 }
 // Short safety rail along the open sea.
 for(const off of[-1.08,1.08]){
  const a=[A.x+px*off,A.z+pz*off],c=[B.x+px*off,B.z+pz*off];
  branch(b,a,c,.07,y+.54,'#f6eee1');
 }
}
function townDetails(b){
 // Trees, flowerbeds, seating and lanterns. Sparse to protect iPhone performance.
 for(const [x,z,r] of [[45.8,-7,0.85],[47.4,-8.9,1],[48,-12,.8],[55.7,-11.9,.9],[60.7,-5.4,.8],[46.3,.65,.8],[54.8,1.55,.74],[56.5,3.6,.9]]){
  seasideTree(b,x,z,r);
 }
 for(let i=0;i<40;i++){
  const x=44+(i*2.37)%17,z=-12+(i*3.71)%17;
  if(!walkable(x,z))continue;
  b.cylinder(x,.13,z,.024,.25,4,'#629f79');
  b.sphere(x,.28,z,.1,.10,.1,['#f6c9d4','#fcde9c','#f7f5e2'][i%3],4,6);
 }
 for(const [x,z] of [[47.1,-.8],[54.9,-1.2],[60.3,-3.6]]){
  b.box(x,.51,z,1.35,.17,.5,'#bf9165');
  for(const off of[-.49,.49])b.box(x+off,.29,z,.12,.5,.38,'#90755b');
 }
 for(const [x,z] of [[46.4,-.3],[50,-.5],[56.2,1.6],[60.3,-3.7]]){
  b.cylinder(x,1.20,z,.09,2.36,6,'#91afa8');
  b.sphere(x,2.49,z,.18,.19,.18,'#ffe9ae',5,6);
 }
}
function drawStatic(b){
 bridge(b);
 buildStation(b,A.x,A.z,false);
 buildStation(b,B.x,B.z,true);
 buildMall(b);buildCafe(b);buildHotel(b);buildOffice(b);buildMarket(b);wheel(b);drawPromenade(b);townDetails(b);
}
function train(b,t){
 const p=pointAt(t),yaw=Math.atan2(-dz,dx);
 // A two-car aqua-and-cream commuter train; local x axis points along the viaduct.
 b.setTransform(p.x,1.85,p.z,yaw);
 for(const offset of[-1.28,1.28]){
  b.box(offset,0,0,2.35,1.04,1.10,'#fff5d9');
  b.box(offset,.46,0,2.31,.20,1.08,'#94b8c6');
  b.box(offset,-.30,.01,2.38,.21,1.13,'#8db9a5');
  for(const xx of[-.74,0,.74]){
   b.box(offset+xx,.10,.567,.53,.42,.052,'#8ec6d5');
   b.box(offset+xx,.10,-.567,.53,.42,.052,'#8ec6d5');
  }
  b.box(offset,.0,.607,2.15,.08,.04,'#edc56d');
  for(const xx of[-.73,.73])for(const z of[-.40,.40])b.sphere(offset+xx,-.58,z,.17,.15,.15,'#7e8281',4,6);
 }
 b.box(-2.52,.08,0,.11,.72,.95,'#8ac4cd');
 b.box(2.52,.08,0,.11,.72,.95,'#8ac4cd');
 b.clearTransform();
}
function drawDynamic(b,now,ride){
 const t=ride?.active?ride.progress:(.5+.48*Math.sin(now*.00013));
 train(b,t);
}
function paintMap(canvas,state){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.fillStyle='#98d2db';c.fillRect(0,0,w,h);
 c.save();
 // Wider home island and new city districts both fit on this map.
 const scale=Math.min((w-28)/107,(h-40)/46),sx=31,sz=23;
 c.translate(14,18);c.scale(scale,scale);c.translate(sx,sz);
 function ellipse(x,z,rx,rz,color){c.fillStyle=color;c.beginPath();c.ellipse(x,z,rx,rz,0,0,Math.PI*2);c.fill();}
 ellipse(-2.6,0,24.4,20.9,'#f5dfad');ellipse(-2.6,0,23.3,19.8,'#a3d48e');
 ellipse(CENTER.x,CENTER.z,RADII.x+1,RADII.z+1,'#f5dfad');
 ellipse(CENTER.x,CENTER.z,RADII.x,RADII.z,'#a3d48e');
 c.strokeStyle='#f9f0e2';c.lineWidth=.9;c.beginPath();c.moveTo(A.x,A.z);c.lineTo(B.x,B.z);c.stroke();
 c.strokeStyle='#647f8a';c.lineWidth=.29;c.stroke();
 ellipse(0,0,2.4,2.0,'#eee2c5');ellipse(48,-1.6,3,2.7,'#eee2c5');
 for(const [x,z,icon] of [[-6,-5,'🏡'],[6,-5,'🏪'],[-7,6,'🎣'],[14,-5,'🏗️'],[-21,-5,'🏘️'],[-18,9.3,'🏡'],[-12.4,15.3,'🌲'],[17.4,2.8,'🚉'],
  [43.6,-2.8,'🚉'],[52,-4.6,'🛍️'],[59,-1,'☕'],[51.6,-10,'🏨'],[63.6,5,'🎡'],[65.1,-9.8,'🏙️'],[42.3,-10.8,'🏘️'],[58.5,-15.5,'📚'],[43.5,7.5,'🌳'],[68,-1.8,'⛵']]){
  c.save();c.translate(x,z);c.scale(1/scale,1/scale);c.font='18px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(icon,0,0);c.restore();
 }
 ellipse(state.x,state.z,.7,.7,'#ec7158');c.strokeStyle='white';c.lineWidth=.2;c.stroke();
 c.restore();
}
window.KomorebiSeaLine={A,B,CENTER,RADII,stations,places,drawTerrain,drawStatic,drawDynamic,
 isCommercial,walkable,pointAt,nearestStation,clearStationTrees,paintMap};
})();
