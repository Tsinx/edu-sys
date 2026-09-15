"""Independent recomputation of phase-two source figures and teaching models."""
from pathlib import Path
from math import ceil
import json, datetime

root=Path(__file__).resolve().parents[1]
durations=dict(A=5,B=2,C=8,D=10,E=5,F=10,G=11,H=10)
predecessors=dict(A=[],B=['A'],C=['A'],D=['B','C'],E=['C'],F=['D'],G=['D','E'],H=['F','G'])
earliest={}
for task,duration in durations.items():
    start=max([earliest[p]['finish'] for p in predecessors[task]],default=0)
    earliest[task]={'start':start,'finish':start+duration}
finish=max(v['finish'] for v in earliest.values())
latest={}
for task in reversed(durations):
    successors=[p for p,ps in predecessors.items() if task in ps]
    end=min([latest[p]['start'] for p in successors],default=finish)
    latest[task]={'start':end-durations[task],'finish':end}
rows=[dict(task=t,duration=d,predecessors=predecessors[t],ES=earliest[t]['start'],EF=earliest[t]['finish'],LS=latest[t]['start'],LF=latest[t]['finish'],slack=latest[t]['start']-earliest[t]['start']) for t,d in durations.items()]
critical=[r['task'] for r in rows if r['slack']==0]
assert finish==44 and critical==list('ACDGH')
assert [r['slack'] for r in rows]==[0,6,0,0,5,1,0,0]
def hierarchy(base,span):
    levels=[base]
    while levels[-1]>1:levels.append(ceil(levels[-1]/span))
    return dict(base=base,span=span,levels=levels,managers=sum(levels[1:]),managementLevels=len(levels)-1,totalLevels=len(levels))
original=[hierarchy(4096,s) for s in [4,8]]
assert [r['managers'] for r in original]==[1365,585]
assert [r['totalLevels'] for r in original]==[7,5]
model=[hierarchy(64,s) for s in range(2,9)]
assert [r['managers'] for r in model]==[63,34,21,17,14,13,9]
report={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'passed',
 'cpm':{'source':'l5 p25','duration':finish,'criticalPath':critical,'activities':rows,'boundary':'原教学时间单位，资源无限制的确定性依赖模型；未补造实际单位或PERT三点估计'},
 'originalSpan':{'source':'l6 p50','results':original},'interactiveSpan':{'basePeople':64,'range':[2,8],'rounding':'每层向上取整','results':model,'boundary':'最少容纳岗位教学模型，不代表现实组织最优幅度'},
 'recruitment':{'source':'l7 p32–33','applications':'130多份','screened':31,'candidates':3,'interviewGroups':[10,10,11],'sum':sum([10,10,11]),'boundary':'初始分母不精确，未计算精确初筛比例；3/31为候选环节比例，不等于最终录用率'},
 'pdca':{'source':'l5 p38–40','cadence':'每两周2款，持续半年','boundary':'半年不是统一26周，没有日期和实际推出记录，不反推实际总款数、销量或利润'},
 'saic':{'source':'l8 p30–33','periodSpecificStakes':{'2004 signing report':'48.9%','2005 agreement in 2006 report':'48.917%','2006-06-30':'51.10%','2009-01 announcement':'51.33%'},'boundary':'不同期间比例保留原精度；2009年失去控制与仍持股分开解释'}}
out=root/'output/management-principles/qa-phase2/calculation-audit.json';out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'passed','CPM':finish,'spanCases':len(model)+len(original),'report':str(out)}))
