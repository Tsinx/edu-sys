"""Read-only comparison report. Candidates are not disposition decisions."""
import hashlib,json,pathlib,re,difflib
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'output/management-principles/source-phase3'
decks={d['id']:d for d in json.loads((SRC/'corpus.json').read_text('utf8'))['decks']}
def normtiming(v):return re.sub(r'\b(?:id|spid)="[^"]*"','id="REF"',v or '')
def sig(s):return {'text':s['paragraphs'],'images':sorted(hashlib.sha256((SRC/i).read_bytes()).hexdigest() for i in s['images']),'notes':s['notes'],'timing':normtiming(s['timing'])}
main=[sig(s) for s in decks['l10']['slides']]
result=[]
for id in ['l10a','l10b']:
 for s in decks[id]['slides']:
  a=sig(s)
  ranked=sorted(enumerate(main,1),key=lambda q:(a==q[1],a['images']==q[1]['images'],a['text']==q[1]['text'],difflib.SequenceMatcher(None,'\n'.join(a['text']),'\n'.join(q[1]['text'])).ratio()),reverse=True)[:3]
  candidates=[{'page':n,'same':{k:a[k]==b[k] for k in a},'textRatio':round(difflib.SequenceMatcher(None,'\n'.join(a['text']),'\n'.join(b['text'])).ratio(),3)} for n,b in ranked]
  result.append({'documentId':id,'page':s['page'],'candidates':candidates,'notes':a['notes']})
out=ROOT/'output/management-principles/qa-phase3/l10-duplicate-candidates.json'
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n','utf8')
for r in result:
 best=r['candidates'][0]
 print(r['documentId'],r['page'],'->',best['page'],','.join(k for k,v in best['same'].items() if not v),'notes=',r['notes'])
