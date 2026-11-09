/* Original 3D interiors for Komorebi Island. No external assets. */
(() => {
'use strict';
function interiorWorld(kind,Builder,gameState){
  const b=new Builder(),home=kind==='home';
  // Cutaway room: the near wall and roof are absent, leaving an unobstructed camera.
  b.box(0,-.20,0,10.4,.40,9.5,home?'#d9bc94':'#d7b995');
  b.box(0,.016,0,10.0,.065,9.12,home?'#edd3ae':'#f0dec2');
  for(let i=0;i<13;i++)b.box(-4.7+i*.78,.051,0,.028,.006,9.0,'#d2b28f');
  b.box(0,.065,3.72,2.4,.07,1.55,'#b4b6a2');
  b.box(0,.104,3.72,2.0,.055,1.29,home?'#dd9a89':'#7fb9aa');
  const floorCount=b.vertices.length/9;
  const wall=home?'#f0dfc7':'#f3e4c5',wood=home?'#c7a382':'#c6a278';
  b.box(0,2.07,-4.64,10.4,4.2,.23,wall);
  b.box(-5.14,2.07,0,.25,4.2,9.3,wall);
  b.box(5.14,2.07,0,.25,4.2,9.3,wall);
  b.box(0,.23,-4.43,10,.38,.20,wood);
  b.box(0,3.77,-4.43,10,.18,.2,'#fff3dc');
  for(const x of [-3.25,3.25]){
    b.box(x,2.45,-4.36,1.68,1.46,.10,'#fff4df');
    b.box(x,2.45,-4.25,1.38,1.20,.07,'#badfe6');
    b.box(x,2.45,-4.17,.08,1.2,.06,'#fff1ce');
    b.box(x,2.45,-4.17,1.38,.08,.06,'#fff1ce');
    b.box(x,1.7,-4.23,1.8,.15,.28,wood);
  }
  b.cylinder(0,3.62,-.25,.045,.57,7,'#a38a69');
  b.sphere(0,3.3,-.25,.52,.24,.50,'#fff0b7',6,10);
  if(home){
    // Bed, wardrobe, reading desk, rug, plant and purchased furniture.
    b.box(-3.13,.42,-2.54,2.42,.62,2.49,'#92715d');
    b.box(-3.13,.78,-2.52,2.25,.19,2.37,'#f9eee1');
    b.box(-3.13,.93,-2.96,2.1,.16,1.29,'#e9a3a0');
    b.box(-3.13,.95,-1.75,1.94,.25,.5,'#f9f7e5');
    b.box(-3.13,1.13,-3.7,2.5,.8,.2,'#c19b7b');
    b.box(3.35,1.33,-2.75,1.58,2.58,1.31,'#b68b67');
    b.box(3.35,1.36,-2.07,1.43,2.29,.075,'#cca17a');
    b.sphere(3.7,1.35,-2.02,.065,.065,.065,'#ead3ab',4,6);
    b.box(0,.57,-.92,2.02,.19,1.25,'#ad8768');
    for(const x of[-.83,.83])for(const z of[-1.38,-.47])b.box(x,.30,z,.16,.59,.16,'#8d705c');
    b.box(0,.77,-1.0,.8,.13,.44,'#fff7d6');
    b.ellipseDisc(0,.065,1.15,1.77,1.10,'#e0ada4',24);
    b.ellipseDisc(0,.077,1.15,1.42,.79,'#f6d8bc',24);
    b.cylinder(3.84,.35,1.67,.43,.63,9,'#c99e7f');
    b.sphere(3.84,.94,1.67,.60,.63,.50,'#83bf88',6,9);
    b.sphere(3.4,1.20,1.64,.31,.43,.32,'#79b47b',5,7);
    b.box(-4.44,.82,1.5,.58,1.49,.58,'#b99879');
    if(gameState.houseLevel>=2){
      b.box(2.28,.48,1.85,1.80,.85,1.10,'#dcb38b');
      b.sphere(2.28,.92,1.85,.79,.32,.58,'#abcbbb',5,9);
    }
    if(gameState.furniture>0){
      b.box(1.78,.65,2.45,1.58,.20,.56,'#ba8f6b');
      b.box(1.78,.96,2.18,1.58,.58,.18,'#ba8f6b');
      for(const x of[1.2,2.36])b.box(x,.32,2.43,.14,.58,.15,'#8f765e');
    }
  }else{
    // Store counter, register, produce, seeds and shelves; clerk is rendered dynamically.
    b.box(0,.71,-2.13,4.15,1.22,1.22,'#b38864');
    b.box(0,1.39,-2.13,4.47,.18,1.48,'#e7c18b');
    b.box(.43,1.52,-2.02,.75,.2,.44,'#a4b3ac');
    b.box(.43,1.65,-1.87,.42,.13,.25,'#f7eacb');
    for(const x of[-4.35,4.35]){
      b.box(x,1.64,-2.5,1.16,3.12,2.18,'#a77d60');
      for(const y of[.46,1.25,2.05,2.82])b.box(x,y,-2.5,1.47,.13,2.4,'#cba176');
    }
    for(let i=0;i<5;i++){
      b.sphere(-4.35, .63+(i%3)*.80,-3.10+(i%2)*1.18,.23,.25,.24,i%2?'#f0c67d':'#de8e75',5,8);
      b.sphere(4.35,.63+(i%3)*.80,-3.10+(i%2)*1.18,.22,.22,.22,i%2?'#b3cd8c':'#e6bf85',5,8);
    }
    b.box(-3.03,.45,1.72,1.75,.34,1.18,'#c6a174');
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      b.sphere(-3.03+Math.cos(a)*.57,.71,1.72+Math.sin(a)*.34,.19,.22,.2,'#e18d70',5,7);
    }
    b.box(3,.62,1.7,1.73,.90,1.17,'#96bba4');
    for(let i=0;i<5;i++)b.cylinder(2.51+i*.24,1.13,1.72,.11,.36,6,'#b7c976');
    b.box(0,3.35,-4.33,2.6,.52,.18,'#fff0d0');
    b.box(0,3.38,-4.18,2.17,.35,.07,'#e7a96e');
    b.ellipseDisc(0,.065,1.28,1.48,.74,'#b5d4c1',24);
    b.ellipseDisc(0,.075,1.28,1.13,.53,'#e0deb2',24);
  }
  return {mesh:b.toFloat(),floorCount};
}
window.KomorebiRooms={build:interiorWorld};
})();
