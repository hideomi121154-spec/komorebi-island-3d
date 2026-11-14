// Canvas2D illustrated pixel garden. Original art; no copyrighted game sprites.
export const FLOWERS=Object.freeze([
 {x:-12,z:-9},{x:-6,z:-17},{x:6,z:-17},{x:12,z:-9},
 {x:-15,z:4},{x:15,z:5},{x:-7,z:14},{x:7,z:15}
]);
const PALETTE=['#f4a681','#93bdc8','#c4a2da','#9bd0a5','#efc477','#e2b0c3'];
export function createDimension2D(canvas){
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)throw Error('このブラウザは2D描画に対応していません');
 let cw=0,ch=0,dpr=1;
 const tile=30;
 function resize(){
  const w=Math.max(1,canvas.clientWidth||window.innerWidth),h=Math.max(1,canvas.clientHeight||window.innerHeight);
  const px=Math.min(1.5,window.devicePixelRatio||1);
  if(w===cw&&h===ch&&px===dpr)return;
  cw=w;ch=h;dpr=px;canvas.width=Math.round(w*px);canvas.height=Math.round(h*px);
 }
 function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
 function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
 function tree(x,z,index){
  rect(x-6,z-8,12,28,'#9c7859');
  ellipse(x,z-13,24,18,index%2?'#75bd8d':'#80cdaa');
  ellipse(x-9,z-17,15,13,'#b0dfae');
  rect(x-3,z-3,6,6,'#f1c49a');
 }
 function drawHouse(x,z,roof,sign){
  rect(x-58,z-17,116,85,'#fae8c4');
  rect(x-61,z-30,122,21,'#f6f2dd');
  rect(x-64,z-53,128,27,roof);
  rect(x-48,z+5,22,27,'#90d0df');rect(x+24,z+5,22,27,'#90d0df');
  rect(x-14,z+27,28,41,'#a78372');rect(x-10,z+33,20,35,'#caa18a');
  rect(x-44,z-43,88,22,'#fff9e7');
  ctx.textAlign='center';ctx.fillStyle='#466965';ctx.font='bold 12px sans-serif';ctx.fillText(sign,x,z-27);
 }
 function drawPerson(x,z,color,name,time){
  const bob=Math.sin(time*.006+x*.025)*1.6;
  ellipse(x,z+12,13,6,'#3f5c6444');
  rect(x-10,z-8+bob,20,23,PALETTE[color%PALETTE.length]);
  rect(x-10,z+11+bob,8,10,'#566578');rect(x+2,z+11+bob,8,10,'#566578');
  rect(x-13,z-26+bob,26,21,'#f5cbaa');
  rect(x-15,z-30+bob,30,10,PALETTE[color%PALETTE.length]);
  rect(x-6,z-18+bob,3,3,'#273d4a');rect(x+4,z-18+bob,3,3,'#273d4a');
  rect(x-1,z-12+bob,5,2,'#ce8b88');
  ctx.font='bold 11px sans-serif';ctx.textAlign='center';
  const width=Math.max(38,ctx.measureText(name).width+12);
  rect(x-width/2,z-48+bob,width,16,'#fff9e4ee');
  ctx.fillStyle='#295761';ctx.fillText(name,x,z-36+bob);
 }
 function drawFlower(x,z,n,time){
  ellipse(x,z+7,10,4,'#4c7e5733');rect(x-2,z,4,16,'#699c6c');
  for(let k=0;k<5;k++){
   const a=k*Math.PI*2/5+Math.sin(time*.001+n)*.13;
   ellipse(x+Math.cos(a)*8,z-4+Math.sin(a)*8,6,6,['#f4a5cb','#e3beec','#ffdf94','#93d3e7'][n%4]);
  }
  ellipse(x,z-4,4,4,'#fff0a1');
 }
 function render(player,peers,collected,time){
  resize();const w=cw,h=ch;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=false;rect(0,0,w,h,'#b7dbaf');
  ctx.save();ctx.translate(w/2-player.x*tile,h/2-player.z*tile);
  const x0=Math.max(-29,Math.floor(player.x-w/(2*tile))-2),x1=Math.min(29,Math.ceil(player.x+w/(2*tile))+2);
  const z0=Math.max(-23,Math.floor(player.z-h/(2*tile))-2),z1=Math.min(23,Math.ceil(player.z+h/(2*tile))+2);
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
   const px=x*tile,pz=z*tile;
   rect(px,pz,tile,tile,(x+z)%3===0?'#a8d49e':'#afdca6');
   if((x*7+z*13)%11===0)rect(px+7,pz+11,4,4,'#80b78b');
  }
  // Cross-shaped village promenade.
  rect(-3.6*tile,-22*tile,7.2*tile,44*tile,'#f7e7bd');
  rect(-29*tile,-3.3*tile,58*tile,6.6*tile,'#f8eacb');
  rect(-3*tile,-22*tile,6*tile,44*tile,'#ead6af');
  rect(-29*tile,-2.7*tile,58*tile,5.4*tile,'#e9d3ac');
  for(let z=-20;z<20;z+=4)rect(-tile/8,z*tile,7,14,'#fff7d9');
  // Pond and dock.
  ellipse(-18*tile,13*tile,175,132,'#f8eac5');
  ellipse(-18*tile,13*tile,159,116,'#77c8dc');
  ellipse(-18*tile,13*tile,106,70,'#8adbe4');
  rect(-12*tile,10*tile,115,21,'#c8ab82');
  for(let i=0;i<5;i++)rect(-12*tile+i*27,10*tile,5,21,'#b29474');
  for(let i=0;i<3;i++)ellipse((-20+i*2)*tile,12*tile+i*23,11,5,'#e4f8eb');
  drawHouse(-17*tile,-14*tile,'#d7a2c4','ほしのカフェ');
  drawHouse(17*tile,-14*tile,'#8ebacd','えほんのお店');
  for(let i=0;i<16;i++){
   const a=i*Math.PI*2/16,x=Math.cos(a)*23*tile,z=Math.sin(a)*18*tile;
   tree(x,z,i);
  }
  // Glowing portal made from pixels, lined with white stones.
  const gx=0,gz=-13*tile;
  rect(gx-48,gz-61,96,15,'#d5b5ea');rect(gx-53,gz-56,14,93,'#b48dd4');rect(gx+39,gz-56,14,93,'#b48dd4');
  rect(gx-38,gz-41,76,79,'#8fe5e7');
  const shine=Math.sin(time*.004)*.25+.65;
  rect(gx-33,gz-37,66,69,'rgba(193,243,234,'+shine+')');
  rect(gx-50,gz+42,100,18,'#fff5db');
  ctx.textAlign='center';ctx.font='bold 13px sans-serif';ctx.fillStyle='#3b6770';
  ctx.fillText('3D へもどる',gx,gz+55);
  // Little animated star particles, not expensive independent sprites.
  for(let i=0;i<12;i++){
   const x=(i*79%850)-425,z=(i*121%490)-245;
   rect(x,z+Math.sin(time*.002+i)*3,5,5,'#fff1b5');
  }
  for(let i=0;i<FLOWERS.length;i++)if(!collected.has(i))drawFlower(FLOWERS[i].x*tile,FLOWERS[i].z*tile,i,time);
  const users=peers.filter(p=>p.world==='garden2d').map(p=>({...p,me:false})).concat([{...player,me:true}]);
  users.sort((a,b)=>a.z-b.z);
  for(const p of users)drawPerson(p.x*tile,p.z*tile,p.color||0,p.me?'あなた':p.name,time);
  ctx.restore();
  // Retro game frame and contextual description.
  rect(0,0,w,5,'#f6e7b6');rect(0,h-5,w,5,'#f6e7b6');
  const banner='2D PIXEL GARDEN  •  世界の切替は 🚪';
  ctx.fillStyle='#fff8e2de';ctx.fillRect(Math.max(6,w/2-145),Math.max(205,h*.27),Math.min(290,w-12),27);
  ctx.textAlign='center';ctx.font='bold 11px sans-serif';ctx.fillStyle='#3b5e61';
  ctx.fillText(banner,w/2,Math.max(223,h*.27+18));
 }
 return {render,resize};
}
