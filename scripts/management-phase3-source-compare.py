"""Private evidence only. Hash equality proposes duplicates; it never deletes a source page."""
import json, hashlib, pathlib, re, xml.etree.ElementTree as ET
from PIL import Image, ImageChops, ImageStat
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'output/management-principles/source-phase3'
OUT=ROOT/'output/management-principles/qa-phase3'
OUT.mkdir(parents=True,exist_ok=True)
corpus=json.loads((SRC/'corpus.json').read_text('utf-8'))
decks={d['id']:d for d in corpus['decks']}
def write(name,value): (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n','utf-8')
def normalized_timing(value):
    if not value:return ''
    s=value if isinstance(value,str) else json.dumps(value,ensure_ascii=False,sort_keys=True)
    # IDs refer to drawing objects, not teaching order. The raw XML remains in the corpus.
    return re.sub(r'\b(?:id|spid)="[^"]*"', 'id="REF"',s)
def signature(s):
    return {'paragraphs':s['paragraphs'],'imageHashes':sorted(hashlib.sha256((SRC/i).read_bytes()).hexdigest() for i in s['images']),
            'notes':s['notes'],'timing':normalized_timing(s['timing'])}
legacy=[]
for id in ['l11','l12','l13','l14','l15','l16']:
    for n in range(1,decks[id]['pages']+1):
        a=Image.open(SRC/'renders'/id/f'{n:03}.png').convert('RGB')
        b=Image.open(SRC/'parsed-renders'/id/f'{n:03}.png').convert('RGB')
        same_size=a.size==b.size
        diff=ImageChops.difference(a,b) if same_size else None
        legacy.append({'documentId':id,'page':n,'sameSize':same_size,'pixelIdentical':same_size and diff.getbbox() is None,
                       'meanAbsoluteChannelDifference':ImageStat.Stat(diff).mean if same_size else None})
write('legacy-conversion-pixel-comparison.json',legacy)
pairs={1:43,2:44,8:45,14:46,15:47,16:48,17:49,18:50,19:51,20:52,21:53,22:54,23:55,24:56,25:57,26:58,27:59,39:60,57:45}
review=[]
for alt,main in pairs.items():
    a,b=decks['l9b']['slides'][alt-1],decks['l9']['slides'][main-1]
    x,y=signature(a),signature(b)
    review.append({'source':'l9b','page':alt,'targetDocument':'l9','targetPage':main,
                   'equalFields':{k:x[k]==y[k] for k in x},'sourceNotes':a['notes'],'targetNotes':b['notes'],
                   'sourceTiming':a['timing'],'targetTiming':b['timing'],'manualVisualReview':'completed 2026-09-19; contact sheets and individual dense-page views',
                   'decision':'requires semantic review of any differing field'})
write('l9-duplicate-comparison.json',review)
print(json.dumps({'legacyPages':len(legacy),'pixelIdentical':sum(r['pixelIdentical'] for r in legacy),'l9Pairs':len(review),'pairDifferences':[{ 'page':r['page'], 'fields':[k for k,v in r['equalFields'].items() if not v]} for r in review]},ensure_ascii=False))
