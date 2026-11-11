/* こもれび島 v1.0 — island expansion. Original procedural scenery. */
(() => {
'use strict';
const extraTrees = [
 {x:-16,z:-6,type:'pine'}, {x:-17.1,z:.3,type:'fruit'},
 {x:-15.5,z:7.4,type:'fruit'}, {x:-11,z:12,type:'pine'},
 {x:-5.8,z:13.3,type:'fruit'}, {x:-.4,z:13.2,type:'pine'},
 {x:5.3,z:12.6,type:'fruit'}, {x:16,z:-1.9,type:'pine'},
 {x:13.3,z:-7.5,type:'fruit'}, {x:6.5,z:-12.7,type:'pine'},
 {x:-.5,z:-13.7,type:'fruit'}, {x:-7,z:-12,type:'pine'},
 {x:-14,z:-7.5,type:'fruit'}, {x:16.6,z:4.2,type:'fruit'},
 {x:-16.2,z:3.8,type:'pine'}, {x:-3.5,z:14,type:'fruit'},
 {x:2.7,z:-14,type:'pine'}, {x:13.7,z:11.2,type:'pine'}
];
const extraShells=[{x:-17.3,z:-3.8},{x:-11,z:12.8},{x:16.9,z:-3.0}];
const places=[
 {id:'cottage',x:9.5,z:-6.65,r:2.1,icon:'🏡',name:'森のコテージ'},
 {id:'camp',x:-12,z:9.2,r:2.2,icon:'🏕️',name:'森のキャンプ場'},
 {id:'falls',x:12.55,z:9.55,r:2.3,icon:'💦',name:'木漏れ日の滝'},
 {id:'pier',x:17.4,z:-.8,r:2.2,icon:'🛶',name:'海辺の桟橋'}
];
const rx=20.7,rz=16.65;
const paths=[
 [[-4,-3],[-9,-5]],[[-9,-5],[-13,-4]],[[-13,-4],[-15,1]],
 [[-15,1],[-13.8,6]],[[-13.8,6],[-12,9.2]],
 [[-1,1],[-2,7]],[[-2,7],[-5,11]],[[-5,11],[-10,11]],
 [[6,-3],[9,-6] ],[[9,-6],[9.5,-9]],
 [[6,2],[9,3.1]],[[9,3.1],[11,6.8]],
 [[9,3.1],[14,.3]],[[14,.3],[16.8,-.8]],
 [[-2,-3],[-1,-10]],[[-1,-10],[5,-11]]
];
const stream=[[12.55,9.5],[11.8,8.0],[12.5,6.8],[12.7,5.7],[12.6,4.1]];
const dist2=(x,z,p)=>Math.hypot(x-p[0],z-p[1]);
function distanceToSegment(x,z,a,c){
 const dx=c[0]-a[0],dz=c[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
 return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
function strip(b,a,c,width,y,col){
 const dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz)||1;
 const sx=-dz/len*width/2,sz=dx/len*width/2;
 b.quad([a[0]+sx,y,a[1]+sz],[c[0]+sx,y,c[1]+sz],
        [c[0]-sx,y,c[1]-sz],[a[0]-sx,y,a[1]-sz],col);
}
function boxColor(b,x,y,z,w,h,d,col){b.box(x,y,z,w,h,d,col)}
function ground(b){
 // Additional footpaths stay outside the original village and lead to every region.
 for(const [a,c] of paths)strip(b,a,c,1.05,.012,'#ead5ad');
 // Shallow waterfall stream and second lily pond, with pale shoreline.
 for(let i=1;i<stream.length;i++){
  strip(b,stream[i-1],stream[i],2.55,.036,'#d9e6bf');
  strip(b,stream[i-1],stream[i],1.76,.047,'#78c8d4');
 }
 b.ellipseDisc(12.6,.041,4.1,2.06,1.64,'#dfdfb2',28);
 b.ellipseDisc(12.6,.053,4.1,1.78,1.38,'#79bfcd',28);
 b.ellipseDisc(12.14,.058,3.8,.61,.30,'#b8e2e4',18);
 for(let i=0;i<9;i++){
  const a=i*Math.PI*2/9;
  b.sphere(12.6+1.93*Math.cos(a),.13,4.1+1.48*Math.sin(a),.20,.12,.22,'#e7deb0',4,6);
 }
 // Additional small lily patches.
 for(const [x,z] of [[12,4.5],[13.25,3.9],[12.8,4.7]]){
  b.ellipseDisc(x,.079,z,.23,.17,'#72ae72',12);
  b.sphere(x+.06,.12,z,.09,.08,.09,'#f1acc7',4,5);
 }
}
function objects(b){
 // A cozy extra home that shares the existing interactable home interior.
 // Built here with the same mesh primitives as the two original homes.
 const x=9.5,z=-9.3;
 b.box(x,1,z,3.55,1.90,3.2,'#fae6bf');b.roof(x,1.96,z,3.65,3.3,1.54,'#d9a76a');
 b.box(x,.8,z+1.68,.88,1.47,.12,'#9b7759');
 b.box(x,.82,z+1.76,.63,.84,.07,'#bc9977');
 for(const off of[-1.17,1.17]){
  b.box(x+off,1.2,z+1.66,.66,.74,.12,'#fff8e5');
  b.box(x+off,1.2,z+1.73,.48,.52,.07,'#98c6bf');
 }
 b.cylinder(x+1.06,3.05,z-.72,.19,.96,8,'#c6a790');
 b.box(x,.08,z+2.15,1.35,.15,.8,'#dcbf97');
 // Farm-style fence bordering the new cottage.
 for(let k=0;k<6;k++){
   b.box(6.7+k*.92,.29,-12.05,.11,.55,.12,'#f1e8c9');
 }
 b.box(8.98,.30,-12.05,4.85,.1,.10,'#f1e8c9');
 // Campsite: a triangle-profile tent, fire pit, sitting logs, and sign.
 const cx=-12,cz=9.2;
 b.quad([cx-1.6,.09,cz-.95],[cx+1.6,.09,cz-.95],[cx,2.12,cz-.95],[cx,2.12,cz-.95],'#f1e5c1');
 b.quad([cx+1.6,.09,cz+.95],[cx-1.6,.09,cz+.95],[cx,2.12,cz+.95],[cx,2.12,cz+.95],'#e8d9b0');
 b.quad([cx-1.6,.09,cz-.95],[cx,2.12,cz-.95],[cx,2.12,cz+.95],[cx-1.6,.09,cz+.95],'#fbefd2');
 b.quad([cx,2.12,cz-.95],[cx+1.6,.09,cz-.95],[cx+1.6,.09,cz+.95],[cx,2.12,cz+.95],'#dcc9a1');
 b.tri([cx-1.6,.09,cz+.95],[cx+1.6,.09,cz+.95],[cx,2.12,cz+.95],'#e9d8ac');
 b.tri([cx+1.6,.09,cz-.95],[cx-1.6,.09,cz-.95],[cx,2.12,cz-.95],'#e4d5b9');
 const fx=-9.8,fz=9.1;
 for(let k=0;k<9;k++){const a=k*Math.PI*2/9;b.sphere(fx+.55*Math.cos(a),.12,fz+.55*Math.sin(a),.20,.16,.20,'#bbb49d',4,6)}
 b.cylinder(fx,.46,fz,.26,.75,7,'#f2a44b',.07);
 b.sphere(fx,.81,fz,.21,.38,.21,'#ffd574',5,6);
 b.cylinder(-9.5,.35,11.0,.58,.70,9,'#a57f5c');
 b.box(-13.1,.83,11.35,1.25,.71,.16,'#b28d66');
 for(const off of[-.47,.47])b.box(-13.1+off,.49,11.35,.11,.85,.13,'#8e7057');
 // Stone waterfall descending into the upper end of the creek.
 for(const [px,py,pz,scale] of [[11.85,.67,10.4,1.24],[13.25,.85,10.4,1.38],[12.55,1.07,11.1,1.5],[11.5,.42,9.6,.81],[14.2,.48,9.8,1]]){
   b.sphere(px,py,pz,scale,scale*.65,scale*.8,'#acb9a5',5,7);
 }
 b.box(12.55,.91,10.05,.85,1.55,.22,'#b9e4e3');
 b.box(12.55,.45,9.76,1.34,.13,.71,'#95d9df');
 for(const xx of[12.15,12.55,12.95])b.sphere(xx,.23,9.38,.23,.09,.3,'#e7f7eb',4,6);
 // Wooden arched crossing at (12.5, 7.0). Player can walk across it.
 for(let i=0;i<7;i++)b.box(12.45,.17,6.3+i*.23,3.3,.14,.19,'#ba936e');
 for(const xx of[10.89,14.05]){
  b.box(xx,.54,6.31,.13,.90,.13,'#947659');
  b.box(xx,.54,7.70,.13,.90,.13,'#947659');
  b.box(xx,.78,7.01,.12,.15,1.63,'#c6a179');
 }
 // Fishing pier from land toward the sea on the east.
 for(let i=0;i<6;i++)b.box(18+i*.57,.17,-.8, .51,.19,2.1,'#a7835f');
 for(const xx of[18,19.7,20.95])for(const zz of[-1.72,.12]){
  b.cylinder(xx,.19,zz,.12,.7,7,'#826949');
 }
 b.box(19.4,.44,-.16,.55,.47,.49,'#b6956e');
 b.box(19.4,.73,-.16,.58,.10,.51,'#d1b385');
 // Small low-poly rowing boat at the end of the pier.
 b.sphere(22.1,-.35,-1.8,1.0,.24,.50,'#b78c67',5,8);
 b.sphere(22.1,-.19,-1.8,.69,.09,.33,'#5c837c',4,8);
 // Flower meadow and stones in the new regions.
 let seed=247911;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
 const protectedArea=(x,z)=>Math.hypot(x-9.5,z+9.3)<3.5||Math.hypot(x+12,z-9.2)<3.3||
  Math.hypot(x-12.5,z-9.0)<3.3||Math.hypot(x-12.6,z-4.1)<3||paths.some(q=>distanceToSegment(x,z,q[0],q[1])<1.0);
 const colours=['#fff8de','#e8bddc','#f1d185','#b8dce6','#fffef6'];
 for(let i=0;i<230;i++){
  const xx=(rand()-.5)*41,zz=(rand()-.5)*33;
  const central=(xx*xx/162+zz*zz/117)<1.02;
  if(central||xx*xx/(20.2*20.2)+zz*zz/(16.1*16.1)>.93||protectedArea(xx,zz))continue;
  b.cylinder(xx,.12,zz,.028,.22,4,'#609968');
  b.sphere(xx,.25,zz,.10+rand()*.08,.10,.11,colours[Math.floor(rand()*colours.length)],4,5);
 }
}
function canWalk(x,z){
 if(x*x/(20.15*20.15)+z*z/(16.1*16.1)>1)return false;
 if(Math.hypot(x-9.5,z+9.3)<2.28)return false;
 if(Math.hypot(x-12.6,z-4.1)<1.65)return false;
 if(Math.hypot(x-12.55,z-10.05)<1.25)return false;
 // Creek banks remain blocked, except at the wooden bridge crossing.
 for(let i=1;i<stream.length;i++){
  if(Math.abs(z-7.0)<.80 && x>10.4 && x<14.4)continue;
  if(distanceToSegment(x,z,stream[i-1],stream[i])<.84)return false;
 }
 return true;
}
function paintMap(canvas,state){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 ctx.fillStyle='#a8d9de';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(w/2,h/2);
 const scale=Math.min((w-46)/44,(h-32)/36);
 ctx.scale(scale,scale);
 ctx.fillStyle='#f4dfac';ctx.beginPath();ctx.ellipse(0,0,21.8,17.7,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#a1d98e';ctx.beginPath();ctx.ellipse(0,0,20.7,16.65,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#e7d2a7';ctx.lineWidth=1.04;
 for(const [a,c] of paths){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(c[0],c[1]);ctx.stroke();}
 ctx.fillStyle='#75c4d1';ctx.beginPath();ctx.ellipse(-7,6,3,2.2,0,0,7);ctx.fill();
 ctx.beginPath();ctx.ellipse(12.6,4.1,1.8,1.4,0,0,7);ctx.fill();
 ctx.strokeStyle='#75c4d1';ctx.lineWidth=1.8;ctx.beginPath();stream.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();
 for(const [x,z,emoji] of [[-6,-5,'🏡'],[6,-5,'🏪'],[-7,6,'🎣'],[6,6,'🥕'],[-12,9.2,'🏕️'],[9.5,-9.3,'🏠'],[12.55,9.55,'💦'],[17.4,-.8,'🛶'],[14.05,-5.75,'🏗️']]){
  ctx.save();ctx.translate(x,z);ctx.scale(1/scale,1/scale);ctx.font='20px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji,0,0);ctx.restore();
 }
 ctx.fillStyle='#eb6e57';ctx.beginPath();ctx.arc(state.x,state.z,.63,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#fff';ctx.lineWidth=.27;ctx.stroke();
 ctx.restore();
}
window.KomorebiExpansion={trees:extraTrees,shells:extraShells,places,grass:[rx,rz],sand:[21.8,17.75],ground,objects,canWalk,paintMap};
})();