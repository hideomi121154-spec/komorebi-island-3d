import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWallet,readWallet,estimateOdds,makeTicket,placeTicket,settleTicket,selectValid} from '../kart-forecast.mjs';
function storage(){
 const mem=new Map();
 return {getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v)),getMem:()=>mem};
}
const grid=Array.from({length:8},(_,i)=>({number:i+1,name:'R'+(i+1),speed:13.1+i*.41,form:2+i%4}));
test('starter medals are separate, finite and stored only in the browser',()=>{
 const st=storage();assert.equal(readWallet(st).balance,1000);
 st.setItem('komorebi_island_3d_v01','island save untouched');
 const t=makeTicket({id:'t1',grid,type:'win',picks:[3],stake:100,seed:123});
 const w=placeTicket(st,t);
 assert.equal(w.balance,900);
 assert.equal(st.getItem('komorebi_island_3d_v01'),'island save untouched');
 assert.throws(()=>placeTicket(st,t),/登録済み/);
});
test('all ticket types have sound odds and reject repeated racing numbers',()=>{
 for(const [type,picks] of [['win',[3]],['place',[3]],['exacta',[2,3]],['trifecta',[2,3,4]]]){
  const odds=estimateOdds(grid,type,picks);
  assert.ok(odds>=1.05&&odds<=150);
  assert.ok(selectValid(type,picks));
 }
 assert.equal(selectValid('exacta',[2,2]),false);
 assert.equal(selectValid('trifecta',[1,1,2]),false);
 assert.equal(selectValid('win',[0]),false);
 assert.equal(selectValid('unknown',[1]),false);
 assert.throws(()=>makeTicket({id:'x',grid,type:'win',picks:[1],stake:500,seed:1}),/0〜200枚/);
});
test('settlement matches actual 8-car finish order and pays at most once',()=>{
 const st=storage();
 const ticket=makeTicket({id:'win3',grid,type:'win',picks:[3],stake:50,seed:5});
 placeTicket(st,ticket);
 const paid=settleTicket(st,'win3',[3,2,5,1,4,6,8,7]);
 assert.equal(paid.ticket.hit,true);
 assert.equal(paid.ticket.payout,Math.floor(50*ticket.odds));
 assert.equal(paid.wallet.balance,950+paid.ticket.payout);
 const replay=settleTicket(st,'win3',[3,2,5,1,4,6,8,7]);
 assert.equal(replay.wallet.balance,paid.wallet.balance,'no duplicate payout');
 assert.equal(replay.ticket.status,'settled');
});
test('place includes top three, exacta and trifecta require exact finish order',()=>{
 const order=[4,1,3,2,7,5,6,8];
 const cases=[
  ['place',[3],true],['place',[2],false],
  ['exacta',[4,1],true],['exacta',[1,4],false],
  ['trifecta',[4,1,3],true],['trifecta',[4,3,1],false]
 ];
 for(const [type,picks,expected] of cases){
  const st=storage(),t=makeTicket({id:'pick-'+type+'-'+picks,grid,type,picks,stake:10,seed:88});
  placeTicket(st,t);const value=settleTicket(st,t.id,order);
  assert.equal(value.ticket.hit,expected);
 }
});
test('invalid finishing order cannot settle a pending entry',()=>{
 const st=storage(),t=makeTicket({id:'pending',grid,type:'win',picks:[1],stake:10,seed:9});
 placeTicket(st,t);
 assert.throws(()=>settleTicket(st,'pending',[1,1,2,3,4,5,6,7]),/正式な着順/);
 assert.equal(readWallet(st).balance,990);
 assert.equal(readWallet(st).history[0].status,'pending');
});
