import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnterprise,executeEnterprise,assertEnterprise,enterpriseHash,enterpriseRecord,restoreEnterprise,makeEnterprisePackage,verifyEnterprisePackage,enterpriseScore,closeFinanceHour,depositPrincipal,payableBalance,GUIDED_FINANCE_PLAN,ENTERPRISE_GUIDED_FINANCE_END,cleanEnterpriseConfig,type EnterpriseState,type EnterpriseCommand} from '../src/enterprise.js';
import {post} from '../src/enterprise-accounting.js';
const act=(s:EnterpriseState,c:EnterpriseCommand)=>{const n=executeEnterprise(s,c,undefined,true);assert.ok(n.journal.at(-1)?.ok,n.journal.at(-1)?.message??'missing result');assertEnterprise(n);return n;};
function tickFinance(s:EnterpriseState,hours:number){for(let n=0;n<hours&&s.finance.status!=='bankrupt'&&!s.finance.tutorialPaused;n++){closeFinanceHour(s);s.hour++;}assertEnterprise(s);return s;}
const drain=()=>act(act(createEnterprise(),{kind:'project',type:'berth-extension',terminalId:'T1'}),{kind:'project',type:'channel-depth',terminalId:'T1'});

test('initial debt has a finite 36-period principal schedule and principal never becomes an expense',()=>{
 const s=createEnterprise(),l=s.finance.loans[0]!;assert.equal(l.balance,20_000_000);assert.equal(l.installments.length,36);assert.equal(l.installments.reduce((n,i)=>n+i.principal,0),20_000_000);
 tickFinance(s,30*24);assert.equal(l.installments[0]!.paid,l.installments[0]!.principal);assert.equal(s.debt,20_000_000-l.installments[0]!.principal);
 assert.equal(s.months.reduce((n,m)=>n+m.principalPaid,0),l.installments[0]!.principal);assert.equal(s.months.reduce((n,m)=>n+m.operating,0),0);
});
test('interest follows actual occupied hours and repayment before a month boundary cannot erase it',()=>{
 let s=act(createEnterprise(),{kind:'loan',amount:5_000_000,product:'working',termMonths:3});tickFinance(s,48);
 const accrued=s.finance.loans.reduce((n,l)=>n+l.accruedInterest,0);assert.ok(Math.abs(accrued-(20_000_000*.065+5_000_000*.075)*48/8760)<2);
 const before=s.cash;s=act(s,{kind:'repay',amount:5_000_000});assert.equal(before-s.cash,5_000_000+accrued);assert.ok(s.months.reduce((n,m)=>n+m.interest,0)>0);
 assert.equal(s.finance.loans.find(l=>l.product==='working')!.balance,0);
});
test('a working loan pays interest every 30 days and principal at the 90-day maturity',()=>{
 let s=act(createEnterprise(),{kind:'loan',amount:5_000_000,product:'working',termMonths:3});tickFinance(s,90*24);
 const l=s.finance.loans.find(l=>l.product==='working')!;assert.equal(l.balance,0);assert.equal(l.installments[0]!.paid,5_000_000);assert.equal(payableBalance(s),0);
});
test('deposits pay only earned own-funds interest at maturity and returning principal is not revenue',()=>{
 let s=act(createEnterprise(),{kind:'finance-plan',patch:{reserveDays:30,depositDays:30,creditLimit:0}});tickFinance(s,24);assert.ok(depositPrincipal(s)>0);
 const d=s.finance.deposits[0]!;assert.equal(d.opened,24);assert.equal(d.matures,744);assert.equal(d.interest,0);
 tickFinance(s,720);assert.ok(s.finance.depositInterest>0);assert.ok(s.ledger.some(e=>e.note==='定存到期收回本金'&&e.amount===0&&e.cash>0));
 assert.equal(s.months.reduce((n,m)=>n+m.interestIncome,0),s.finance.depositInterest+s.finance.demandInterest);
});
test('early redemption returns exactly principal and forfeits unposted interest without inventing a loss expense',()=>{
 let s=act(createEnterprise(),{kind:'finance-plan',patch:{reserveDays:15,depositDays:90,creditLimit:0}});tickFinance(s,48);const principal=depositPrincipal(s),cash=s.cash,income=s.months.reduce((n,m)=>n+m.revenue,0);assert.ok(s.finance.deposits.some(d=>d.interest>0));
 s=act(s,{kind:'redeem-deposits'});assert.equal(s.cash-cash,principal);assert.equal(depositPrincipal(s),0);assert.equal(s.months.reduce((n,m)=>n+m.revenue,0),income);assert.ok(s.finance.forfeitedInterest>0);
});
test('borrowing cannot increase eligible deposit earnings and loan cost exceeds deposit return',()=>{
 const plan={reserveDays:30,depositDays:30,creditLimit:0} as const;
 const a=act(createEnterprise(),{kind:'finance-plan',patch:plan});let b=act(createEnterprise(),{kind:'loan',amount:5_000_000});b=act(b,{kind:'finance-plan',patch:plan});tickFinance(a,744);tickFinance(b,744);
 assert.ok(b.finance.depositInterest<=a.finance.depositInterest);assert.ok(b.cash+depositPrincipal(b)-b.debt<a.cash+depositPrincipal(a)-a.debt);
 const hash=enterpriseHash(a),rejected=executeEnterprise(a,{kind:'loan',amount:100000});assert.equal(rejected.journal.at(-1)!.ok,false);assert.equal(enterpriseHash(rejected),hash);
});
test('exhausted cash creates explicit payables, halts unpaid production, and terminates at the finite grace deadline',()=>{
 let s=drain();assert.equal(s.cash,0);s=act(s,{kind:'advance',hours:48,stopOnIncident:false});assert.equal(s.cash,0);assert.ok(payableBalance(s)>0);assert.equal(s.finance.status,'distress');
 s=act(s,{kind:'advance',hours:24*30,stopOnIncident:false});assert.equal(s.finance.status,'bankrupt');assert.equal(s.hour,14*24);assert.equal(s.cash,0);assert.equal(enterpriseScore(s).outcome,'bankrupt');
 const hash=enterpriseHash(s);const rejected=executeEnterprise(s,{kind:'advance',hours:1},undefined,true);assert.equal(rejected.journal.at(-1)!.ok,false);assert.equal(enterpriseHash(rejected),hash);
 s=act(s,{kind:'seal'});const pkg=makeEnterprisePackage(s),checked=verifyEnterprisePackage(pkg);assert.equal(checked.complete,true);assert.equal(checked.result.outcome,'bankrupt');assert.equal(checked.stateHash,enterpriseHash(s));
});
test('paying arrears preserves original expense and recovers cash status without a second charge',()=>{
 let s=act(drain(),{kind:'advance',hours:24,stopOnIncident:false}),owed=payableBalance(s),operating=s.months.reduce((n,m)=>n+m.operating,0);s=act(s,{kind:'loan',amount:5_000_000,product:'working',termMonths:3});s=act(s,{kind:'settle-payables'});
 assert.equal(payableBalance(s),0);assert.equal(s.cash,5_000_000-owed);assert.notEqual(s.finance.status,'distress');assert.equal(s.months.reduce((n,m)=>n+m.operating,0),operating);
});
test('automatic credit has a real cap and cannot keep an insolvent port alive indefinitely',()=>{
 const s=drain();s.finance.plan.creditLimit=5_000_000;post(s,'incident',6_000_000,-6_000_000,'测试一次重大损失');tickFinance(s,1);
 assert.equal(s.finance.loans.filter(l=>l.product==='working').reduce((n,l)=>n+l.original,0),5_000_000);assert.equal(s.cash,0);assert.ok(payableBalance(s)>=1_000_000);
 tickFinance(s,14*24);assert.equal(s.finance.status,'bankrupt');assert.equal(s.debt,25_000_000);
});
test('restructuring preserves principal and past interest, charges a fee, and cannot be repeated',()=>{
 let s=drain();post(s,'incident',100000,-100000,'测试到期缺口');const debt=s.debt;s=act(s,{kind:'restructure'});
 assert.equal(s.debt,debt);assert.equal(s.finance.loans[0]!.rate,.075);assert.ok(payableBalance(s)>=300000);assert.equal(s.finance.restructured,true);
 const hash=enterpriseHash(s),again=executeEnterprise(s,{kind:'restructure'});assert.equal(again.journal.at(-1)!.ok,false);assert.equal(enterpriseHash(again),hash);
});
test('tutorial finances are fixed in core state and remain locked independently of UI metadata until handover',()=>{
 let s=createEnterprise({...createEnterprise().config,tutorial:true});s=act(s,{kind:'finance-plan',patch:{...GUIDED_FINANCE_PLAN}});
 for(const c of [{kind:'loan',amount:100000},{kind:'repay',amount:100000},{kind:'redeem-deposits'},{kind:'restructure'},{kind:'finance-plan',patch:{reserveDays:15,depositDays:90,creditLimit:0}}] as EnterpriseCommand[]){const hash=enterpriseHash(s),r=executeEnterprise(s,c);assert.equal(r.journal.at(-1)!.ok,false);assert.equal(enterpriseHash(r),hash);}
 tickFinance(s,ENTERPRISE_GUIDED_FINANCE_END);assert.equal(s.hour,4344);s=act(s,{kind:'finance-plan',patch:{reserveDays:60,depositDays:0,creditLimit:0}});assert.equal(s.finance.plan.reserveDays,60);
 assert.throws(()=>cleanEnterpriseConfig({...s.config,mode:'exam'}),/固定带教/);
 post(s,'incident',200_000_000,-200_000_000,'交接后的重大经营损失');tickFinance(s,14*24);
 assert.equal(s.finance.status,'bankrupt');assert.equal(s.finance.tutorialPaused,false);assert.equal(s.finance.failedAt,ENTERPRISE_GUIDED_FINANCE_END+14*24);
});
test('tutorial protection pauses instead of granting infinite cash or silently allowing bankruptcy',()=>{
 let s=createEnterprise({...createEnterprise().config,tutorial:true});s=act(s,{kind:'project',type:'berth-extension',terminalId:'T1'});s=act(s,{kind:'project',type:'channel-depth',terminalId:'T1'});post(s,'incident',20_000_000,-20_000_000,'测试超过固定授信的损失');tickFinance(s,14*24);
 assert.equal(s.finance.tutorialPaused,true);assert.equal(s.finance.status,'distress');assert.equal(s.cash,0);assert.ok(s.debt<=25_000_000);
 const r=executeEnterprise(s,{kind:'advance',hours:1},undefined,true);assert.equal(r.hour,s.hour);assert.equal(r.journal.at(-1)!.ok,false);
});
test('finance survives command replay and hour partitioning with exactly matching balances and hash',()=>{
 let a=act(createEnterprise(),{kind:'finance-plan',patch:{reserveDays:30,depositDays:30,creditLimit:5_000_000}}),b=structuredClone(a);a=act(a,{kind:'advance',hours:32*24});for(let n=0;n<32;n++)b=act(b,{kind:'advance',hours:24});
 assert.equal(enterpriseHash(a),enterpriseHash(b));assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(a))),enterpriseHash(a));
});

test('small automatic draws share a single fixed-maturity facility instead of consuming many loan slots',()=>{
 const s=drain();s.finance.plan.creditLimit=5_000_000;
 for(let n=0;n<20;n++){post(s,'incident',100000,-100000,'测试连续经营缺口');tickFinance(s,1);}
 const facilities=s.finance.loans.filter(l=>l.automatic);assert.equal(facilities.length,1);assert.equal(facilities[0]!.original,2_000_000);assert.equal(facilities[0]!.installments[0]!.due,1+90*24);assert.equal(payableBalance(s),0);
});
test('automatic facilities cannot refinance their own matured principal while unused credit remains',()=>{
 let s=act(createEnterprise(),{kind:'repay',amount:20_000_000});s.finance.plan.creditLimit=5_000_000;post(s,'incident',12_100_000,-12_100_000,'测试周转缺口');tickFinance(s,95*24);
 const facilities=s.finance.loans.filter(l=>l.automatic);assert.equal(facilities.length,1);assert.ok(facilities[0]!.balance>0);assert.ok(s.finance.payables.some(p=>p.principal&&p.amount>p.paid));assert.ok(facilities[0]!.original<5_000_000);assert.equal(s.finance.status,'distress');
 tickFinance(s,15*24);assert.equal(s.finance.status,'bankrupt');assert.equal(s.finance.loans.filter(l=>l.automatic).length,1);
});
