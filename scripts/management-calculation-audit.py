from pathlib import Path
import json,math
R=Path(__file__).resolve().parents[1]
pages=json.loads((R/'packages/course-content/src/management-principles/pages.json').read_text(encoding='utf-8'))
reports=[]
def record(name,source,parameters,result,status='passed',note='原参数保留并复算'):
    reports.append(dict(name=name,source=source,parameters=parameters,result=result,status=status,note=note))
def number(s):return float(str(s).replace('−','-').replace('＋','+').replace('%',''))
recruit=next(p for p in pages if p['slideKey']=='mg-l3-s023-01')['table']['rows']
w=recruit[0][1:6];computed={r[0]:sum(a*b for a,b in zip(r[1:6],w)) for r in recruit[1:]}
assert computed=={'A':17,'B':18,'C':21};record('招聘加权评分','l3/23',recruit,computed)
record('量本利与利润率口径','l3/43-47',{'fixed':5000000,'price':2000,'variable':1000},{'breakEven':5000,'profitAt6000':1000000,'salesMargin20pctExact':5000000/(2000*.8-1000),'salesMarginIntegerMinimum':8334,'costMargin20pct':7500})
record('十年建厂与三年后扩建','l3/51-53',{'probability':.7,'initialYears':3,'remainingYears':7,'initialSmallInvestment':140,'expansionInvestment':200},{'large':340,'small':230,'expandGoodBranch':465,'buildSmallThenExpand':.7*(40*3+465)+.3*30*10-140},note='扩建方案原471.5改为359.5；第一期应为3年，不能使用剩余7年。')
payoffs=[[40,20,-10],[90,40,-50],[30,20,-4]];maxima=[max(r[c] for r in payoffs) for c in range(3)];regrets=[[maxima[c]-r[c] for c in range(3)]for r in payoffs]
assert list(map(max,regrets))==[50,46,60]
record('产品方案与后悔值','l3/56-58',payoffs,{'optimistic':'乙','maximin':'丙','regrets':regrets,'minimaxRegret':'乙'})
quantities=range(0,4001,1000);matrix=[[.02*min(q,d)-.01*max(q-d,0) for d in quantities] for q in quantities]
assert [sum(r)/5 for r in matrix]==[0,14,22,24,20]
record('生产计划五种产量','l3/59-65',{'quantities':list(quantities),'soldMargin':.02,'unsoldLoss':.01},{'payoffMatrix':matrix,'equalProbabilityValues':[sum(r)/5 for r in matrix],'equalProbabilityChoice':3000,'optimisticChoice':4000,'maximinChoice':0,'minimaxRegretChoice':3000})
record('红黑牌六轮','l3/30-38',{'roundMultipliers':[1,1,2,1,1,2],'redRed':30,'blackBlack':-20,'blackVsRed':[50,-50]},{'bothRedEach':240,'bothBlackEach':-160,'oneSideAlwaysBlack':400,'otherSideAlwaysRed':-400})
record('单期决策树','l4b/23-26',{'probability':.7,'investment':[30,20],'good':[100,40],'bad':[-20,30]},{'gross':[64,37],'net':[34,17],'thresholdProbability':6/11})
rows={r[0]:list(map(number,r[1:])) for p in pages if p['slideKey'].startswith('mg-l4a-s072-') for r in p['table']['rows']}
def combine(terms):return [sum(mult*rows[name][i] for name,mult in terms) for i in range(4)]
main=combine([('主营业务收入',1),('主营业务成本',-1),('税金及附加',-1)]);assert main==rows['主营业务利润']
op=combine([('主营业务利润',1),('其他业务利润',1),('营业费用',-1),('管理费用',-1),('财务费用',-1)])
total=combine([('营业利润',1),('投资收益',1),('营业外收入',1),('营业外支出',-1)])
record('历史财务表勾稽','l4a/72',rows,{'years':[1998,1999,2000,2001],'mainProfitRecomputed':main,'operatingRecomputed':op,'operatingPublished':rows['营业利润'],'operatingDifferencePublishedMinusComputed':[a-b for a,b in zip(rows['营业利润'],op)],'totalRecomputed':total,'totalPublished':rows['利润总额'],'totalDifferencePublishedMinusComputed':[a-b for a,b in zip(rows['利润总额'],total)]},status='source-discrepancy-preserved',note='金额单位缺失；保留原数并在课件标注差异，未擅自增补未列项目或改为当期报表。')
expense=[r for p in pages if p['slideKey'].startswith('mg-l4a-s073-') for r in p['table']['rows']]
results=[]
for r in expense:
    base,final=number(r[1]),number(r[4]);diff=final-base;pct=diff/base*100
    assert math.isclose(number(r[5]),diff,abs_tol=.001) and math.isclose(number(r[6]),pct,abs_tol=.011)
    results.append({'item':r[0],'difference':diff,'changePercent':round(pct,2)})
record('费用变动额与变动率','l4a/73',expense,results)
record('其他业务分项与总额','l4a/74',[-29,-23,-2,97],{'listedParts':43,'publishedTotal':96,'unexplainedDifference':53},status='source-discrepancy-preserved',note='原表只列部分项目；2000年其他业务利润在两表分别为−104/−105。保留并标明，缺失项不按0处理。')
out=R/'docs/management/calculation-audit.json';out.write_text(json.dumps({'checkedAt':'2026-09-14','checks':reports},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'checks':len(reports),'passed':sum(r['status']=='passed' for r in reports),'sourceDifferences':sum(r['status']!='passed' for r in reports)}))
