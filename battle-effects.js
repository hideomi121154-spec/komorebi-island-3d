/* Original cinematic battle lighting over the 3D island scene.
   Reference timing: charge -> launched energy -> flash/impact -> enemy reply. */
(()=>{
'use strict';
const PI=Math.PI,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
const palettes={
 thunder:['#fff9cf','#ffc832','#9eeeff'],quick:['#ffffff','#8fdff7','#ceffff'],
 burst:['#ffffd5','#fbd16b','#a0faf5'],rest:['#e0fff0','#58dca5','#eaffc9'],
 item:['#e0fff0','#58dca5','#eaffc9'],friend:['#dffaff','#85aceb','#ffffff']
};
const create=(id,at=0,reduce=false)=>({id,at,duration:reduce?900:(['friend','rest','item'].includes(id)?1950:3400)});
const fraction=(s,now)=>s?clamp((now-s.at)/s.duration):1;
const active=(s,now)=>!!s&&now-s.at<s.duration;
function phase(s,now){const t=fraction(s,now);return t<.24?'charge':t<.51?'travel':t<.73?'impact':t<.92?'counter':'settle';}
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
function project(world,camera,w,h){
 const f=unit(sub(camera.center,camera.eye)),r=unit(cross(f,[0,1,0])),u=cross(r,f);
 const d=sub(world,camera.eye),depth=Math.max(.5,dot(f,d));
 const v=1/Math.tan((camera.fov||46)*PI/360);
 return {x:w*(.5+.5*dot(d,r)*v/(depth*w/h)),y:h*(.5-.5*dot(d,u)*v/depth)};
}
function rgba(hex,a){
 const s=hex.replace('#','');
 return 'rgba('+parseInt(s.slice(0,2),16)+','+parseInt(s.slice(2,4),16)+','+parseInt(s.slice(4,6),16)+','+clamp(a)+')';
}
function glow(c,x,y,r,col,opacity=1){
 if(r<=0)return;
 const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,rgba('#ffffff',opacity*.93));
 g.addColorStop(.15,rgba(col,opacity*.78));
 g.addColorStop(.46,rgba(col,opacity*.35));
 g.addColorStop(1,rgba(col,0));
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,PI*2);c.fill();
}
function ring(c,p,r,col,a=1,w=3){
 if(r<=0)return;
 c.beginPath();c.arc(p.x,p.y,r,0,2*PI);
 c.strokeStyle=rgba(col,a);c.lineWidth=w;c.shadowBlur=22;c.shadowColor=col;c.stroke();c.shadowBlur=0;
}
function spark(c,x,y,r,col,a=1,rot=0){
 c.fillStyle=rgba(col,a);c.beginPath();
 for(let i=0;i<8;i++){
  const ang=rot+i*PI/4,len=i%2?r*.18:r,px=x+Math.cos(ang)*len,py=y+Math.sin(ang)*len;
  i?c.lineTo(px,py):c.moveTo(px,py);
 }
 c.closePath();c.fill();
}
function sparks(c,p,r,t,cols,n=25){
 for(let i=0;i<n;i++){
  const ang=i*2.39996+t*5,dist=r*(.24+(i%7)*.115);
  const x=p.x+Math.cos(ang)*dist,y=p.y+Math.sin(ang)*dist*.83;
  spark(c,x,y,4+(i%4)*2,i%3?cols[0]:cols[2],.46+(i%5)*.08,t+i);
 }
}
function bolt(c,a,b,seed,width,col,alpha=1){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
 const nx=-dy/len,ny=dx/len,pts=[];
 for(let i=0;i<=12;i++){
  const t=i/12,j=i===0||i===12?0:(Math.sin(seed*3.1+i*9.78)+.43*Math.sin(seed*5.2+i*4.26))*Math.min(21,len*.095);
  pts.push([lerp(a.x,b.x,t)+nx*j,lerp(a.y,b.y,t)+ny*j]);
 }
 c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(...p));
 c.lineJoin='round';c.lineCap='round';c.shadowColor=col;c.shadowBlur=34;c.lineWidth=width*3;c.strokeStyle=rgba(col,alpha*.65);c.stroke();
 c.shadowBlur=14;c.lineWidth=width;c.strokeStyle=rgba('#fffefa',alpha);c.stroke();c.shadowBlur=0;
 for(let i=3;i<11;i+=3){const p=pts[i];c.strokeStyle=rgba('#bcf5ff',alpha*.6);c.lineWidth=1.5;
  c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[0]+nx*31*Math.sin(seed+i),p[1]+ny*30*Math.sin(seed+i));c.stroke();}
}
function charge(c,p,t,colors){
 const radius=65+40*t;
 glow(c,p.x,p.y,radius*1.65,colors[1],.94);
 for(let i=0;i<4;i++)ring(c,p,radius*(.42+i*.2),colors[i%2?2:0],.4+.2*Math.sin(t*8+i),2.5);
 sparks(c,p,85,t,colors,27);spark(c,p.x,p.y,23+15*t,'#ffffff',1,t*7);
}
function ball(c,p,col,scale=1){
 glow(c,p.x,p.y,85*scale,col,.97);
 ring(c,p,24*scale,'#ffffff',.92,4);
 spark(c,p.x,p.y,19*scale,'#ffffff',1);
}
function projectile(c,a,b,t,id,colors){
 const p={x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)-12*Math.sin(PI*t)};
 if(id==='thunder'){
  for(let i=0;i<5;i++)bolt(c,{x:a.x,y:a.y+(i-2)*13},{x:p.x,y:p.y+(i-2)*9},i*8+Math.floor(t*19),3+i%2,colors[1],.85);
  ball(c,p,colors[1],1.1);
 }else if(id==='quick'){
  for(let i=0;i<11;i++){
   c.strokeStyle=rgba(i%2?colors[2]:'#ffffff',.72);
   c.shadowBlur=17;c.shadowColor=colors[1];c.lineWidth=2+i%3;c.beginPath();
   c.moveTo(p.x-160-i*12,p.y+(i-5)*13);
   c.lineTo(p.x+45,p.y+(i-5)*3);c.stroke();
  }c.shadowBlur=0;ball(c,p,colors[1],.85);
 }else{
  for(let i=0;i<11;i++){
   const angle=i*2*PI/11+t*6;
   spark(c,p.x+Math.cos(angle)*48,p.y+Math.sin(angle)*40,9,colors[i%2?0:2],.96,angle);
  }ball(c,p,colors[1],1.15);
 }
}
function burst(c,p,t,colors,intensity=1){
 const strength=(1-t)*intensity;
 glow(c,p.x,p.y,215+90*t,colors[1],strength);
 glow(c,p.x,p.y,95+40*t,colors[2],strength*.95);
 for(let i=0;i<28;i++){
  const a=i*2*PI/28+t*.34,inner=16+12*t,outer=(105+155*t)*(.66+(i%5)*.105);
  c.strokeStyle=rgba(i%4===0?'#ffffff':colors[0],strength*.92);
  c.lineWidth=i%3===0?5:2;c.beginPath();
  c.moveTo(p.x+Math.cos(a)*inner,p.y+Math.sin(a)*inner);
  c.lineTo(p.x+Math.cos(a)*outer,p.y+Math.sin(a)*outer);c.stroke();
 }
 for(let i=0;i<4;i++)ring(c,p,35+i*30+165*t,colors[i%2?2:0],strength*(1-i*.13),2.5+i);
 sparks(c,p,140+100*t,t,colors,45);
}
function leaves(c,a,b,t,scale=1){
 const p={x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)},r=55*scale;
 glow(c,p.x,p.y,95*scale,'#68ecab',.88);
 for(let i=0;i<12;i++){
  const angle=i*2*PI/12+t*5.5,x=p.x+Math.cos(angle)*r,y=p.y+Math.sin(angle)*r*.83;
  c.save();c.translate(x,y);c.rotate(angle+t*5);
  c.fillStyle=rgba(i%2?'#a5f5a5':'#31d89b',.88);
  c.beginPath();c.moveTo(0,-18*scale);c.quadraticCurveTo(14*scale,0,0,18*scale);
  c.quadraticCurveTo(-14*scale,0,0,-18*scale);c.fill();c.restore();
 }
}
function heal(c,p,t,col){
 const power=Math.sin(PI*t)*.8+.18;
 glow(c,p.x,p.y,170,col[1],power);
 for(let i=0;i<24;i++){
  const angle=i*2.399+t*4,r=30+(i%7)*18;
  spark(c,p.x+Math.cos(angle)*r,p.y+Math.sin(angle)*r*.8+50*(1-t),6+i%4*2,col[i%2?0:2],power,angle);
 }
 for(let i=0;i<4;i++)ring(c,p,40+i*17+110*t,col[2],(1-t)*.77,3);
}
function paint(ctx,now,seq,camera,marker,w,h,reduced=false){
 ctx.clearRect(0,0,w,h);
 if(!active(seq,now))return false;
 const t=fraction(seq,now),id=seq.id,col=palettes[id]||palettes.quick;
 const p=project([marker.x-1.88,1.15,marker.z+.55],camera,w,h);
 const q=project([marker.x+1.85,1.23,marker.z+.27],camera,w,h);
 ctx.save();ctx.globalCompositeOperation='screen';
 if(reduced){glow(ctx,p.x,p.y,70,col[1],.55);ring(ctx,p,35,col[2],.6);ctx.restore();return true;}
 if(['rest','item','friend'].includes(id))heal(ctx,p,t,col);
 else if(t<.24)charge(ctx,p,t/.24,col);
 else if(t<.51){const v=ease((t-.24)/.27);charge(ctx,p,1-v,col);projectile(ctx,p,q,v,id,col);}
 else if(t<.73){
  const hit=ease((t-.51)/.22);burst(ctx,q,hit,col);
  if(id==='thunder')for(let i=0;i<6;i++)bolt(ctx,
   {x:q.x+(i-2.5)*23,y:q.y-116},
   {x:q.x+(i-2.5)*15,y:q.y+96},i*13+Math.floor(t*80),3,col[1],(1-hit)*.92);
 }else if(t<.92){
  const v=ease((t-.73)/.19);
  leaves(ctx,q,p,v,.9);
  if(v>.63)burst(ctx,p,(v-.63)/.37,palettes.rest,.32);
 }else glow(ctx,p.x,p.y,42,col[0],(1-t)*.36);
 ctx.restore();return true;
}
window.KomorebiBattleEffects={create,fraction,active,phase,paint,project,palettes};
})();