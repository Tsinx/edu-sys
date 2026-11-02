"""Independent CSV checks and hand calculations. Does not call analysis.py."""
from pathlib import Path
import csv,json,hashlib,math
ROOT=Path(__file__).resolve().parent
result=json.loads((ROOT/'outputs/results.json').read_text(encoding='utf-8'))
manifest=json.loads((ROOT/'source-manifest.json').read_text(encoding='utf-8'))
rows=[]
for split in ['train','dev','test']:
    p=ROOT/'data/raw'/f'{split}.csv';b=p.read_bytes()
    assert hashlib.sha256(b).hexdigest()==manifest['files'][split]['sha256']
    with p.open(encoding='utf-8-sig',newline='') as f:part=list(csv.DictReader(f))
    assert len(part)==manifest['files'][split]['rows']
    rows.extend([dict(r,split=split) for r in part])
assert len(rows)==46730 and len({r['id'] for r in rows})==46730
by_id={int(r['id']):r for r in rows}
for e in result['excerpts']:assert all(p in by_id[e['id']]['review'] for p in e['parts'])
# Exact substring count is independently appropriate for these three fixed words.
toy=[[e['text'].count(w) for w in ['味道','牛角包','上菜速度']] for e in result['excerpts']]
assert toy==[[2,0,0],[1,0,1],[1,2,0]]==result['toy']['counts']
df=[sum(row[j]>0 for row in toy) for j in range(3)]
idf=[math.log(4/(1+n))+1 for n in df]
for i,row in enumerate(toy):
    for j,tf in enumerate(row):assert abs(tf*idf[j]-result['toy']['weights'][i][j])<1e-12
with (ROOT/'outputs/word-counts.csv').open(encoding='utf-8',newline='') as f:words=list(csv.DictReader(f))
total=sum(int(r['count']) for r in words)
assert total==result['frequency']['total_tokens']
for r in words:
    assert 0<int(r['documents'])<=int(r['count'])
    assert abs(float(r['relative_frequency'])-int(r['count'])/total)<1e-12
for r in result['frequency']['top']:
    saved=next(w for w in words if w['word']==r['word'])
    assert (int(saved['count']),int(saved['documents']))==(r['count'],r['documents'])
with (ROOT/'outputs/test-predictions.csv').open(encoding='utf-8',newline='') as f:pred=list(csv.DictReader(f))
cm=[[0,0],[0,0]]
for r in pred:
    original=by_id[int(r['id'])];gold=int(int(original['Service#Timely'])==-1)
    assert original['split']=='test' and gold==int(r['actual'])
    label=int(float(r['probability'])>=.5);assert label==int(r['predicted'])
    cm[gold][label]+=1
assert len(pred)==4940
tn,fp=cm[0];fn,tp=cm[1];m=result['classifier']['metrics']
assert (tn,fp,fn,tp)==(m['tn'],m['fp'],m['fn'],m['tp'])
assert abs(tp/(tp+fp)-m['precision'])<1e-14
assert abs(tp/(tp+fn)-m['recall'])<1e-14
with (ROOT/'outputs/validation-predictions.csv').open(encoding='utf-8',newline='') as f:validation=list(csv.DictReader(f))
dev_cm=[[0,0],[0,0]]
for r in validation:
    original=by_id[int(r['id'])];gold=int(int(original['Service#Timely'])==-1)
    assert original['split']=='dev' and gold==int(r['actual'])
    label=int(float(r['probability'])>=.5);assert label==int(r['predicted'])
    dev_cm[gold][label]+=1
assert len(validation)==4940
v=result['classifier']['validation']
assert (dev_cm[0][0],dev_cm[0][1],dev_cm[1][0],dev_cm[1][1])==(v['tn'],v['fp'],v['fn'],v['tp'])
w=result['classifier']['worked'];eta=w['intercept']+w['other']+sum(t['weight']*t['coefficient'] for t in w['top'])
assert abs(eta-w['eta'])<1e-12 and abs(1/(1+math.exp(-eta))-w['probability'])<1e-12
for a in result['aspects']:
    values=[int(r[a['column']]) for r in rows]
    mentioned=sum(v!=-2 for v in values);negative=values.count(-1)
    assert (mentioned,negative)==(a['mentioned'],a['negative'])
    assert abs(negative/mentioned-a['negative_share'])<1e-14
checks={'original_hashes':'pass','all_excerpts':'pass','independent_toy_counts':'pass','independent_toy_weights':'pass','full_word_table_totals':'pass','all_test_predictions_and_metrics':'pass','all_validation_predictions':'pass','independent_logit_prediction':'pass','six_aspect_counts':'pass','word_tokens':total,'test_confusion':cm,'validation_confusion':dev_cm}
(ROOT/'outputs/independent-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(checks,ensure_ascii=False,indent=2))
