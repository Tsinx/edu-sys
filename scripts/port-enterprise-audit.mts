import { createEnterprise, executeEnterprise, assertEnterprise, enterpriseView, enterpriseRecord, restoreEnterprise, enterpriseHash } from '../packages/port-simulation-core/src/enterprise.js';
let s = createEnterprise({ seed: 82027, years: 3, scenario: 'balanced', mode: 'practice' });
s = executeEnterprise(s, { kind: 'policy', patch: { verifiedExceptions: true } });
const days = Number(process.argv[2] ?? 90), start = performance.now();
for (let day = 0; day < days; day += 7) {
  for (const incident of s.incidents.filter(i => i.status !== 'resolved')) {
    if(!incident.evidence)s=executeEnterprise(s,{kind:'respond',incidentId:incident.id,action:'audit'});
    if(incident.status==='active')s=executeEnterprise(s,{kind:'respond',incidentId:incident.id,action:'isolate'});
    if(incident.response!=='repair')s=executeEnterprise(s,{kind:'respond',incidentId:incident.id,action:'repair'});
    const i = s.incidents.find(i => i.id === incident.id)!;
    if (i.response === 'repair' && i.resolves === null) s = executeEnterprise(s, { kind: 'respond', incidentId: i.id, action: 'recover' });
  }
  s = executeEnterprise(s, { kind: 'advance', hours: Math.min(7, days - day) * 24 });
  if (!s.journal.at(-1)!.ok) throw Error(s.journal.at(-1)!.message);
}
assertEnterprise(s);
const view = enterpriseView(s);
console.log(JSON.stringify({ days, ms: performance.now() - start, calls: s.calls.length, activeCalls: view.calls.length, activeLots: view.outstandingLots, delivered: view.goods.map(g => ({ kind: g.kind, delivered: g.delivered, generated: g.generated })), assetStates: Object.fromEntries(['active','maintenance','failed'].map(k => [k, s.assets.filter(a => a.status === k).length])), berths:s.terminals.filter(t=>t.berthCall).map(t=>({name:t.name,stock:s.lots.filter(l=>l.terminalId===t.id).reduce((n,l)=>n+l.yard,0),call:s.calls.find(c=>c.id===t.berthCall),lots:s.lots.filter(l=>l.callId===t.berthCall)})), notes: view.assets.filter(a=>a.note!=='执行已批准的作业'&&a.note!=='可用').slice(0,5).map(a=>a.note), events: s.events.slice(-6) }, null, 2));
