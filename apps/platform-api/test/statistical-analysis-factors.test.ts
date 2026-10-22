import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {FACTOR_DATA as D,MEASUREMENT_DATA as M,factorLessonEight as eight,factorLessonNine as nine,factorTables,factorEvidenceText,STATISTICAL_ANALYSIS_SLIDES as slides,semPaths} from '@edu/course-content/statistical-analysis';
import {buildPromptWorkspace} from '../src/assistant/prompts.js';

const sum=(a:number[])=>a.reduce((s,v)=>s+v,0),mean=(a:number[])=>sum(a)/a.length;
const near=(a:number,b:number,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function inverse(input:number[][]){const n=input.length,a=input.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>Number(i===j))]);for(let j=0;j<n;j++){const pivot=a[j]![j]!;assert.ok(Math.abs(pivot)>1e-12);for(let h=0;h<2*n;h++)a[j]![h]!/=pivot;for(let i=0;i<n;i++)if(i!==j){const scale=a[i]![j]!;for(let h=0;h<2*n;h++)a[i]![h]!-=scale*a[j]![h]!;}}return a.map(r=>r.slice(n));}
const correlation=(x:number[],y:number[])=>{const mx=mean(x),my=mean(y);return sum(x.map((v,i)=>(v-mx)*(y[i]!-my)))/Math.sqrt(sum(x.map(v=>(v-mx)**2))*sum(y.map(v=>(v-my)**2)));};

test('EFA preserves the exact original complete rows; independent confirmation preserves ordinal coding',()=>{
 const complete=M.survey.rows.filter(r=>r.recoded.every(v=>v!==null));
 assert.equal(complete.length,221);assert.deepEqual(D.efa.ids,complete.map(r=>r.id));assert.deepEqual(D.efa.rows,complete.map(r=>r.recoded));
 const csv=readFileSync(new URL('../../../docs/course/statistical-analysis/data/factor-confirmation.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1).map(l=>l.split(','));
 assert.equal(csv.length,400);assert.equal(new Set(D.confirmation.ids).size,400);
 assert.ok(D.confirmation.ids.every(id=>!new Set(M.survey.rows.map(r=>r.id)).has(id)));
 csv.forEach((row,i)=>{assert.equal(row[0]!.replaceAll('"',''),D.confirmation.ids[i]);assert.deepEqual(row.slice(1).map(Number),D.confirmation.responses[i]);});
 D.confirmation.responses.forEach((r,i)=>r.forEach((v,j)=>{assert.ok(Number.isInteger(v)&&v>=1&&v<=5);assert.equal(D.confirmation.recoded[i]![j],j===5?6-v:v);}));
});

test('Pearson and KMO screening values are independently reproduced on the stated matrix',()=>{
 const x=D.efa.rows;
 for(let i=0;i<6;i++)for(let j=0;j<6;j++)near(correlation(x.map(r=>r[i]!),x.map(r=>r[j]!)),D.efa.pearson[i]![j]!);
 const r=D.efa.pearson,inv=inverse(r);let squared=0,partial=0;
 for(let i=0;i<6;i++)for(let j=0;j<i;j++){squared+=r[i]![j]!**2;partial+=inv[i]![j]!**2/(inv[i]![i]!*inv[j]![j]!);}
 near(squared/(squared+partial),D.efa.kmo);
 assert.equal(D.efa.bartlett.df,15);assert.ok(D.efa.bartlett['p.value']<.001);
 assert.notDeepEqual(D.efa.polychoric,D.efa.pearson);
});

test('oblique communalities and rotated solutions reproduce the same common covariance',()=>{
 const solutions=[D.efa.unrotated,D.efa.orthogonal,D.efa.two];
 for(const fit of solutions){let error=0;
  for(let i=0;i<6;i++)for(let j=0;j<6;j++){
   let common=0;for(let h=0;h<2;h++)for(let k=0;k<2;k++)common+=fit.pattern[i]![h]!*fit.phi[h]![k]!*fit.pattern[j]![k]!;
   near(common,fit.common[i]![j]!);near(common,D.efa.two.common[i]![j]!,2e-5);
   if(i===j){near(common,fit.h2[i]!);near(1-common,fit.uniqueness[i]!);assert.ok(fit.uniqueness[i]!>0);}else if(i>j)error+=(D.efa.polychoric[i]![j]!-common)**2;
  }
  near(Math.sqrt(error/15),fit.rms);
 }
 for(let i=0;i<6;i++)for(let j=0;j<2;j++)near(sum(D.efa.two.pattern[i]!.map((v,h)=>v*D.efa.two.phi[h]![j]!)),D.efa.two.structure[i]![j]!);
 assert.ok(Math.abs(D.efa.two.phi[0]![1]!)>.1);
 assert.ok(D.efa.one.rms>D.efa.two.rms*5);assert.equal(D.efa.three.df,0);
});

test('ordinal permutation reference has the stated repetitions and quantiles, with sequential retention',()=>{
 const p=D.efa.parallel;assert.equal(p.trials.length,199);assert.equal(p.repetitions,199);
 for(let j=0;j<6;j++){const values=p.trials.map(r=>r[j]!).sort((a,b)=>a-b),at=(values.length-1)*.95,lo=Math.floor(at),q=values[lo]!+(at-lo)*(values[lo+1]!-values[lo]!);near(q,p.null95[j]!);}
 assert.equal(p.observed.findIndex((v,i)=>v<=p.null95[i]!),2);
 assert.ok(p.observed[2]!<0,'SMC-reduced eigenvalues may be negative; not an original-variance plot');
});

test('ordinal CFA restrictions, implied correlations and reported misfit agree',()=>{
 const c=D.confirmation.two;assert.equal(c.n,400);assert.equal(c.freeParameters,31);assert.equal(c.parameters.filter(p=>p.op==='|').length,24);
 assert.equal(c.measures['df.scaled'],8);assert.ok(c.converged&&c.admissible);
 for(let i=0;i<6;i++)for(let j=0;j<6;j++){
  const fi=i<3?0:1,fj=j<3?0:1;
  const common=c.loadings[i]![fi]!*c.phi[fi]![fj]!*c.loadings[j]![fj]!;
  near(c.implied[i]![j]!,common+(i===j?c.theta[i]![i]!:0));
  near(c.residual[i]![j]!,c.observed[i]![j]!-c.implied[i]![j]!);
 }
 assert.ok(c.measures['chisq.scaled']<D.confirmation.one.measures['chisq.scaled']);
 assert.ok(c.measures['pvalue.scaled']<.001);assert.ok(c.measures['rmsea.scaled']>.05);
 assert.ok(c.measures['rmsea.ci.lower.scaled']<c.measures['rmsea.scaled']&&c.measures['rmsea.scaled']<c.measures['rmsea.ci.upper.scaled']);
 assert.ok(c.maxResidual>.05,'local misfit is part of the teaching example, not hidden by a pass claim');
});

test('SEM path products, delta uncertainty and the direction-reversed equivalent model agree',()=>{
 const {a,b,c,indirect,total}=semPaths;near(a.est*b.est,indirect.est);near(c.est+indirect.est,total.est);
 const cov=D.sem.pathCovariance;
 const quad=(g:number[])=>sum(g.map((v,i)=>sum(g.map((w,j)=>v*cov[i]![j]!*w))));
 near(indirect.se**2,quad([b.est,a.est,0]),1e-9);near(total.se**2,quad([b.est,a.est,1]),1e-9);
 for(const p of [a,b,c,indirect,total]){assert.ok(p['ci.lower']<p.est&&p.est<p['ci.upper']);near(p['ci.upper']-p.est,1.95996398454005*p.se,1e-7);}
 for(const key of ['chisq.scaled','df.scaled','srmr'] as const)near(D.sem.fit.measures[key],D.sem.reverse.measures[key],1e-6);
 D.sem.fit.implied.forEach((r,i)=>r.forEach((v,j)=>near(v,D.sem.reverse.implied[i]![j]!,1e-6)));
});

test('all new pages have resolvable evidence and public copy free of lesson-author instructions',()=>{
 assert.deepEqual([eight.length,nine.length],[48,52]);const titles=new Set<string>();
 for(const [li,lesson] of [eight,nine].entries()){
  assert.ok(lesson.filter(p=>p.visual).length>=30);
  for(const p of lesson){assert.ok(!titles.has(p.title),p.title);titles.add(p.title);assert.ok(p.note.length>15&&p.question.endsWith('？'));
   assert.doesNotMatch([p.title,p.lead,p.caption,...p.text].join(' '),/让学生|告诉学生|先拆掉|今天不先|不背口号|教师应当|备课说明|本页讲解重点/);
   for(const id of [p.visual,p.second].filter((v):v is string=>Boolean(v)))assert.ok(id in factorTables||id in factorEvidenceText||id==='survey-distribution',id);
   if(p.image)assert.ok(existsSync(new URL(`../../teacher-web/public/course-assets/statistical-analysis/images/${p.image}.png`,import.meta.url)));
  }
  near(sum(slides.filter(p=>p.lesson===li+8).map(p=>p.minutes)),90);
 }
 assert.doesNotMatch(JSON.stringify(factorTables),/让学生|告诉学生|教师应当|备课说明/);
 assert.ok(eight.findIndex(p=>p.visual==='efa-items')<eight.findIndex(p=>p.visual==='efa-pattern'));
 assert.ok(nine.findIndex(p=>p.visual==='cfa-frozen')<nine.findIndex(p=>p.visual==='cfa-chi'));
});

test('current-page context distinguishes samples and withholds later exercise feedback',()=>{
 for(const p of slides.filter(p=>p.lesson>=8&&p.lesson<=9)){
  const w=buildPromptWorkspace('statistical-analysis','统计分析方法',undefined,p.index);
  assert.equal(w.coverage.slides,642);assert.match(w.compiled,/独立C001—C400/);assert.match(w.compiled,/第14—16讲仍待建设/);
  assert.doesNotMatch(p.assistantCue,/第8讲仍待建设|第9讲仍待建设/);
 }
 const cue=(lesson:number,local:number)=>slides.find(p=>p.lesson===lesson&&p.localIndex===local)!.assistantCue;
 assert.doesNotMatch(cue(8,41),/内部一致性不确定维数/);assert.match(cue(8,42),/内部一致性不确定维数/);
 assert.doesNotMatch(cue(9,48),/时间顺序仍无设计保证/);assert.match(cue(9,49),/时间顺序仍无设计保证/);
 assert.doesNotMatch(cue(8,6),/3\.064372|1\.349433|SMC约化矩阵特征值/,'opening correlation page must not reveal later extraction results');
 assert.match(cue(9,26),/拒绝/);assert.match(cue(9,40),/delta/);
 assert.doesNotMatch(cue(9,20),/生成时|生成数据时|\.14\*R/,'a diagnostic page must not smuggle in the simulation generator as the answer');
 assert.match(cue(9,20),/T1\/R3/);assert.match(cue(9,20),/T2\/R2/);
});
