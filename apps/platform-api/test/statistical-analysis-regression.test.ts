import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {REGRESSION_DATA as d,regressionLessons,STATISTICAL_ANALYSIS_SLIDES as slides,STATISTICAL_ANALYSIS_DATA as original} from '@edu/course-content/statistical-analysis';

test('regression projection copy is individually authored, sourced and has resolvable evidence',()=>{
 assert.deepEqual(regressionLessons.map(l=>l.length),[48,50,52]);
 const titles=new Set<string>();
 for(const [li,lesson] of regressionLessons.entries()){
  assert.ok(lesson.filter(p=>p.visual).length>=20);
  assert.equal(new Set(lesson.flatMap(p=>p.image?[p.image]:[])).size,12);
  for(const p of lesson){
   assert.ok(!titles.has(p.title),p.title);titles.add(p.title);
   assert.ok(p.note.length>10&&p.question.endsWith('？'));
   assert.doesNotMatch([p.title,p.lead,p.caption,...p.text].join(' '),/让学生|告诉学生|先拆掉|今天不先|不背口号|教师应当|备课说明/);
   for(const id of [p.visual,p.second].filter((v):v is string=>Boolean(v)))assert.ok(id in d.plots||id in d.tables||id==='collinear-table',id);
   if(p.image)assert.ok(existsSync(new URL(`../../teacher-web/public/course-assets/statistical-analysis/images/${p.image}.png`,import.meta.url)));
  }
  const pages=slides.filter(s=>s.lesson===li+3);assert.equal(pages.length,lesson.length);
  assert.ok(Math.abs(pages.reduce((sum,p)=>sum+p.minutes,0)-90)<1e-9);
 }
});

test('retail sample remains byte-identical and estimated coefficients solve normal equations',()=>{
 const raw=readFileSync(new URL('../../../packages/course-content/src/statistical-analysis/data.json',import.meta.url));
 assert.equal(createHash('sha256').update(raw).digest('hex'),d.originalDataSHA256);
 assert.ok(Math.abs(d.models.retail1.coefficients[1]!.b-150)<1e-9);
 assert.ok(Math.abs(d.models.retail2.coefficients[1]!.b+50)<1e-9);
 const b=d.models.retail3.coefficients.map(c=>c.b),sums=[0,0,0,0];
 for(const p of original.people){const x=[1,Number(p.member),Number(p.city==='甲'),p.income/1000],e=p.spend-x.reduce((s,v,i)=>s+v*b[i]!,0);x.forEach((v,i)=>sums[i]!+=v*e);}
 for(const s of sums)assert.ok(Math.abs(s)<1e-6);
 const train=new Set(d.models.split.train),holdout=new Set(d.models.split.test);assert.equal(train.size,360);assert.equal(holdout.size,120);assert.ok([...holdout].every(i=>!train.has(i)));
});

test('diagnostic fixes and HC3 distinguish mean specification from coefficient uncertainty',()=>{
 assert.ok(d.models.quadratic.rmse<d.models.curved.rmse/2);
 assert.deepEqual(d.models.hetero.coefficients.map(c=>c.b),d.models.heteroHC3.coefficients.map(c=>c.b));
 assert.notEqual(d.models.hetero.coefficients[1]!.se,d.models.heteroHC3.coefficients[1]!.se);
 assert.ok(Math.abs(d.models.influence.coefficients[1]!.b-d.models.leverage.coefficients[1]!.b)>.5);
});

test('centering preserves predictions; conditional slope bands bracket their estimates',()=>{
 const b=d.models.moderation.coefficients.map(c=>c.b),u=d.models.moderationUncentered.coefficients.map(c=>c.b);
 for(let i=0;i<d.synthetic.moderation.x.length;i++){
  const x=d.synthetic.moderation.x[i]!,z=d.synthetic.moderation.z[i]!;
  assert.ok(Math.abs((b[0]!+b[1]!*x+b[2]!*(z-3)+b[3]!*x*(z-3))-(u[0]!+u[1]!*x+u[2]!*z+u[3]!*x*z))<1e-9);
 }
 const c=d.plots['conditional-effect'],band=c.bands[0]!;
 c.series[0]!.values.forEach((v,i)=>{assert.ok(band.lo[i]!<v[1]!&&band.hi[i]!>v[1]!);assert.ok(Math.abs(v[1]!-(b[1]!+b[3]!*(v[0]!-3)))<1e-9);});
});

test('bank metrics reproduce from frozen row-level predictions and disjoint chronological partitions',()=>{
 assert.equal(d.bank.rows,41188);assert.deepEqual(d.bank.split,[28831,6178,6179]);assert.ok(!d.bank.features.includes('duration'));
 const rows=readFileSync(new URL('../../../docs/course/statistical-analysis/data/bank-evaluation.csv',import.meta.url),'utf8').trim().split('\n').slice(1).map(l=>l.split(','));
 const val=rows.filter(r=>r[1]==='validation'),t=rows.filter(r=>r[1]==='test');assert.equal(val.length,6178);assert.equal(t.length,6179);assert.equal(Number(val[0]![0]),28832);assert.equal(Number(t[0]![0]),35010);
 const cm=[[0,0],[0,0]];let squared=0,positive=0;
 for(const r of t){const y=Number(r[2]),p=Number(r[3]);assert.ok(p>=0&&p<=1);cm[y]![Number(p>=d.bank.metrics.threshold)]!++;squared+=(p-y)**2;positive+=y;}
 assert.deepEqual(cm,d.bank.confusion);assert.ok(Math.abs(squared/t.length-d.bank.metrics.brier)<1e-12);assert.equal(positive/t.length,d.bank.metrics.prevalence);
 if((cm[0]![1]??0)+(cm[1]![1]??0)===0)assert.equal(d.bank.metrics.precision,null);
 const loss=(threshold:number)=>val.reduce((s,r)=>s+Number(Number(Number(r[3])>=threshold)!==Number(r[2])),0);
 const selected=loss(d.bank.metrics.threshold);for(let i=1;i<100;i++)assert.ok(selected<=loss(i/100));
});
