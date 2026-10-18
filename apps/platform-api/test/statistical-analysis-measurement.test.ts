import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MEASUREMENT_DATA as D, measurementLessons,measurementTeachingTables,measurementWording,STATISTICAL_ANALYSIS_SLIDES as slides} from '@edu/course-content/statistical-analysis';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';

const sum=(x:number[])=>x.reduce((a,b)=>a+b,0),mean=(x:number[])=>sum(x)/x.length;
const variance=(x:number[])=>{const m=mean(x);return sum(x.map(v=>(v-m)**2))/(x.length-1);};
const near=(a:number,b:number,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const alpha=(rows:number[][])=>{const k=rows[0]!.length;return k/(k-1)*(1-sum(Array.from({length:k},(_,j)=>variance(rows.map(r=>r[j]!))))/variance(rows.map(sum)));};

test('survey: original values, reverse direction, missingness and declared scoring rule agree',()=>{
 assert.equal(D.survey.rows.length,240);assert.equal(new Set(D.survey.rows.map(r=>r.id)).size,240);
 for(const row of D.survey.rows){
  row.responses.forEach((v,j)=>{assert.ok(v===null||(Number.isInteger(v)&&v>=1&&v<=5));assert.equal(row.recoded[j],v===null?null:j===5?6-v:v);});
  for(const [d,start] of [[0,0],[1,3]]){
   const valid=row.recoded.slice(start,start!+3).filter((v):v is number=>v!==null);
   assert.equal(row.available[d!],valid.length);
   if(valid.length<2)assert.equal(row.domainScores[d!],null);else near(row.domainScores[d!]!,mean(valid));
  }
 }
 assert.deepEqual(D.survey.rows[8]!.responses,[3,3,3,3,3,3]);assert.equal(D.survey.rows[8]!.seconds,13);
 assert.equal(D.survey.rows[36]!.domainScores[0],null);
 D.survey.distribution.forEach((d,j)=>{assert.equal(sum(d.counts),d.n);assert.equal(d.n+d.missing,240);for(let k=1;k<=5;k++)assert.equal(d.counts[k-1],D.survey.rows.filter(r=>r.recoded[j]===k).length);});
});
test('alpha counterexamples are reproduced on the stated complete-case samples',()=>{
 const complete=(start:number,length:number,raw=false)=>D.survey.rows.map(r=>(raw?r.responses:r.recoded).slice(start,start+length)).filter(r=>r.every(v=>v!==null)) as number[][];
 const all=complete(0,6),response=complete(0,3),transparent=complete(3,3);
 assert.equal(all.length,221);assert.equal(response.length,229);assert.equal(transparent.length,231);
 near(alpha(all),D.survey.reliability.allAlpha);near(alpha(complete(0,6,true)),D.survey.reliability.unreversedAlpha);
 near(alpha(response),D.survey.reliability.domains[0]!.alpha);near(alpha(transparent),D.survey.reliability.domains[1]!.alpha);
 near(alpha(response.map(r=>[...r,...r])),D.survey.reliability.duplicateAlpha);
 assert.ok(D.survey.reliability.duplicateAlpha>D.survey.reliability.domains[0]!.alpha);
});
test('PCA source rows, hashes and supplementary labels match the public original file',async()=>{
 const bytes=await readFile(new URL('../../../docs/course/statistical-analysis/data/wholesale-customers.csv',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),D.wholesale.csvSHA256);
 const records=bytes.toString('utf8').trim().split(/\r?\n/).slice(1).map(line=>line.split(',').map(Number));
 assert.equal(records.length,440);assert.equal(D.wholesale.raw.length,440);
 records.forEach((r,i)=>assert.deepEqual(r.slice(2),D.wholesale.raw[i]));
 assert.equal(records.filter(r=>r[0]===1).length,298);assert.equal(records.filter(r=>r[0]===2).length,142);
 assert.deepEqual([1,2,3].map(v=>records.filter(r=>r[1]===v).length),[77,47,316]);
 assert.deepEqual(D.wholesale.features,['Fresh','Milk','Grocery','Frozen','Detergents_Paper','Delicassen']);
});
test('PCA: independent covariance identities verify preprocessing, coefficients, scores and loadings',()=>{
 const x=D.wholesale.raw,z=D.wholesale.standardized,w=D.wholesale.model.weights,t=D.wholesale.model.scores,lambda=D.wholesale.model.eigenvalues,n=x.length;
 const covariance=Array.from({length:6},(_,a)=>Array.from({length:6},(_,b)=>sum(z.map(r=>r[a]!*r[b]!))/(n-1)));
 for(let j=0;j<6;j++){
  const log=x.map(r=>Math.log1p(r[j]!));near(mean(log),D.wholesale.center[j]!);near(Math.sqrt(variance(log)),D.wholesale.scale[j]!);
  x.forEach((r,i)=>near(z[i]![j]!,(Math.log1p(r[j]!)-mean(log))/Math.sqrt(variance(log))));
  near(mean(z.map(r=>r[j]!)),0);near(variance(z.map(r=>r[j]!)),1);
  for(let k=0;k<6;k++){
   near(sum(w.map(r=>r[j]!*r[k]!)),j===k?1:0);
   near(sum(covariance[j]!.map((s,h)=>s*w[h]![k]!)),lambda[k]!*w[j]![k]!);
   near(D.wholesale.correlationLoadings[j]![k]!,sum(z.map((r,i)=>r[j]!*t[i]![k]!))/(n-1)/Math.sqrt(lambda[k]!));
  }
 }
 t.forEach((r,i)=>r.forEach((v,k)=>near(v,sum(z[i]!.map((a,j)=>a*w[j]![k]!)))));
 near(sum(lambda),6);near(sum(D.wholesale.model.explained.slice(0,2)),.712726689343764,1e-12);
 for(let j=0;j<6;j++){near(variance(t.map(r=>r[j]!)),lambda[j]!);for(let k=0;k<j;k++)near(sum(t.map(r=>r[j]!*r[k]!))/(n-1),0);}
});
test('PCA truncation loses exactly the discarded variance; sign flips preserve reconstruction',()=>{
 const z=D.wholesale.standardized,w=D.wholesale.model.weights,t=D.wholesale.model.scores;
 for(let k=1;k<=6;k++){
  const error=sum(z.map((r,i)=>sum(r.map((v,j)=>(v-sum(Array.from({length:k},(_,h)=>t[i]![h]!*w[j]![h]!)))**2))))/(z.length-1);
  near(error,sum(D.wholesale.model.eigenvalues.slice(k)));near(error,D.wholesale.reconstructions[k-1]!.error);
 }
 for(let j=0;j<6;j++)near(t[0]![0]!*w[j]![0]!,(-t[0]![0]!)*(-w[j]![0]!));
 const flagged=[...z.keys()].sort((a,b)=>sum(z[a]!.map(v=>v*v))-sum(z[b]!.map(v=>v*v))).slice(-5);
 assert.deepEqual(flagged.map(i=>D.wholesale.ids[i]).sort(),[...D.wholesale.sensitivity.excludedIDs].sort());
 assert.equal(D.wholesale.sensitivity.model.scores.length,435);assert.equal(t.length,440);
});
test('native measurement copy has no authoring instructions, false validation claim or data-set fusion',()=>{
 const copy=measurementLessons.flat().map(p=>[p.title,p.lead,...p.text,p.caption,p.source??''].join(' ')).join('\n')+'\n'+JSON.stringify(measurementTeachingTables)+'\n'+JSON.stringify(measurementWording);
 assert.doesNotMatch(copy,/让学生|告诉学生|今天不先|先拆掉|不背口号|教师应当|备课说明|本页讲解重点/);
 assert.equal(measurementLessons[0]!.length,48);assert.equal(measurementLessons[1]!.length,52);
 for(const p of slides.filter(s=>s.lesson>=6&&s.lesson<=7)){
  const workspace=buildPromptWorkspace('statistical-analysis','统计分析方法',undefined,p.index);
  assert.match(workspace.compiled,/六题问卷为独立教学模拟/);assert.match(workspace.compiled,/渠道与地区不进入拟合/);assert.match(workspace.compiled,/第12—16讲仍待建设/);
 }
 assert.match(slides[250]!.assistantCue,/变量如何得到/);
 assert.match(slides[333]!.assistantCue,/贡献z×w/);
 assert.match(slides[333]!.assistantCue,/W001/);
 for(const index of [250,298,304])assert.doesNotMatch(slides[index]!.assistantCue,/71\.3|2\.689|1\.378/,'early context must not disclose subsequent PCA results');
 assert.match(slides[304]!.assistantCue,/原值坐标/);
});

test('lecture 6 builds survey and measurement prerequisites before scoring and consistency',()=>{
 const six=measurementLessons[0]!;
 const position=(visual:string)=>{const i=six.findIndex(p=>p.visual===visual);assert.ok(i>=0,visual);return i;};
 assert.ok(position('survey-population')<position('survey-random-draw'));
 assert.ok(position('survey-random-draw')<position('survey-scale-definition'));
 assert.ok(position('survey-anchors')<position('survey-items'));
 assert.ok(position('survey-items')<position('survey-form'));
 assert.ok(position('survey-form')<position('survey-recode'));
 assert.ok(position('survey-recode')<position('survey-score-worked'));
 assert.ok(position('survey-score-worked')<position('survey-profiles'));
 assert.ok(position('survey-reliability-kinds')<position('survey-alpha-worked'));
 const opening=six.slice(0,4).map(p=>[p.title,p.lead,...p.text,p.caption].join(' ')).join('\n');
 assert.doesNotMatch(opening,/均分|R1|T3|α/);
 near(sum(six.map(p=>p.durationMinutes!)),90);
 assert.ok(six[position('survey-score-worked')]!.durationMinutes!>six[0]!.durationMinutes!);
});

test('established scales have a fit-based adoption decision and distinct adaptation requirements',()=>{
 const use=JSON.stringify(measurementTeachingTables['survey-scale-use']);
 const avoid=JSON.stringify(measurementTeachingTables['survey-scale-not-use']);
 const routes=JSON.stringify(measurementTeachingTables['survey-scale-routes']);
 assert.match(use,/构念相符/);assert.match(use,/对象、语言、用途/);assert.match(use,/UWES-9/);assert.match(use,/0—6频率/);
 assert.match(avoid,/交易记录/);assert.match(avoid,/先访谈/);assert.match(avoid,/不能套工作投入/);
 assert.match(routes,/采用合适版本/);assert.match(routes,/适配已有版本/);assert.match(routes,/开发新题项/);
 assert.match(routes,/许可/);assert.match(routes,/等价性/);assert.match(routes,/补充新对象中的证据/);
 const context=slides.find(s=>s.lesson===6&&s.localIndex===20)!.assistantCue;
 assert.match(context,/翻译删改不自动继承原证据/);
});

test('worked scoring and alpha variance components agree with the preserved original rows',()=>{
 const a=D.survey.rows[0]!;near(a.domainScores[0]!,1);near(a.domainScores[1]!,7/3);
 const practice=D.survey.rows[16]!;near(practice.domainScores[0]!,5/2);
 const transfer=D.survey.rows[30]!;near(transfer.domainScores[0]!,7/3);near(transfer.domainScores[1]!,5);
 assert.equal(transfer.available[1],2);assert.equal(transfer.recoded[5],null);
 const complete=D.survey.rows.map(r=>r.recoded.slice(0,3)).filter(r=>r.every(v=>v!==null)) as number[][];
 near(sum([0,1,2].map(j=>variance(complete.map(r=>r[j]!)))),5.159120508695317);
 near(variance(complete.map(sum)),12.363096606144182);
 assert.match(JSON.stringify(measurementTeachingTables['survey-alpha-worked']),/5\.159/);
 assert.match(JSON.stringify(measurementTeachingTables['survey-alpha-worked']),/12\.363/);
});

test('practice context withholds future scoring answers and keeps illustrative recruitment separate',()=>{
 const at=(local:number)=>slides.find(s=>s.lesson===6&&s.localIndex===local)!.assistantCue;
 assert.doesNotMatch(at(34),/2\.50|2\.5\b/);assert.match(at(35),/2\.50/);
 assert.doesNotMatch(at(46),/2\.33|5\.00/);assert.match(at(47),/2\.33/);assert.match(at(47),/5\.00/);
 assert.match(at(29),/资格未知/);assert.match(at(29),/不是.*模拟答卷.*真实来源/);
 assert.match(at(7),/3\/8/);assert.match(at(7),/一种可能/);
});
