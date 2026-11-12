import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=p=>readFileSync(resolve(root,p),'utf8');
function load(){
 const context={window:{}};
 for(const file of ['expansion3d.js','sealine3d.js','world-expansion-v23.js'])
  new Script(src(file),{filename:file}).runInNewContext(context);
 return context.window;
}
function mesh(){
 const record={invalid:0,calls:0,boxes:[],walls:[]};
 for(const kind of ['box','roof','cylinder','sphere','ellipseDisc','quad','tri']){
  record[kind]=(...args)=>{
   record.calls++;
   if(kind==='box')record.boxes.push(args);
   for(const v of args)for(const n of Array.isArray(v)?v:[v])
    if(typeof n==='number'&&!Number.isFinite(n))record.invalid++;
  };
 }
 record.setTransform=()=>{};
 record.clearTransform=()=>{};
 return record;
}
const close=(a,b,eps=.08)=>Math.abs(a-b)<=eps;

test('city is nearly three times the original playable area, not just camera zoom',()=>{
 const {KomorebiSeaLine:S,KomorebiExpansion:E}=load();
 const ratio=(S.RADII.x*S.RADII.z)/(12.1*9.9);
 assert.ok(ratio>2.80&&ratio<2.90);
 assert.ok(E.grass[0]>23&&E.grass[1]>=19.8);
 assert.equal(E.landCenter.x,-2.6);
 assert.equal(S.isCommercial(0,0),false,'two islands remain separate');
 assert.equal(S.isCommercial(S.stations[1].x,S.stations[1].z),true);
 assert.equal(S.isCommercial(73.1,-4.2),false,'outer ocean is not walkable');
 assert.equal(S.walkable(75,-4),false,'original ocean boundary test remains true');
});

test('existing stations, interactable stores and saved collection indexes remain intact',()=>{
 const {KomorebiSeaLine:S,KomorebiExpansion:E}=load();
 assert.deepEqual(S.stations.map(x=>x.id),['seaStationHome','seaStationCity']);
 assert.equal(S.nearestStation(17.4,2.85).id,'seaStationHome');
 assert.equal(S.nearestStation(44.4,-1.25).id,'seaStationCity');
 assert.equal(S.places.length,12);
 assert.equal(E.places.length,7);
 assert.equal(new Set(S.places.map(x=>x.id)).size,12);
 assert.equal(new Set(E.places.map(x=>x.id)).size,7);
 assert.equal(S.places.find(x=>x.id==='cityCafe').x,59);
 assert.ok(E.canWalk(-24,0),'new west land is walkable');
 assert.ok(E.canWalk(-21.1,-2.25),'west village entrance is accessible');
 assert.ok(E.canWalk(-18,11.7),'residential entrance is accessible');
 assert.equal(E.canWalk(9.5,-9.3),false,'old cottage wall remains solid');
 assert.equal(E.canWalk(-21.1,-5),false,'new house wall is solid');
});

test('new city districts are connected and buildings cannot be walked through',()=>{
 const {KomorebiSeaLine:S}=load();
 assert.equal(S.walkable(46,-4),true,'existing road preserved');
 assert.equal(S.walkable(52.3,-4.7),false,'mall collision preserved');
 for(const [x,z] of [[65.1,-9.8],[42.3,-10.8],[58.5,-15.5]])
  assert.equal(S.walkable(x,z),false,'new buildings are solid');
 for(const [x,z] of [[65.1,-6.1],[42.3,-7.1],[58.5,-11.6],[45,9.1],[68,-.3]])
  assert.equal(S.walkable(x,z),true,'district entrance is reachable');
});

test('larger buildings and ferris wheel use proportions consistent with the player',()=>{
 const {KomorebiSeaLine:S,KomorebiExpansion:E}=load(),b=mesh();
 E.ground(b);E.objects(b);
 S.drawTerrain(b);S.drawStatic(b);
 assert.equal(b.invalid,0);
 assert.ok(b.calls>900);
 const findHeight=(x,z,height)=>b.boxes.some(p=>close(p[0],x)&&close(p[2],z)&&close(p[4],height));
 assert.ok(findHeight(65.1,-9.8,15.40),'high-rise tower ~7x player height');
 assert.ok(findHeight(42.3,-10.8,11.74),'residential buildings are multi-storey');
 assert.ok(findHeight(58.5,-15.5,7.16),'public building is larger than a house');
 assert.ok(findHeight(51.6,-10.2,9.26),'old hotel has realistic floor heights');
 assert.ok(findHeight(58.3,-8.2,12.20),'old office has full height');
 assert.ok(findHeight(-21.1,-5.0,5.95),'western home district built');
});

test('new district modules run before game and preserve save model',()=>{
 const html=src('index.html'),game=src('game.js');
 const island=html.indexOf('src="sealine3d.js');
 const extension=html.indexOf('src="world-expansion-v23.js');
 const engine=html.indexOf('src="game.js');
 assert.ok(island>0&&extension>island&&engine>extension);
 assert.match(game,/EXPANSION\.landCenter\?\.x/);
 assert.match(game,/westVillage/);
 assert.match(game,/cityTower/);
 assert.match(game,/S[EA]{2}\.drawStatic\(b\)/);
 assert.match(game,/state\.currentIsland/);
 assert.match(game,/version:1/,'save format remains unchanged');
});

test('world positions and maps are all finite after the expansion',()=>{
 const {KomorebiSeaLine:S,KomorebiExpansion:E}=load();
 const m=mesh();
 S.drawDynamic(m,5000,{active:true,progress:.3});
 assert.equal(m.invalid,0);
 const mapState={x:65.1,z:-6.1};
 let textCount=0;
 const context=new Proxy({},{
  get(_t,k){return k==='fillText'?()=>textCount++:()=>{}},
  set(){return true}
 });
 S.paintMap({width:520,height:420,getContext:()=>context},mapState);
 assert.ok(textCount>=15);
});
