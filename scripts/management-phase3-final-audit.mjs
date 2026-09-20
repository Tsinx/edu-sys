import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const qa='output/management-principles/qa-phase3',stem='packages/course-content/src/management-principles';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const evidence=p=>({path:p,sha256:sha(p)});
const manifest=read(`${stem}/manifest.json`),pages=read(`${stem}/pages.json`),index=read('docs/management/course-index.json');
assert.equal(manifest.status,'validated');assert.equal(manifest.webPageCount,1477);assert.equal(index.modules.length,17);
assert.equal(pages.length,1477);assert.equal(index.modules[0].number,0);
const baseline=read(`${qa}/baseline-audit.json`),visual=read('docs/management/visual-review-phase3.json');
assert.equal(baseline.pagesSha256,sha(`${stem}/pages.json`));assert.equal(visual.content.sha256,sha(`${stem}/pages.json`));
assert.equal(visual.pages.length,814);assert.equal(visual.unresolvedFindings.length,0);
const web=read(`${qa}/web/full-audit.json`),runtime=read(`${qa}/runtime/audit.json`),demos=read(`${qa}/demos/audit.json`);
assert.equal(web.checked,1628);assert.equal(web.errors.length+web.failures.length,0);assert.equal(runtime.canvases.length,5908);assert.equal(runtime.errors.length,0);assert.equal(demos.checked,1134);assert.equal(demos.errors.length+demos.failures.length,0);
const ai=read(`${qa}/live-assistant-verified/audit.json`);assert.equal(ai.checked,9);assert(ai.results.every(r=>r.status==='passed'&&r.actualServiceRequest&&r.unrevealedMaterialAbsent&&r.contextIsolation));
const release=read(`${qa}/release-final.json`),assets=read(`${qa}/asset-integrity-final.json`),cache=read(`${qa}/cache/audit.json`);
assert(release.productionInstall&&release.standaloneStartup&&release.staticRootIsolation&&release.backupIntegrity);
assert.equal(release.verifiedResources,923);assert.equal(assets.releaseId,cache.versions.at(-1));assert.equal(path.resolve(assets.release),path.resolve(release.release));
assert.equal(assets.managementFiles,423);assert(assets.allHashesMatch&&assets.privateSourceFilesAbsent&&assets.originalNotesAbsent);
assert.equal(cache.errors.length,0);assert.equal(cache.offlineVerifiedFiles,423);assert(cache.privateApiNotCached&&cache.sixteenthLectureEndBoundaryAfterRefresh);
for(const [file,count] of [['delivery-tests.log',14],['delivery-phase3-tests.log',5],['related-regression.log',21]]){const t=fs.readFileSync(`${qa}/${file}`,'utf8');assert.match(t,new RegExp(`pass ${count}`));assert.match(t,/fail 0/);}
assert.match(fs.readFileSync(`${qa}/delivery-build.log`,'utf8'),/built in/);assert.match(fs.readFileSync(`${qa}/diff-check.txt`,'utf8'),/PASS/);
const broken=[];let documentLinks=0;
for(const name of ['README.md','IMPLEMENTATION-PHASE3.md','VERIFICATION-PHASE3.md','CALCULATIONS-PHASE3.md']){const p=`docs/management/${name}`;for(const m of fs.readFileSync(p,'utf8').matchAll(/\]\(([^)]+)\)/g)){if(/^https?:/.test(m[1]))continue;documentLinks++;if(!fs.existsSync(path.resolve(path.dirname(p),m[1].split('#')[0])))broken.push({file:p,target:m[1]});}}
const review='output/management-principles/review-phase3/index.html';let reviewImages=0;
for(const m of fs.readFileSync(review,'utf8').matchAll(/<img[^>]+src="([^"]+)"/g)){reviewImages++;if(!fs.existsSync(path.resolve(path.dirname(review),m[1])))broken.push({file:review,target:m[1]});}
assert.deepEqual(broken,[]);assert.equal(reviewImages,3034);
const evidenceFiles=[`${stem}/pages.json`,`${stem}/manifest.json`,'docs/management/course-index.json','docs/management/source-review-phase3.json','docs/management/duplicate-review-phase3.json','docs/management/updates-phase3.json','docs/management/image-manifest-phase3.json','docs/management/calculation-audit-phase3.json','docs/management/visual-review-phase3.json',...['baseline-audit.json','web/full-audit.json','runtime/audit.json','demos/audit.json','live-assistant-verified/audit.json','asset-integrity-final.json','release-final.json','cache/audit.json','local-ui-verification.json','delivery-tests.log','delivery-phase3-tests.log','related-regression.log','delivery-build.log','diff-check.txt'].map(p=>`${qa}/${p}`)];
const report={status:'passed',checkedAt:new Date().toISOString(),version:manifest.version,releaseId:assets.releaseId,release:assets.release,scope:{sourceRecords:1245,newSourceRecords:728,webPages:1477,newWebPages:814,images:410,newImages:220,demos:34,newDemos:18,visualScreenshots:1628,runtimeCanvases:5908,demoChecks:1134,realAssistantRequests:9},linkCheck:{documentLinks,reviewImages,broken},limitations:['正式课程代码与总学时待完善','旧事实的未核实细节及受限来源范围保留在各页更新记录','云端助教需要网络和有效配置；9次实测不等于未来每次回复保证','未实施校内TLS、校园网络及外部部署'],evidence:evidenceFiles.map(evidence)};
fs.writeFileSync(`${qa}/acceptance-final.json`,JSON.stringify(report,null,2)+'\n');console.log({status:report.status,scope:report.scope,links:report.linkCheck,release:report.release});
