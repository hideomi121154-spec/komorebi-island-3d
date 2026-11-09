/* Komorebi Island: 3D watering can, pouring droplets and soil splashes.
   The main game owns watering state. Draw only; never mutate save data. */
(() => {
'use strict';
function draw(b,now,activity,player,plot){
 if(!activity.active||!plot)return;
 const elapsed=Math.max(0,now-activity.startedAt);
 const phase=Math.min(1,elapsed/activity.duration);
 const pour=Math.min(1,phase*5)*Math.min(1,(1-phase)*6);
 const dx=plot.x-player.x,dz=plot.z-player.z,len=Math.hypot(dx,dz)||1;
 const fx=dx/len,fz=dz/len,rightX=fz,rightZ=-fx;
 // A can is held at the avatar's side and tilts forward as water starts.
 b.setTransform(player.x,0,player.z,Math.atan2(fx,fz));
 const cy=1.20-.20*pour,cz=.20+.13*pour;
 b.cylinder(.48,cy,cz,.25,.37,9,'#5ba89b');
 b.sphere(.48,cy-.15,cz,.24,.11,.23,'#428d81',5,8);
 b.cylinder(.48,cy+.20,cz,.205,.08,9,'#c5e6d0');
 b.box(.48,cy+.25,cz,.20,.055,.15,'#f6e9c8');
 b.box(.76,cy+.06,cz,.08,.39,.085,'#478d7e');
 b.box(.74,cy+.28,cz,.13,.075,.075,'#478d7e');
 b.box(.48,cy-.05,cz+.38,.14,.105,.68,'#7bcbbd');
 b.sphere(.48,cy-.07,cz+.71,.16,.075,.16,'#489988',5,7);
 b.clearTransform();
 if(phase<.14||phase>.95)return;
 const sx=player.x+rightX*.48+fx*(cz+.71);
 const sz=player.z+rightZ*.48+fz*(cz+.71);
 const sy=cy-.12;
 // Separate flowing droplets follow a curved path from spout to the raised bed.
 for(let i=0;i<28;i++){
  const t=((elapsed*.0017+i*.073)%1);
  const ex=plot.x+Math.sin(i*4.6)*.32,ez=plot.z+Math.cos(i*5.5)*.41;
  const x=sx+(ex-sx)*t+Math.sin(i*23.1)*Math.sin(t*Math.PI)*.09;
  const z=sz+(ez-sz)*t;
  const y=sy+(.25-sy)*t+.49*Math.sin(t*Math.PI);
  const radius=.038+.023*(1-t);
  b.sphere(x,y,z,radius,radius*1.35,radius,'#c2effc',4,5);
 }
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,spread=(elapsed*.0032+i*.37)%1;
  b.sphere(plot.x+Math.cos(a)*(.12+.35*spread),.27+Math.sin(spread*Math.PI)*.14,
    plot.z+Math.sin(a)*(.12+.36*spread),.055,.08,.055,'#d9f6ff',4,5);
 }
}
window.KomorebiWatering={draw};
})();