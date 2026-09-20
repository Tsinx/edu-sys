// Finalize metadata only after current-content evidence has been recorded.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const stem='packages/course-content/src/management-principles',qa='output/management-principles/qa-phase3';
const visual=read('docs/management/visual-review-phase3.json');assert.equal(visual.status,'passed');assert.equal(visual.content.sha256,sha(`${stem}/pages.json`));
assert.equal(visual.pages.length,814);for(const p of visual.pages)for(const k of ['desktop','narrow'])assert.equal(sha(p[k].path),p[k].sha256);
const source=read('docs/management/source-review-phase3.json');assert.equal(source.sourcePages.length,728);assert.equal(source.status,'reviewed');
for(const e of source.sourcePages)assert.equal(sha(e.render.path),e.render.sha256);
const baseline=read(`${qa}/baseline-audit.json`);assert.equal(baseline.status,'passed');assert.equal(baseline.pagesSha256,sha(`${stem}/pages.json`));
const ai=read(`${qa}/live-assistant-verified/audit.json`);assert.equal(ai.checked,9);assert(ai.results.every(r=>r.status==='passed'&&r.actualServiceRequest));
assert.equal(read('docs/management/calculation-audit-phase3.json').status,'passed');
const now=new Date().toISOString();
const updates=read('docs/management/updates.json');for(const u of updates.slice(517)){u.sourceReview='reviewed';u.webReview=u.disposition==='omitted'?'not-applicable-administrative-omission':'passed';u.webReviewedAt=now;u.webReviewEvidence='docs/management/visual-review-phase3.json';}
write('docs/management/updates.json',updates);write('docs/management/updates-phase3.json',updates.slice(517));write(`${stem}/updates.json`,updates);
const manifest=read(`${stem}/manifest.json`);manifest.status='validated';manifest.validatedAt=now;write(`${stem}/manifest.json`,manifest);write('docs/management/coverage.json',{...manifest,generatedAt:now});
console.log({status:'validated',pages:manifest.webPageCount,newWebReview:814,sourceRecords:728});
