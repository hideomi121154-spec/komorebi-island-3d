import { chromium } from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
fs.mkdirSync('test-artifacts',{recursive:true});
let failed=false;
for(const [label,path,night] of [['race-day','kart-next.html?preview=1',false],['race-night','kart-next.html?preview=1',true],['ai-night','kart-next.html?preview=watch',true],['island-night','index.html',true]]){
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,timezoneId:'Asia/Tokyo'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
 await page.clock.setFixedTime(new Date(night?'2026-11-26T12:00:00Z':'2026-11-26T03:00:00Z'));
 await page.goto('http://127.0.0.1:8765/'+path,{waitUntil:'load',timeout:60000});
 if(label.startsWith('island'))await page.waitForFunction(()=>!!window.__komorebiTest,{timeout:30000});
 else await page.waitForFunction(()=>document.documentElement.dataset.kart3d==='running',{timeout:30000});
 await page.waitForTimeout(2500);
 const canvas=await page.locator(label.startsWith('island')?'canvas':'#raceCanvas').first().boundingBox();
 if(!canvas||canvas.width<100||canvas.height<100)throw Error('Canvas not visible');
 }catch(e){errors.push(e.message);}
 await page.screenshot({path:'test-artifacts/'+label+'.png'}).catch(()=>{});
 fs.writeFileSync('test-artifacts/'+label+'.json',JSON.stringify({label,errors},null,2));
 if(errors.length){failed=true;console.error(label,errors);}else console.log(label,'PASS');
 await page.close();
}
await browser.close();if(failed)process.exitCode=1;
