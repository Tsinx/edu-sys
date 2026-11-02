import assert from 'node:assert/strict';
import test from 'node:test';
import {marketModel as M,marketOptimum,menuOutcome,marketReadout,getEconomicMathematicsHistoricalCounts as history} from '@edu/course-content/economic-mathematics';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('menu choice follows individual gains including exit, ties and changed valuation',()=>{
 const o=menuOutcome(99,288);assert.equal(o.ordinary.choice,'慢机');assert.equal(o.urgent.choice,'快机');close(o.profit!,262);close(o.consumerSurplus,13);
 assert.equal(menuOutcome(99,299).urgent.choice,'慢机');close(menuOutcome(99,299).profit!,68);
 assert.equal(menuOutcome(99,288,150).urgent.choice,'慢机');
 assert.equal(menuOutcome(99,289).urgent.choice,'并列，需约定');assert.equal(menuOutcome(99,289).profit,null);
 assert.equal(menuOutcome(150,330).ordinary.choice,'不购买');
 for(let price=0;price<=350;price+=.25)assert.ok(M.uniformProfit(price)<=240);
 const welfare=(120-60)+(300-60);close(welfare,300);close(o.profit!+o.consumerSurplus,275);close(275-240,35);close(300-275,25);
 assert.match(marketReadout('menu',{menuSlowPrice:99,menuFastPrice:289})[2]![1],/未唯一确定/);
});
test('path comparison uses avoidable future totals and has the stated switch threshold',()=>{
 close(M.platformCost(5000),375000);close(M.dedicatedCost(5000),500000);
 close(M.platformCost(20000),1350000);close(M.dedicatedCost(20000),1100000);
 for(const q of[0,5000,10000,20000])close(M.dedicatedCost(q)-M.platformCost(q),250000-25*q);
 for(const sunk of[0,200000,2000000])close((M.dedicatedCost(5000)+sunk)-(M.platformCost(5000)+sunk),125000);
});
test('relative responses, local counterexamples and capacity prices agree with independent arithmetic',()=>{
 close(M.businessQuantity(100),2000);close(M.ordinaryQuantity(100),100);close(M.businessElasticity(100)!, .5);close(M.ordinaryElasticity(100)!,5);
 assert.equal(M.businessElasticity(300),null);assert.equal(M.businessElasticity(0),null);
 for(const p of[60,100,150,180,200,210,280]){
  const q=M.businessQuantity(p),E=M.businessElasticity(p)!;
  close(q*(1-E),3000-20*p);close(p*(1-1/E),M.businessMR(q));
 }
 close((M.businessRevenue(210)-M.businessRevenue(200))/M.businessRevenue(200),-.055);
 const o=marketOptimum();close(o.price,180);close(o.quantity,1200);close(o.profit,124000);
 const cap=marketOptimum(900);close(cap.price,210);close(cap.profit,115000);close(M.businessMR(900),120);
 close(M.businessElasticity(210)!,7/3);close((210-120)/210,1/M.businessElasticity(210)!);
 for(const capacity of[0,300,900,1200,3000])for(const cost of[0,60,80,300]){
  const best=marketOptimum(capacity,cost);
  for(let i=0;i<=600;i++){const q=capacity*i/600,p=300-.1*q;assert.ok(M.businessProfit(p,20000,cost)<=best.profit+1e-7);}
 }
 close(40000000/200**2,1000);close(-80000000/200**3,-10);close(40000000/250**2,640);
 assert.equal(history('release-economic-mathematics-business-2026-10-30')!.reduce((a,b)=>a+b,0),1070);
});
