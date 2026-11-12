/* Komorebi Island — v2.3 expansion districts.
 * Keeps all prior save coordinates, stations, collectible indexes and building IDs.
 * Adds low-poly scenery via the existing MeshBuilder; no new 3D engine or assets.
 */
(()=>{
'use strict';
const E=window.KomorebiExpansion,S=window.KomorebiSeaLine;
if(!E||!S)throw Error('Both island modules must load before world-expansion-v23.js');
if(E.extendedDistricts)return;
const homeBounds={x:-2.6,z:0,rx:23.3,rz:19.8};
const cityPlaces=[
 {id:'cityTower',x:65.1,z:-6.1,r:2,icon:'🏙️',name:'みなと高層街区'},
 {id:'cityHomes',x:42.3,z:-7.1,r:2,icon:'🏘️',name:'新しい住宅街'},
 {id:'cityLibrary',x:58.5,z:-11.6,r:2,icon:'📚',name:'みなと市民センター'},
 {id:'cityPark',x:43.5,z:7.7,r:2.5,icon:'🌳',name:'海風公園'},
 {id:'cityMarina',x:68.0,z:-.3,r:2.1,icon:'⛵',name:'マリーナ広場'}
];
const homePlaces=[
 {id:'westVillage',x:-21.1,z:-2.25,r:2.25,icon:'🏘️',name:'こもれび西町'},
 {id:'westResidences',x:-18.0,z:11.7,r:2.2,icon:'🏡',name:'丘の住宅街'},
 {id:'hillPark',x:-12.4,z:15.3,r:2.2,icon:'🌲',name:'見晴らし公園'}
];
S.places.push(...cityPlaces);E.places.push(...homePlaces);
E.grass.splice(0,2,homeBounds.rx,homeBounds.rz);
E.sand.splice(0,2,24.4,20.9);
E.landCenter={x:homeBounds.x,z:homeBounds.z};
E.extendedDistricts=true;
const homeBlockers=[
 {x:-21.1,z:-5.0,w:4.7,d:3.9},
 {x:-18.0,z:9.3,w:5.7,d:4.2}
];
const cityBlockers=[
 {x:65.1,z:-9.8,w:5.8,d:4.8},
 {x:42.3,z:-10.8,w:6.25,d:4.85},
 {x:58.5,z:-15.5,w:6.85,d:5.1}
];
function withinBlock(x,z,a,buffer=.18){
 return Math.abs(x-a.x)<a.w/2+buffer&&Math.abs(z-a.z)<a.d/2+buffer;
}
const previousHomeWalk=E.canWalk,previousCityWalk=S.walkable;
E.canWalk=(x,z)=>{
 if(previousHomeWalk(x,z))return true;
 // Existing buildings, creek and village barriers must never be bypassed.
 if(x*x/(20.15*20.15)+z*z/(16.1*16.1)<=1)return false;
 const qx=(x-homeBounds.x)/22.80,qz=(z-homeBounds.z)/19.28;
 if(qx*qx+qz*qz>=1)return false;
 for(const box of homeBlockers)if(withinBlock(x,z,box))return false;
 return true;
};
S.walkable=(x,z)=>{
 if(!previousCityWalk(x,z))return false;
 if(cityBlockers.some(b=>withinBlock(x,z,b)))return false;
 if(Math.hypot(x-43.7,z-7.5)<1.05)return false;
 return true;
};
function path(b,ax,az,bx,bz,w,col='#ead9ba'){
 const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz)||1;
 const x=-dz/len*w*.5,z=dx/len*w*.5;
 b.quad([ax+x,.065,az+z],[bx+x,.065,bz+z],[bx-x,.065,bz-z],[ax-x,.065,az-z],col);
}
function tree(b,x,z,f=1){
 b.cylinder(x,.65*f,z,.15*f,1.3*f,6,'#967b5e');
 b.sphere(x,1.82*f,z,.77*f,.94*f,.79*f,'#7ebd82',5,7);
 b.sphere(x+.32*f,2.0*f,z-.2*f,.52*f,.54*f,.51*f,'#a1d5a2',4,6);
}
function house(b,x,z,width,height,depth,roof,wall){
 b.box(x,height/2+.05,z,width,height,depth,wall);
 b.roof(x,height+.11,z,width+.18,depth+.18,1.02,roof);
 // Front door sized to the avatar, with stacked 1.5–1.8-unit stories.
 b.box(x,1.06,z+depth/2+.075,.88,1.88,.13,'#a1876b');
 const levels=Math.max(1,Math.floor((height-.7)/1.73));
 for(let i=0;i<levels;i++){
  const y=1.25+i*1.73;
  for(const dx of[-width*.31,width*.31]){
   b.box(x+dx,y,z+depth/2+.10,.88,1.10,.13,'#faf4dd');
   b.box(x+dx,y,z+depth/2+.185,.65,.85,.075,'#8fc8d2');
  }
 }
}
const oldHomeGround=E.ground;
E.ground=b=>{
 oldHomeGround(b);
 // Westward and northward pedestrian networks connect new development to old village.
 for(const [a,c] of [
  [[-13,-4],[-21,-2.35]],[[-16.2,3.4],[-18,11.9]],
  [[-18,11.9],[-12.5,15.3]],[[-12,9.2],[-18,11.7]],
  [[-10.1,-12.3],[-18.3,-11.8]]
 ])path(b,a[0],a[1],c[0],c[1],1.65,'#ecd6ab');
 b.ellipseDisc(-12.4,.075,15.3,2.55,2.0,'#e7dbb4',20);
 b.ellipseDisc(-12.4,.081,15.3,1.80,1.35,'#add29c',20);
};
const oldHomeObjects=E.objects;
E.objects=b=>{
 oldHomeObjects(b);
 // Six and eight metre buildings stand several times taller than the avatar.
 house(b,-21.1,-5.0,4.70,5.95,3.86,'#d4a17f','#eed7b4');
 house(b,-18.0,9.3,5.70,8.25,4.20,'#93b7b5','#e4e2d3');
 for(const [x,z] of [[-23,-9.0],[-22,1.1],[-19.8,4.2],[-22.6,8.7],
                       [-14.5,14.3],[-10.5,17.3],[-6.8,17],[-19,-13.8],
                       [-12.7,-17.2],[-4,-17.0]]){
  if((x-homeBounds.x)**2/23.3**2+z*z/19.8**2<.93)tree(b,x,z,.8+(Math.abs(x)*.035)% .32);
 }
 // Village fountain and seating; all placed away from the old collectible trees.
 b.ellipseDisc(-21,.10,-.36,1.18,.93,'#e4d6b9',18);
 b.ellipseDisc(-21,.13,-.36,.80,.65,'#81bfcb',18);
 for(const [x,z] of [[-22.4,1],[-19.8,-.5],[-11.2,15.3]]){
  b.box(x,.48,z,1.42,.18,.44,'#be966d');
  for(const off of[-.52,.52])b.box(x+off,.27,z,.11,.43,.31,'#967758');
 }
};
const oldCityTerrain=S.drawTerrain;
S.drawTerrain=b=>{
 oldCityTerrain(b);
 for(const [a,c] of [
  [[46.7,-1.1],[42.3,-7.2]],[[42.3,-7.2],[40.9,-9.2]],
  [[51.7,-7.6],[58.5,-11.7]],[[58.5,-11.7],[58.5,-12.9]],
  [[58.5,-5.8],[65.1,-6.1]],[[65.1,-6.1],[68.1,-.3]],
  [[43.5,7.7],[47.3,2.3]],[[63.6,7.2],[60.7,1.8]]
 ])path(b,a[0],a[1],c[0],c[1],2.5,'#e7dac4');
 b.ellipseDisc(65.1,.071,-6.05,3.22,2.12,'#e8dcbd',24);
 b.ellipseDisc(42.3,.069,-7.18,3.5,1.35,'#e8dcbd',24);
};
function cityTower(b){
 const x=65.1,z=-9.8;
 b.box(x,7.76,z,5.8,15.40,4.76,'#b5ccd9');
 b.box(x,15.58,z,6.08,.23,5.01,'#f0f0e9');
 b.box(x,16.05,z,2.5,.82,2.1,'#8cb0b8');
 b.box(x,16.95,z,.15,1.7,.14,'#f0bf6e');
 for(let f=0;f<10;f++){
  const y=2.46+f*1.29;
  b.box(x,y,z+2.395,5.38,.93,.115,f%2?'#85b4c4':'#9bcbd5');
  b.box(x,y+.50,z+2.46,5.6,.08,.12,'#f2f1e9');
  for(let j=0;j<5;j++)b.box(x-2.14+j*1.07,y,z+2.50,.055,.89,.08,'#f4efe5');
 }
 for(const dx of[-2.83,2.83])b.box(x+dx,7.88,z+2.46,.12,14.90,.15,'#e8e2d7');
 b.box(x,1.15,z+2.52,2.08,2.2,.14,'#cee2df');
 b.box(x,.14,z+3.12,5.2,.16,1.76,'#d8c8ab');
}
function cityHomes(b){
 const x=42.3,z=-10.8;
 b.box(x,5.91,z,6.24,11.74,4.64,'#e8dfd5');
 b.box(x,11.89,z,6.59,.24,4.92,'#bad1ce');
 for(let f=0;f<6;f++){
  const y=1.32+f*1.74;
  for(let j=0;j<4;j++){
   const xx=x-2.25+j*1.5;
   b.box(xx,y,z+2.34,1.05,1.14,.09,'#f9f1dc');
   b.box(xx,y,z+2.41,.80,.89,.08,'#87bbc8');
   b.box(xx,y-.60,z+2.74,1.28,.12,.78,'#c6d4ca');
   b.box(xx,y-.29,z+3.1,1.28,.45,.05,'#b4c9c4');
  }
 }
 b.box(x,.14,z+3.32,6.2,.15,1.5,'#e9d5b5');
}
function civicCenter(b){
 const x=58.5,z=-15.5;
 b.box(x,3.62,z,6.78,7.16,4.96,'#dfe4dd');
 b.box(x,7.28,z,7.14,.25,5.23,'#92c2c9');
 for(let f=0;f<3;f++)for(let j=0;j<5;j++){
  b.box(x-2.64+j*1.32,1.31+f*2.1,z+2.56,1.02,1.50,.08,'#9bcad2');
 }
 b.box(x,1.16,z+2.61,1.72,2.2,.16,'#bccdc9');
 b.box(x,.13,z+3.30,7.2,.17,1.56,'#e1d3b9');
}
function cityPark(b){
 b.ellipseDisc(43.5,.08,7.5,4.15,3.47,'#d9ddb8',28);
 b.ellipseDisc(43.5,.086,7.5,3.64,2.94,'#91cf99',28);
 b.ellipseDisc(43.7,.093,7.5,1.20,.95,'#77bcc8',22);
 b.ellipseDisc(43.7,.10,7.5,.75,.60,'#b8e0df',18);
 for(const [x,z] of [[41.5,7.5],[46.0,8.9],[44.0,4.9],[46.4,5.8]])
  tree(b,x,z,.79);
 for(const [x,z] of [[41.5,5.5],[45.5,9.4],[42.7,10.1]]){
  b.box(x,.45,z,1.45,.16,.48,'#bf9970');
  for(const q of[-.49,.49])b.box(x+q,.25,z,.12,.41,.32,'#947a60');
 }
}
function cityMarina(b){
 const x=68,z=-1.8;
 b.box(x,.11,z,5.90,.19,3.1,'#c6a581');
 for(let j=0;j<9;j++)b.box(x-2.4+j*.6,.23,z,.065,.05,2.9,'#e3c39f');
 for(const xx of[x-2.6,x+2.6])for(const zz of[z-1.3,z+1.3])
  b.cylinder(xx,.30,zz,.11,.62,6,'#92795f');
 for(const xx of[x-2.1,x+2.1]){
  b.cylinder(xx,1.18,z-1.25,.085,2.30,6,'#82a5a4');
  b.sphere(xx,2.43,z-1.25,.19,.19,.19,'#fff1b5',5,6);
 }
}
const oldCityStatic=S.drawStatic;
S.drawStatic=b=>{
 oldCityStatic(b);
 cityTower(b);cityHomes(b);civicCenter(b);cityPark(b);cityMarina(b);
 // Peripheral low-poly greenery gives the enlarged island genuine districts and depth.
 for(const [x,z] of [[36,-5],[37,1.5],[39,8],[47,10],[53,9],[56,8.3],
                       [69,-4.8],[64,-15],[59,-17.1],[46,-14.5],[39,-12],
                       [62,-1.4],[68,2.5]]){
  if(S.isCommercial(x,z)&&S.walkable(x,z))tree(b,x,z,.65+(Math.abs(x)*.17)% .4);
 }
};
window.KomorebiWorldExpansion={
 homeBounds,cityPlaces,homePlaces,cityBlockers,homeBlockers,
 areas:{oldCity:Math.PI*12.1*9.9,newCity:Math.PI*S.RADII.x*S.RADII.z},
}
})();
