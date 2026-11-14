/* Komorebi GRAND PRIX: fictional race prediction only.
   No cash, conversion, payments or external wager systems. */
export const WALLET_KEY='komorebi_grandprix_medals_v1';
export const START_MEDALS=1000;
export const TYPES={win:{name:'単勝',count:1},place:{name:'複勝（3着以内）',count:1},exacta:{name:'2連単',count:2},trifecta:{name:'3連単',count:3}};
export function initialWallet(){return {balance:START_MEDALS,history:[],version:1};}
export function readWallet(storage){
 try{
  const x=JSON.parse(storage.getItem(WALLET_KEY)||'null');
  if(x&&x.version===1&&Number.isSafeInteger(x.balance)&&x.balance>=0&&Array.isArray(x.history))
   return {balance:x.balance,history:x.history.slice(-40),version:1};
 }catch{}
 return initialWallet();
}
function writeWallet(storage,w){storage.setItem(WALLET_KEY,JSON.stringify({...w,history:w.history.slice(-40)}));}
export function selectValid(type,picks){
 const rule=TYPES[type];if(!rule||!Array.isArray(picks)||picks.length!==rule.count)return false;
 return picks.every(n=>Number.isInteger(n)&&n>=1&&n<=8)&&new Set(picks).size===picks.length;
}
export function estimateOdds(grid,type,picks){
 if(!selectValid(type,picks)||!Array.isArray(grid)||grid.length!==8)return null;
 const strength=grid.map(p=>Math.exp((p.speed-14.7)*.86+(p.form-3.5)*.12));
 const total=strength.reduce((a,b)=>a+b,0),prob=strength.map(s=>s/total);
 const p=prob[picks[0]-1];
 let chance=p;
 if(type==='place')chance=Math.min(.98,p*2.65);
 if(type==='exacta')chance=p*prob[picks[1]-1]/Math.max(.01,1-p);
 if(type==='trifecta')chance=p*prob[picks[1]-1]/Math.max(.01,1-p)*prob[picks[2]-1]/Math.max(.01,1-p-prob[picks[1]-1]);
 return Math.max(1.05,Math.min(150,Math.round(.90/Math.max(.001,chance)*10)/10));
}
export function makeTicket({id,grid,type,picks,stake,seed}){
 if(!selectValid(type,picks))throw Error('予想する番号が正しくありません');
 if(!Number.isInteger(stake)||stake<0||stake>200)throw Error('メダルは0〜200枚を選んでください');
 const odds=estimateOdds(grid,type,picks);
 if(odds===null)throw Error('出走情報を確認できません');
 return {id:String(id),type,picks:[...picks],stake,odds,seed:Number(seed)>>>0,at:new Date().toISOString(),status:'pending',payout:0,finishOrder:[]};
}
export function placeTicket(storage,ticket){
 const w=readWallet(storage);
 if(!ticket||!Number.isInteger(ticket.stake)||ticket.stake<0||ticket.stake>200||!selectValid(ticket.type,ticket.picks)||!Number.isFinite(ticket.odds)||ticket.odds<1||ticket.odds>150||!ticket.id)throw Error('予想券が正しくありません');
 if(w.history.some(t=>t.id===ticket.id))throw Error('同じ予想は登録済みです');
 if(w.balance<ticket.stake)throw Error('メダルが足りません。0枚なら無料で観戦できます');
 w.balance-=ticket.stake;
 w.history.push({...ticket});
 writeWallet(storage,w);return w;
}
export function settleTicket(storage,id,finishOrder){
 const w=readWallet(storage),i=w.history.findIndex(t=>t.id===id);
 if(i<0)throw Error('精算対象の予想がありません');
 const ticket=w.history[i];
 if(ticket.status==='settled')return {wallet:w,ticket}; // no duplicate payouts
 if(!Array.isArray(finishOrder)||finishOrder.length!==8||new Set(finishOrder).size!==8||finishOrder.some(n=>!Number.isInteger(n)||n<1||n>8))throw Error('正式な着順がありません');
 const a=ticket.picks,match=ticket.type==='win'?finishOrder[0]===a[0]:
 ticket.type==='place'?finishOrder.slice(0,3).includes(a[0]):
 ticket.type==='exacta'?finishOrder[0]===a[0]&&finishOrder[1]===a[1]:
 finishOrder[0]===a[0]&&finishOrder[1]===a[1]&&finishOrder[2]===a[2];
 ticket.status='settled';ticket.hit=match;
 ticket.payout=match?Math.floor(ticket.stake*ticket.odds):0;
 ticket.finishOrder=[...finishOrder];ticket.settledAt=new Date().toISOString();
 w.balance+=ticket.payout;
 writeWallet(storage,w);
 return {wallet:w,ticket};
}
export function ticketLabel(t){return TYPES[t.type].name+' '+t.picks.join('→')+' · '+t.stake+'枚 · ×'+t.odds;}
