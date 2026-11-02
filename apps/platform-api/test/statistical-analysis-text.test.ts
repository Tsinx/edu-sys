import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TEXT_DATA as D,researchLessonFifteen as pages,getStatisticalAnalysisSlide,textTiming} from '@edu/course-content/statistical-analysis';
import {statisticalAnalysisTeacherScripts as scripts} from '@edu/course-content/statistical-analysis/teacher-scripts';
test('word counts precede df and TF-IDF, and every number remains traceable',()=>{
 assert.equal(pages.length,54);assert.equal(D.n,46730);
 assert.deepEqual(pages.flatMap((p,i)=>p.stableKey&&!/stats-l15-\d+$/.test(p.stableKey)?[[i+1,p.stableKey]]:[]),[[11,'stats-l15-aggregate'],[32,'stats-l15-vocabulary'],[33,'stats-l15-learning'],[35,'stats-l15-validation'],[36,'stats-l15-input'],[38,'stats-l15-probability']]);
 for(let old=1;old<=48;old++)assert.equal(pages.filter(p=>p.stableKey==='stats-l15-'+String(old).padStart(2,'0')).length,1);
 assert.deepEqual(pages.flatMap((p,i)=>p.kind==='question'?[i+1]:[]),[7,16,23,29,41,50]);
 assert.match([pages[8]!.lead,...pages[8]!.text].join(' '),/相对频率/);
 assert.match(pages[8]!.text.join(' '),/4\/7≈57.1%/);
 assert.match(pages[17]!.title,/文档频数/);
 assert.equal(pages.findIndex(p=>Boolean(p.formula)),20);
 assert.match(pages[21]!.text.join(' '),/TF.*当前段.*次数/);
 assert.deepEqual(D.toy.counts,[[2,0,0],[1,0,1],[1,2,0]]);
 assert.deepEqual(D.toy.document_frequency,[3,1,1]);
 assert.ok(Math.abs(D.toy.weights[2][1]-2*(Math.log(2)+1))<1e-12);
 assert.ok(D.frequency.top.some(r=>r.word==='味道'&&r.count>r.documents));
 const m=D.classifier.metrics;assert.equal(m.tn+m.fp+m.fn+m.tp,4940);
 assert.equal(m.precision,m.tp/(m.tp+m.fp));assert.equal(m.recall,m.tp/(m.tp+m.fn));
 const v=D.classifier.validation;assert.equal(v.tn+v.fp+v.fn+v.tp,4940);
 assert.equal(D.classifier.validation_preview.length,3);
 assert.equal(new Set(D.classifier.validation_preview.map(r=>r.id)).size,3);
 for(const a of D.aspects){assert.equal(a.negative+a.neutral+a.positive,a.mentioned);assert.equal(a.mentioned+a.unmentioned,D.n);}
});
test('practice has actual time and classroom material stays direct and private notes stay separate',()=>{
 const times=pages.map((_,i)=>textTiming(i+1));
 assert.equal(times.reduce((n,t)=>n+t.spokenSeconds,0),3600);
 assert.equal(times.filter(t=>t.practice).reduce((n,t)=>n+t.pauseSeconds,0),1200);
 assert.equal(times.filter(t=>!t.practice).reduce((n,t)=>n+t.pauseSeconds,0),600);
 assert.ok(new Set(times.map(t=>t.spokenSeconds)).size>6);
 for(let i=0;i<pages.length;i++){
  const p=pages[i]!,s=getStatisticalAnalysisSlide(691+i),speech=scripts.find(x=>x.slideKey===s.slideKey)!;
  assert.doesNotMatch([p.title,p.lead,...p.text,p.caption,p.question,...speech.paragraphs].join('\n'),/证据|边界|让学生|告诉学生|宏平均F1|四分类调参|不能说明/);
  if(p.kind==='question'){
   assert.equal(pages[i+1]!.kind,'feedback');
   assert.ok(!s.assistantCue.includes(pages[i+1]!.text[0]??pages[i+1]!.caption));
  }
 }
});
test('portable package retains originals and its tutorial shows intermediate operations',()=>{
 const root=new URL('../../../apps/teacher-web/public/course-assets/statistical-analysis/text-15/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8')) as Record<string,string>;
 for(const f of ['data/raw/train.csv','data/raw/dev.csv','data/raw/test.csv','classroom.ipynb','outputs/word-counts.csv','outputs/toy-counts.csv','outputs/toy-weights.csv','outputs/validation-predictions.csv'])assert.ok(manifest[f]);
 for(const [name,sha] of Object.entries(manifest))assert.equal(createHash('sha256').update(readFileSync(new URL(name,root))).digest('hex'),sha);
 const notebook=JSON.parse(readFileSync(new URL('classroom.ipynb',root),'utf8'));
 const source=notebook.cells.map((c:any)=>c.source.join('')).join('\n');
 for(const key of ['Counter','document_frequency','toy_counts*idf','confusion_matrix','tp/(tp+fp)','tp/(tp+fn)'])assert.ok(source.includes(key));
 assert.ok(source.indexOf('## 4. 从词频到TF-IDF')<source.indexOf('document_counts=Counter()'));
 assert.ok(source.indexOf('X_dev=')<source.indexOf('X_test='));
 assert.doesNotMatch(source,/result = run\(\)|train_classifier\(parts\)/);
 assert.ok(notebook.cells.filter((c:any)=>c.cell_type==='code').every((c:any)=>c.execution_count&&c.outputs.every((o:any)=>o.output_type!=='error')));
});
