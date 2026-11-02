import {monthKey,type EnterpriseState,type MonthReport,type EnterprisePayable} from './enterprise-model.js';
export const money = (n: number) => Math.round(n);
export function event(s: EnterpriseState, kind: string, title: string, detail = '', object = '') {
  s.events.push({ id: ++s.eventSequence, hour: s.hour, kind, title, detail, object });
  if (s.events.length > 1200) s.events.splice(0, s.events.length - 1200);
}
const monthKeys=new WeakMap<EnterpriseState,{hour:number;key:string}>();
export function month(s: EnterpriseState): MonthReport {
  const hour=Math.min(s.hour,s.horizon-1);
  let cached=monthKeys.get(s);
  if(!cached||cached.hour!==hour){cached={hour,key:monthKey(hour)};monthKeys.set(s,cached);}
  const key=cached.key;
  let m = s.months.at(-1);
  if (!m || m.month !== key) { m = { month: key, revenue: 0, operating: 0, capital: 0, interest: 0, depreciation: 0, tax: 0, handled: 0, onTime: 0, generated: 0, energy: 0, emissions: 0, waiting: 0, rehandles: 0, cashEnd: s.cash, debtEnd: s.debt,interestIncome:0,principalPaid:0,depositEnd:0,payablesEnd:0 }; s.months.push(m); }
  return m;
}
export function post(s: EnterpriseState, category: string, amount: number, cash: number, note: string) {
  const a = money(amount);let c = money(cash);const m = month(s);
  if(c<0){liquidateDeposits(s,Math.max(0,-c-s.cash));const paid=Math.min(-c,s.cash),missing=-c-paid;c=-paid;if(missing)queuePayable(s,category,missing,note);}
  if (category === 'revenue'||category==='other-income') m.revenue += a;
  if(category==='other-income'&&note.includes('存款利息'))m.interestIncome+=a;
  if (category === 'capital') m.capital += a;
  else if (category === 'interest') m.interest += a;
  else if (category === 'depreciation') m.depreciation += a;
  else if (category === 'tax') m.tax += a;
  else if (!['revenue','other-income','collection', 'loan', 'repay', 'inventory', 'disposal','prepaid','deposit','settlement'].includes(category)) m.operating += a;
  s.cash += c;
  const day = Math.floor(s.hour / 24);
  const prior = s.ledger.slice(-36).find(e => Math.floor(e.hour / 24) === day && e.category === category && e.note === note);
  if (prior) { prior.amount += a; prior.cash += c; } else s.ledger.push({ hour: s.hour, category, amount: a, cash: c, note });
  m.cashEnd = s.cash; m.debtEnd = s.debt;m.depositEnd=s.finance.deposits.reduce((n,d)=>n+d.principal,0);m.payablesEnd=s.finance.payables.reduce((n,p)=>n+p.amount-p.paid,0);
}
export function spend(s: EnterpriseState, amount: number, category: string, note: string) {
  if(!Number.isFinite(amount)||amount<0||s.cash+s.finance.deposits.reduce((n,d)=>n+d.principal,0)<amount)throw Error('可用现金不足，请调整规模、延期或安排融资。');
  liquidateDeposits(s,Math.max(0,amount-s.cash));post(s, category, amount, -amount, note);
}

export function queuePayable(s:EnterpriseState,category:string,amount:number,note:string,extra:Partial<Pick<EnterprisePayable,'loanId'|'installmentDue'|'principal'|'due'>>={}){
  if(amount<=0)return;const day=Math.floor(s.hour/24),prior=s.finance.payables.find(p=>p.amount>p.paid&&p.category===category&&p.note===note&&Math.floor(p.created/24)===day&&p.loanId===extra.loanId&&p.installmentDue===extra.installmentDue);
  if(prior)prior.amount+=amount;else s.finance.payables.push({id:'payable-'+s.nextId++,category,note,amount,paid:0,created:s.hour,due:s.hour,...extra});
}
/** Fixed-deposit principal is recoverable; unposted interest is forfeited on early redemption. */
export function liquidateDeposits(s:EnterpriseState,need:number){
  if(need<=0)return 0;let released=0;
  const ordered=[...s.finance.deposits].sort((a,b)=>a.matures-b.matures||a.id.localeCompare(b.id));
  for(const d of ordered){if(released>=need)break;s.finance.deposits=s.finance.deposits.filter(x=>x.id!==d.id);s.finance.forfeitedInterest+=d.interest;
    post(s,'deposit',0,d.principal,'提前取回定存本金，未入账利息放弃');released+=d.principal;event(s,'finance','定存提前取回','本金'+d.principal+'元；未入账利息'+d.interest+'元未发放。',d.id);
  }return released;
}
