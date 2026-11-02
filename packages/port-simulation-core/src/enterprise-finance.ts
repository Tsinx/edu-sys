import {ENTERPRISE_GUIDED_FINANCE_END,type EnterpriseState,type EnterpriseFinance,type FinancePlan,type EnterpriseLoan,type EnterprisePayable} from './enterprise-model.js';
import {event,post,queuePayable,liquidateDeposits,money,month} from './enterprise-accounting.js';
import {assetValue} from './enterprise-support.js';
import {assetSpec} from './enterprise-catalogue.js';
export const FINANCE_GRACE_HOURS=14*24;
export const GUIDED_FINANCE_PLAN:FinancePlan={reserveDays:30,depositDays:30,creditLimit:5_000_000};
export const FINANCE_RATES={demand:.003,deposit30:.015,deposit90:.02,project:.065,working:.075,late:.12};
export const guidedFinance=(s:Pick<EnterpriseState,'config'|'hour'>)=>!!s.config.tutorial&&s.hour<ENTERPRISE_GUIDED_FINANCE_END;
export const payableBalance=(s:EnterpriseState)=>s.finance.payables.reduce((n,p)=>n+p.amount-p.paid,0);
export const depositPrincipal=(s:EnterpriseState)=>s.finance.deposits.reduce((n,d)=>n+d.principal,0);
export const nonPrincipalPayables=(s:EnterpriseState)=>s.finance.payables.filter(p=>!p.principal).reduce((n,p)=>n+p.amount-p.paid,0);
const outstanding=(p:EnterprisePayable)=>p.amount-p.paid;
function installments(amount:number,months:number,opened:number,product:'working'|'project'){
  const count=product==='working'?1:months;return Array.from({length:count},(_,i)=>({due:opened+(product==='working'?months:i+1)*30*24,principal:Math.floor(amount/count)+(i<amount%count?1:0),paid:0}));
}
function loan(id:string,amount:number,product:'working'|'project',termMonths:number,opened:number,automatic=false):EnterpriseLoan{return {id,product,automatic,opened,rate:FINANCE_RATES[product],balance:amount,original:amount,termMonths,installments:installments(amount,termMonths,opened,product),accruedInterest:0,interestRemainder:0,nextInterestDue:opened+30*24};}
export function createFinance(tutorial=false):EnterpriseFinance{return {plan:{...(tutorial?GUIDED_FINANCE_PLAN:{reserveDays:30,depositDays:0,creditLimit:0})},published:!tutorial,loans:[loan('loan-initial',20_000_000,'project',36,0)],deposits:[],payables:[],status:'healthy',distressSince:null,failedAt:null,failureReason:'',tutorialPaused:false,restructured:false,depositInterest:0,demandInterest:0,demandRemainder:0,forfeitedInterest:0,principalPaid:0,lateRemainder:0};}
export function financeDailyCost(s:EnterpriseState){
  const wages=s.crews.reduce((n,c)=>n+c.count*c.wage*8*(c.shift==='reserve'?1.1:c.shift===0||c.shift===2?1.125:1),0),days=Math.max(1,s.hour/24);
  const energy=s.ledger.slice(-500).filter(e=>e.category==='energy'&&e.hour>=s.hour-168).reduce((n,e)=>n+e.amount,0)/Math.max(1,Math.min(7,days));
  const fuel=(s.hour?s.stats.fuel/days:900)*7.2,leases=s.assets.filter(a=>a.ownership==='leased'&&a.status!=='retired').reduce((n,a)=>n+assetSpec(a.model).leaseDaily,0);
  return Math.ceil(wages+energy+fuel+leases+10_000+(s.policy.insurance?92*24:0));
}
export function creditAvailable(s:EnterpriseState){return Math.max(0,Math.floor(Math.max(30_000_000,assetValue(s)*.6)-s.debt-nonPrincipalPayables(s)));}
function oldestDue(s:EnterpriseState){return s.finance.payables.filter(p=>outstanding(p)>0&&p.due<=s.hour).reduce((n,p)=>Math.min(n,p.due),Infinity);}
export function applyFinancePlan(s:EnterpriseState,patch:FinancePlan){
  if(!patch||typeof patch!=='object'||Object.keys(patch).length!==3||![15,30,60].includes(patch.reserveDays)||![0,30,90].includes(patch.depositDays)||![0,5_000_000,10_000_000].includes(patch.creditLimit))throw Error('请选择有效的现金保障、存款期限和授信上限。');
  if(guidedFinance(s)&&Object.entries(GUIDED_FINANCE_PLAN).some(([k,v])=>patch[k as keyof FinancePlan]!==v))throw Error('前半年资金方案由教程固定：30日现金保障、30日定存和500万元周转授信。');
  s.finance.plan={...patch};s.policy.reserveCash=financeDailyCost(s)*patch.reserveDays;s.finance.published=true;return guidedFinance(s)?'已确认教程固定资金方案；自动归集、到期还款和授信均按此执行。':'资金规则已发布，适用于后续归集与提款；已有存款和贷款条款继续保留。';
}
function requireIndependent(s:EnterpriseState){if(guidedFinance(s))throw Error('前半年由教程固定资金管理，不能自行借款、提前还款、取回定存或重组。');}
export function borrow(s:EnterpriseState,amount:number,product:'project'|'working'='project',termMonths=product==='working'?3:36,automatic=false,opened=s.hour){
  if(!automatic)requireIndependent(s);
  if(!Number.isSafeInteger(amount)||amount<100000||amount>80_000_000||!['project','working'].includes(product)||!(product==='working'?[3]:[12,24,36]).includes(termMonths))throw Error('贷款金额至少10万元；周转贷款3个月，项目贷款12、24或36个月。');
  if(depositPrincipal(s)>0)throw Error('请先取回定存，再申请贷款；不能同时增加存款和借款来套取利差。');
  const facility=automatic?s.finance.loans.find(l=>l.automatic&&l.balance>0&&l.installments[0]!.due>opened):undefined;
  if(s.finance.status==='bankrupt'||s.finance.tutorialPaused||amount>creditAvailable(s)||(!facility&&s.finance.loans.filter(l=>l.balance>0).length>=12))throw Error('当前可用融资额度不足或贷款笔数已达上限。');
  if(s.hour-oldestDue(s)>=7*24)throw Error('付款拖欠已达7日，新增贷款冻结；请取回资金、处置资产或申请一次重组。');
  const l=facility??loan('loan-'+s.nextId++,amount,product,termMonths,opened,automatic);
  if(facility){l.balance+=amount;l.original+=amount;l.installments[0]!.principal+=amount;}else s.finance.loans.push(l);
  s.debt+=amount;post(s,'loan',0,amount,automatic?'按已批准上限提用周转授信':'贷款到账');if(product==='project')post(s,'finance-charge',Math.ceil(amount*.005),-Math.ceil(amount*.005),'项目贷款一次性0.5%手续费');event(s,'finance',automatic?'周转授信已提款':'贷款计划已建立',amount+'元；年利率'+(l.rate*100)+'%，按实际小时占用计息、每30日付息。',l.id);
  return '贷款已到账；'+(product==='working'?'90日到期还本':'每30日等额还本')+'，每30日自动付息。';
}
function principalPaid(s:EnterpriseState,l:EnterpriseLoan,amount:number){
  let left=amount;for(const i of l.installments){const n=Math.min(left,i.principal-i.paid);i.paid+=n;left-=n;if(!left)break;}
  if(left)throw Error('贷款还款计划与本金不一致。');l.balance-=amount;s.debt-=amount;s.finance.principalPaid+=amount;month(s).principalPaid+=amount;
}
export function settlePayables(s:EnterpriseState){
  const priority=(p:EnterprisePayable)=>({wages:0,energy:1,incident:2,interest:3,'loan-principal':4,tax:5}[p.category]??6);
  for(const p of [...s.finance.payables].filter(p=>outstanding(p)>0&&p.due<=s.hour+1).sort((a,b)=>priority(a)-priority(b)||a.due-b.due||a.id.localeCompare(b.id))){
    liquidateDeposits(s,Math.max(0,outstanding(p)-s.cash));const n=Math.min(outstanding(p),s.cash);if(!n)break;
    if(p.principal){const l=s.finance.loans.find(l=>l.id===p.loanId);if(!l)throw Error('缺少贷款责任记录。');principalPaid(s,l,n);post(s,'repay',0,-n,'到期本金自动偿付');}
    else post(s,'settlement',0,-n,'支付到期款：'+p.note);p.paid+=n;
  }
  const m=month(s);m.cashEnd=s.cash;m.debtEnd=s.debt;m.payablesEnd=payableBalance(s);
}
export function repayLoan(s:EnterpriseState,amount:number){
  requireIndependent(s);if(!Number.isSafeInteger(amount)||amount<1||amount>s.debt)throw Error('偿付金额应为未还本金范围内的整数。');
  if(payableBalance(s))throw Error('请先支付到期欠款，再安排提前还本。');
  const interest=s.finance.loans.reduce((n,l)=>n+l.accruedInterest,0),available=s.cash+depositPrincipal(s);
  if(amount+interest>available)throw Error('现金及可取回本金不足以覆盖本次还本与已计提利息。');liquidateDeposits(s,Math.max(0,amount+interest-s.cash));
  for(const l of s.finance.loans){if(l.accruedInterest){post(s,'settlement',0,-l.accruedInterest,'提前还本时结清已计提利息');l.accruedInterest=0;}}
  let left=amount;for(const l of [...s.finance.loans].sort((a,b)=>b.rate-a.rate||a.opened-b.opened)){const n=Math.min(left,l.balance);if(n){principalPaid(s,l,n);post(s,'repay',0,-n,'提前偿还贷款本金');left-=n;}if(!left)break;}
  return '已偿还本金并结清已计提利息；后续还款表同步减少。';
}
export function redeemDeposits(s:EnterpriseState){requireIndependent(s);const n=liquidateDeposits(s,Infinity);return n?'已取回'+n+'元本金；提前取回的未入账利息放弃。':'当前没有未到期定存。';}
export function restructureFinance(s:EnterpriseState){
  requireIndependent(s);if(s.finance.restructured)throw Error('本场债务重组机会已经使用。');
  if(!s.finance.loans.some(l=>l.balance>0)||(!payableBalance(s)&&financeForecast(s)[0]!.endCash>=0))throw Error('目前没有需要重组的到期付款缺口。');
  const balance=s.debt,fee=Math.ceil(balance*.01);s.finance.restructured=true;
  for(const p of s.finance.payables.filter(p=>p.principal&&outstanding(p)>0))p.amount=p.paid;
  for(const l of s.finance.loans.filter(l=>l.balance>0)){const remaining=Math.max(1,l.installments.filter(i=>i.paid<i.principal).length);l.rate=Math.min(.12,l.rate+.01);l.installments=installments(l.balance,l.product==='working'?6:remaining+6,s.hour,l.product);l.termMonths=l.product==='working'?6:remaining+6;}
  post(s,'finance-charge',fee,-fee,'一次性债务重组费用');event(s,'finance','债务重组已执行','本金未减免，已欠利息与经营款仍须支付；延长本金计划并增加1个百分点利率。');
  return '已重排未还本金计划；1%手续费、较高利率及原欠息继续保留，本场不能再次重组。';
}
export function financeForecast(s:EnterpriseState){
  const daily=financeDailyCost(s),deposits=depositPrincipal(s);
  return [30,60,90].map(days=>{const end=s.hour+days*24,receipts=s.receivables.filter(r=>r.due<=end).reduce((n,r)=>n+r.amount,0),maturing=s.finance.deposits.filter(d=>d.matures<=end).reduce((n,d)=>n+d.principal,0);
    const principal=s.finance.loans.reduce((n,l)=>n+l.installments.filter(i=>i.due>s.hour&&i.due<=end).reduce((a,i)=>a+i.principal-i.paid,0),0),interest=Math.ceil(s.finance.loans.reduce((n,l)=>n+l.balance*l.rate*days/365+l.accruedInterest,0));
    const arrears=payableBalance(s),operating=daily*days;return {days,receipts,maturing,principal,interest,arrears,operating,endCash:s.cash+receipts+maturing-principal-interest-arrears-operating,liquidReserve:s.cash+deposits};});
}
export function financiallyHalted(s:EnterpriseState){return s.finance.status==='bankrupt'||s.finance.payables.some(p=>outstanding(p)>0&&['wages','energy'].includes(p.category)&&s.hour-p.due>=24);}
export function financeView(s:EnterpriseState){
  const unpaid=payableBalance(s),accruedInterest=s.finance.loans.reduce((n,l)=>n+l.accruedInterest,0),liquid=s.cash+depositPrincipal(s),daily=financeDailyCost(s);
  return {...s.finance,guided:guidedFinance(s),guidedUntil:ENTERPRISE_GUIDED_FINANCE_END,unpaid,accruedInterest,depositPrincipal:depositPrincipal(s),availableCredit:creditAvailable(s),dailyCost:daily,cashDays:s.cash/Math.max(1,daily),liquidDays:liquid/Math.max(1,daily),halted:financiallyHalted(s),forecast:financeForecast(s),graceHours:FINANCE_GRACE_HOURS};
}
export function refreshFinanceStatus(s:EnterpriseState,now:number){
  const f=s.finance,old=f.status,unpaid=f.payables.filter(p=>outstanding(p)>0&&p.due<=now),first=unpaid.reduce((n,p)=>Math.min(n,p.due),Infinity),liquid=s.cash+depositPrincipal(s);
  f.distressSince=Number.isFinite(first)?first:null;
  if(unpaid.length&&now-first>=FINANCE_GRACE_HOURS){
    if(s.config.tutorial&&now<ENTERPRISE_GUIDED_FINANCE_END){f.tutorialPaused=true;f.status='distress';}
    else{f.status='bankrupt';f.failedAt=now;f.failureReason='到期付款缺口持续14日，宽限期内未完成偿付或纾困。';}
  }else{f.tutorialPaused=false;f.status=unpaid.length?'distress':liquid<financeDailyCost(s)*f.plan.reserveDays?'warning':'healthy';}
  if(old!==f.status||f.tutorialPaused)event(s,'finance',f.status==='bankrupt'?'经营失败：进入破产复盘':f.tutorialPaused?'带教资金暂停，请保留记录后重试':f.status==='distress'?'到期付款出现拖欠':f.status==='warning'?'经营现金进入预警':'资金恢复正常',f.failureReason||'应付未付'+payableBalance(s)+'元；剩余宽限按最早未付项目计算。');
}
/** Runs once per real simulated hour, before the clock advances. No wall-clock interest. */
export function closeFinanceHour(s:EnterpriseState){
  const now=s.hour+1,f=s.finance;
  if(s.config.tutorial&&now===ENTERPRISE_GUIDED_FINANCE_END)event(s,'finance','半年固定资金方案已交接','现有存款、贷款和欠款继续保留；资金规则解除教程锁定，之后适用经营失败规则。');
  for(const l of f.loans){
    l.interestRemainder+=l.balance*l.rate/8760;const n=Math.floor(l.interestRemainder+1e-9);l.interestRemainder-=n;if(n){l.accruedInterest+=n;post(s,'interest',n,0,'贷款利息按实际占用时间计提');}
    if(now>=l.nextInterestDue||now===s.horizon){if(l.accruedInterest){queuePayable(s,'interest',l.accruedInterest,'贷款到期利息',{loanId:l.id,due:now});l.accruedInterest=0;}l.nextInterestDue+=30*24;}
    for(const i of l.installments)if(i.due<=now&&i.paid<i.principal&&!f.payables.some(p=>p.principal&&p.loanId===l.id&&p.installmentDue===i.due))queuePayable(s,'loan-principal',i.principal-i.paid,'贷款到期本金',{loanId:l.id,installmentDue:i.due,principal:true,due:i.due});
  }
  // Borrowing cannot increase interest-bearing own liquidity. Liabilities consume the eligibility first.
  let own=Math.max(0,s.cash+depositPrincipal(s)-s.debt-nonPrincipalPayables(s)-f.loans.reduce((n,l)=>n+l.accruedInterest,0));
  for(const d of f.deposits){const base=Math.min(own,d.principal);own-=base;d.remainder+=base*d.rate/8760;const n=Math.floor(d.remainder+1e-9);d.remainder-=n;d.interest+=n;}
  f.demandRemainder+=Math.min(s.cash,own)*FINANCE_RATES.demand/8760;
  for(const d of [...f.deposits])if(d.matures<=now){f.deposits=f.deposits.filter(x=>x.id!==d.id);post(s,'deposit',0,d.principal,'定存到期收回本金');if(d.interest){post(s,'other-income',d.interest,d.interest,'定期存款利息');f.depositInterest+=d.interest;}event(s,'finance','定存已到期',d.principal+'元本金与'+d.interest+'元利息到账。',d.id);}
  if(now%24===0||now===s.horizon){const n=Math.floor(f.demandRemainder+1e-9);if(n){f.demandRemainder-=n;post(s,'other-income',n,n,'活期存款利息');f.demandInterest+=n;}}
  settlePayables(s);
  const missing=f.payables.filter(p=>!p.principal&&p.due<=now).reduce((n,p)=>n+outstanding(p),0),working=f.loans.filter(l=>l.product==='working').reduce((n,l)=>n+l.balance,0),limit=Math.min(f.plan.creditLimit-working,creditAvailable(s));
  const auto=f.loans.find(l=>l.automatic&&l.balance>0),canDraw=auto?auto.installments[0]!.due>now:f.loans.filter(l=>l.balance>0).length<12;
  if(missing&&f.published&&canDraw&&limit>=100000&&s.hour-oldestDue(s)<7*24){liquidateDeposits(s,Infinity);const amount=Math.min(limit,Math.max(100000,Math.ceil(missing/100000)*100000));borrow(s,amount,'working',3,true,now);settlePayables(s);}
  if(now%24===0){
    s.policy.reserveCash=financeDailyCost(s)*f.plan.reserveDays;
    const base=f.payables.filter(p=>outstanding(p)>0&&p.category!=='late-fee'&&p.due<now-24).reduce((n,p)=>n+outstanding(p),0);f.lateRemainder+=base*FINANCE_RATES.late/365;const fee=Math.floor(f.lateRemainder+1e-9);if(fee){f.lateRemainder-=fee;post(s,'late-fee',fee,-fee,'拖欠款项逾期费用');}
    const reserve=financeDailyCost(s)*f.plan.reserveDays+f.loans.reduce((n,l)=>n+l.installments.filter(i=>i.due<=now+30*24&&i.due>now).reduce((a,i)=>a+i.principal-i.paid,0)+l.accruedInterest,0);
    const amount=Math.floor(Math.max(0,Math.min(s.cash-reserve,s.cash-s.debt-nonPrincipalPayables(s)))/10000)*10000;
    if(f.published&&f.plan.depositDays&&amount>=100000&&!payableBalance(s)&&f.deposits.length<6&&now+f.plan.depositDays*24<=s.horizon){const days=f.plan.depositDays;f.deposits.push({id:'deposit-'+s.nextId++,principal:amount,opened:now,matures:now+days*24,days,rate:days===30?FINANCE_RATES.deposit30:FINANCE_RATES.deposit90,interest:0,remainder:0});post(s,'deposit',0,-amount,'按资金规则归集闲置自有现金');}
  }
  refreshFinanceStatus(s,now);const m=month(s);m.depositEnd=depositPrincipal(s);m.payablesEnd=payableBalance(s);m.debtEnd=s.debt;m.cashEnd=s.cash;
}
export function assertFinance(s:EnterpriseState){
  const f=s.finance;if(!Number.isSafeInteger(s.cash)||s.cash<0)throw Error('经营现金不得为负数；缺口必须记为明确应付款。');
  if(f.loans.reduce((n,l)=>n+l.balance,0)!==s.debt)throw Error('贷款明细与本金余额不一致。');
  for(const l of f.loans)if(l.balance<0||l.installments.reduce((n,i)=>n+i.principal-i.paid,0)!==l.balance||l.accruedInterest<0||l.installments.some(i=>i.paid<0||i.paid>i.principal))throw Error('贷款还款计划不守恒。');
  for(const p of f.payables)if(!Number.isSafeInteger(p.amount)||!Number.isSafeInteger(p.paid)||p.paid<0||p.paid>p.amount)throw Error('应付款明细无效。');
  for(const d of f.deposits)if(!Number.isSafeInteger(d.principal)||d.principal<=0||d.matures<=d.opened||d.interest<0||d.rate>=FINANCE_RATES.project)throw Error('存款金额或期限无效。');
  const funded=20_000_000+s.ledger.filter(e=>e.category==='loan'||e.category==='repay').reduce((n,e)=>n+e.cash,0);if(funded!==s.debt)throw Error('贷款本金与资金流水不一致。');
}

export function financeInsuranceActive(s:EnterpriseState){return s.policy.insurance&&!s.finance.payables.some(p=>p.category==='insurance'&&p.amount>p.paid&&s.hour-p.due>=24);}
