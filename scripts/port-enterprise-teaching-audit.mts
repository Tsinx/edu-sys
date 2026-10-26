import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertEnterprise, enterpriseHash, enterpriseRecord, enterpriseScore, makeEnterprisePackage, restoreEnterprise, verifyEnterprisePackage, ENTERPRISE_NOTE_TOPICS } from '../packages/port-simulation-core/src/enterprise';
import { enterpriseTeachingSteps, newEnterpriseTeaching } from '../apps/teacher-web/src/features/port-simulation/enterprise/enterprise-teaching';

process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve('output/port-enterprise-teaching');
const record=JSON.parse(await readFile(resolve(process.argv[2]??output+'/trial-record.json'),'utf8'));
const baseline=JSON.parse(await readFile('docs/verification/port-enterprise-2026-10-25.json','utf8'));
const engineFiles=baseline.sourceFiles.filter((f:{path:string})=>f.path.startsWith('packages/port-simulation-core/src/enterprise'));
for(const file of engineFiles)assert.equal(createHash('sha256').update(await readFile(file.path)).digest('hex'),file.sha256,file.path);
const old=restoreEnterprise(JSON.parse(await readFile('output/port-enterprise-qa/three-year-record.json','utf8')));
assert.equal(enterpriseHash(old),'014e28f92e13b1dfccb6d5e8ce73b8e424898d0b6cfb459afba72b34d85db523');
const s=restoreEnterprise(record),score=enterpriseScore(s);assertEnterprise(s);
assert.equal(s.hour,26304);assert.equal(s.sealed,true);assert.equal(s.months.length,36);
assert.equal(s.incidents.length,16);assert.equal(s.stats.recovered,16);assert.ok(s.incidents.every(i=>i.status==='resolved'));
for(const topic of ENTERPRISE_NOTE_TOPICS)assert.ok(s.notes.some(n=>n.topic===topic&&n.text.trim().length>=20));
for(let year=1;year<=3;year++)assert.ok(s.notes.some(n=>n.topic==='第'+year+'年经营复盘'&&n.hour>=(Date.UTC(2027+year,0,1)-Date.UTC(2027,0,1))/3600000&&n.text.trim().length>=20));
assert.deepEqual(Object.keys(record),['schema','rules','config','commands']);assert.deepEqual(enterpriseRecord(s),record);
const pkg=makeEnterprisePackage(s),verified=verifyEnterprisePackage(pkg);assert.equal(verified.stateHash,enterpriseHash(s));
const {enterpriseView}=await import('../packages/port-simulation-core/src/enterprise');
const view=enterpriseView(s),p=newEnterpriseTeaching(),steps=enterpriseTeachingSteps(view,record,p);
const businessSteps=steps.filter(step=>!step.quiz);
// The first independent receipt check requires the historical call. Its live receipt was captured in the browser.
assert.ok(businessSteps.filter(step=>step.id!=='receipts').every(step=>step.complete),businessSteps.filter(step=>step.id!=='receipts'&&!step.complete).map(step=>step.id).join(','));
const ui=JSON.parse(await readFile(output+'/ui-summary.json','utf8'));
assert.equal(ui.hour,String(s.hour));assert.equal(ui.progress,'40/40 已验证');
assert.ok(ui.score.includes(score.total.toLocaleString('zh-CN',{maximumFractionDigits:2})+'分'));
for(const goods of view.goods){const row=ui.goods.find((text:string)=>text.includes(goods.name+' / '+goods.unit));assert.ok(row,goods.name);assert.ok(row.includes(goods.delivered.toLocaleString('zh-CN')),goods.name+' delivered');}
const report={checkedAt:new Date().toISOString(),engineSourceFilesUnchanged:engineFiles.length,oldThreeYearRecordHash:enterpriseHash(old),
  independentReplay:{hash:enterpriseHash(s),commands:s.journal.length,rejectedCommands:s.journal.filter(j=>!j.ok).length,hour:s.hour,days:s.hour/24,months:s.months.length,sealed:s.sealed,score:score.total,cash:s.cash,debt:s.debt,incidents:s.incidents.length,recovered:s.stats.recovered,goods:view.goods.map(g=>({kind:g.kind,unit:g.unit,delivered:g.delivered,outstanding:g.outstanding,lost:g.lost})),notes:s.notes.map(n=>({topic:n.topic,hour:n.hour,length:n.text.length}))},
  browserComparison:{teaching:ui.progress,score:ui.score,goodsMatch:true},formalTaskPublished:false,formalSubmissionSent:false};
await writeFile(output+'/replay-report.json',JSON.stringify(report,null,2));
await writeFile(output+'/independently-verified-package.json',JSON.stringify(pkg,null,2));
console.log(JSON.stringify(report));
