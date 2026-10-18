import D from './causal-data.json' with {type:'json'};
export const CAUSAL_DATA=D;
export const cf=(n:number,d=2)=>n.toFixed(d);
type Cell=string|number;
export interface CausalTable {headers:string[];rows:Cell[][]}
const tab=(headers:string[],rows:Cell[][]):CausalTable=>({headers,rows});
const sid=(i:number)=>D.stores[i]!.id;
const modelNames=['混合OLS','门店FE','门店 + 月份FE'];
const modelRows=D.models.map((m,i)=>[modelNames[i]!,cf(m.beta,3),cf(m.se,3),`[${m.ci.map(v=>cf(v,3)).join(', ')}]`]);
const smd=(key:'rawSmd'|'matchedSmd'|'weightedSmd')=>D.balance.map(b=>[b.label,cf(b.rawSmd,3),cf(b[key],3)]);
export const causalTables:Record<string,CausalTable>={
 'baseline-ledger':tab(['门店','参加培训','前期月均销售','面积m²','中心区'],D.stores.slice(0,5).map(s=>[s.id,s.treated,cf(s.before),cf(s.area,1),s.urban])),
 'baseline':tab(['培训前条件','培训组 n=59','比较组 n=61'],D.balance.map((b,i)=>[b.label,cf(b.treated,i===2?3:2),cf(b.control,i===2?3:2)])),
 'propensity-model':tab(['输入','定义','时点'],[['前期月均销售','第1—12月平均，万元/月','培训前'],['面积','营业面积，m²','培训启动前'],['中心区','是1，否0','培训启动前'],['模型输出','参加培训的估计概率','不代表培训效果']]),
 'pairs':tab(['培训店','比较店','logit距离','后期销售差'],D.matching.pairs.slice(0,5).map(([i,j,gap])=>[sid(i!),sid(j!),cf(gap!,4),cf(D.stores[i!]!.after-D.stores[j!]!.after)])),
 'balance-matched':tab(['协变量','原始SMD','匹配后SMD'],smd('matchedSmd')),
 'balance-weighted':tab(['协变量','原始SMD','加权后SMD'],smd('weightedSmd')),
 'weight-examples':tab(['估计参加概率e','比较店权重 e/(1−e)','含义'],[['0.20','0.25','较少代表目标条件'],['0.50','1.00','一份相对权重'],['0.80','4.00','更多代表目标条件']]),
 'comparison':tab(['比较','差额 万元/月','目标 / 解释边界'],[['原始均值差',cf(D.rawDifference),'观察性组间差异'],['卡钳匹配',cf(D.matching.estimate),'50家保留培训店；无区间'],['ATT加权',cf(D.weighting.estimate),'59家培训店；平衡仍不足']]),
 'report-ten':tab(['报告项目','本例内容'],[['目标','59家参加培训店的ATT；匹配只保留50家'],['设计','培训前三协变量；有放回1∶1卡钳匹配 / ATT权重'],['诊断','9家未匹配；加权后仍有剩余不平衡'],['加权结果',`${cf(D.weighting.estimate)}，百分位95% CI [${D.weighting.ci.map(v=>cf(v)).join(', ')}]`],['限制','依赖识别、模型与抽样假设；未测混杂仍可能存在']]),
 'panel-ledger':tab(['门店','月','参加组G','培训状态D','净销售 万元'],[0,1,11,12,23,24,36].map(i=>{const r=D.panel[i]!;return[r.id,r.month,r.treated,r.training,cf(r.sales)];})),
 'panel-key':tab(['示意记录','门店—月份键','处理'],[['M示例01 / 月3 / 46','同一键出现两次','核查重复或先按口径汇总'],['M示例01 / 月3 / 46','同一键出现两次','不能把重复当新观察'],['M示例01 / 月4 / 未知','缺失键','核查资料，不补零']]),
 'toy-raw':tab(['概念门店','第1期','第2期','第3期','店内均值'],[['A',40,42,44,42],['B',50,52,54,52]]),
 'toy-demean':tab(['概念门店','第1期偏离','第2期偏离','第3期偏离'],[['A','40−42=−2','42−42=0','44−42=2'],['B','50−52=−2','52−52=0','54−52=2']]),
 'toy-centered':tab(['概念门店','原均值','偏离序列','偏离加总'],[['A',42,'−2，0，2',0],['B',52,'−2，0，2',0]]),
 'time-invariant':tab(['变量','每店是否随时间变','组内变换后'],[['固定区位','不变','全部为0，被门店效应吸收'],['固定营业面积','本例不变','全部为0，被门店效应吸收'],['参加组别G','不变','全部为0'],['培训状态D','部分门店第13月改变','保留可用于估计的变化']]),
 'model-table':tab(['相同样本的模型','系数','聚类SE','95% CI'],modelRows),
 'report-eleven':tab(['项目','双向FE主报告'],[['结果与处理','月净销售额（万元）；培训生效状态D'],['固定效应','门店 + 月份；共同加性斜率模型'],['系数 / 95% CI',`${cf(D.models[2]!.beta,3)} / [${D.models[2]!.ci.map(v=>cf(v,3)).join(', ')}]`],['样本 / 推断','2880行，120店，24月；门店CR1聚类，t₁₁₉'],['限制','严格外生性、无差异性同期混杂等条件仍需论证']]),
 'methods-bridge':tab(['比较设计','利用的信息','仍需说明'],[['匹配 / ATT加权','培训前已测条件','未测混杂、重叠与目标范围'],['门店FE','同店跨期变化','共同月份冲击、严格外生性'],['门店 + 月份FE','店内变化，剔除共同月份项','差异性时变混杂、作用结构与推断']]),
 'checklist':tab(['重建比较所需','核查问题'],[['资料','每行是谁，哪个月，结果口径是否一致？'],['模型','门店与月份项分别吸收了什么？'],['变化','培训状态剩余变化来自哪里？'],['推断','独立簇是什么，区间用什么方法？'],['解释','哪些同期变化或选择机制仍未排除？']]),
};
export interface CausalDiagram {steps:[string,string][]}
const diag=(...steps:[string,string][]):CausalDiagram=>({steps});
export const causalDiagrams:Record<string,CausalDiagram>={
 'direction':diag(['测量','题项与构念'],['模型','可检验的限制'],['设计','干预与比较对象']),
 'selection':diag(['原有经营条件','规模、销售与区位'],['培训参加','并非随机分配'],['后期销售','不只可能受培训影响']),
 'target':diag(['对象与处理','同一品牌120店；第13月启动方案'],['比较与结果','参加 / 未参加；后12月月均净销售'],['目标','先回答实际参加者的ATT']),
 'potential':diag(['同一门店i','同一后期窗口'],['参加时Yᵢ(1)','一种潜在结果'],['未参加时Yᵢ(0)','另一种潜在结果']),
 'effect':diag(['Yᵢ(1)','同店接受培训'],['减去Yᵢ(0)','同店不接受培训'],['τᵢ','个体效应，通常无法同时观测']),
 'observed':diag(['参加组D=1','观察Yᵢ(1)，缺Yᵢ(0)'],['比较组D=0','观察Yᵢ(0)，缺Yᵢ(1)']),
 'ate':diag(['全部目标门店','参加者 + 未参加者'],['两种状态','同一群体全部培训 / 全部不培训'],['ATE','目标总体的平均差异']),
 'att':diag(['59家参加门店','固定目标对象'],['已观测','这些店培训后的结果'],['缺失的比较','这些店没有培训时的结果']),
 'decomposition':diag(['观察均值差','两组实际结果相减'],['ATT','参加者自身的两种潜在结果差'],['选择差异','两组在未培训状态下原本的不同']),
 'covariate-time':diag(['培训前','销售、面积与区位'],['培训启动','D在第13月开始生效'],['培训后','服务评分可能是中介，不作基线']),
 'covariate-feedback':diag(['A与C','主设计使用的培训前条件'],['B','可能受培训影响的后期评分'],['仍需核查','遗漏的共同原因，而非只看相关强弱']),
 'direct-match':diag(['销售相近','还要看面积'],['面积相近','还要看区位'],['多维相似','一个变量相近不等于整体可比']),
 'matching-rule':diag(['距离','估计logit倾向得分之差'],['近邻','1∶1最近邻，有放回'],['卡钳',`最大距离 ${cf(D.matching.caliper,3)} = 0.2 × SD(logit)`]),
 'weight-intuition':diag(['培训组','保持目标人群'],['比较组','增加相似目标者的相对权重'],['加权后','重新构造条件分布，不制造新数据']),
 'att-weights':diag(['D=1','权重1'],['D=0','权重e/(1−e)'],['目标','向参加者条件分布靠拢']),
 'weighted-mean':diag(['培训组均值','按参加者等权平均'],['比较组均值','按ATT权重归一化平均'],['相减','单位：万元/店/月']),
 'judgment-ten':diag(['有帮助的证据','平衡诊断与估计区间'],['仍有的问题','剩余不平衡、未测混杂与支持'],['谨慎结论','有条件的估计，尚非培训有效的证明']),
 'stable-gap':diag(['可测条件相似','销售、面积、区位'],['仍可能不同','长期经营能力、组织基础'],['新的资料','同一批门店的逐月记录']),
 'panel-opening':diag(['横截面','每店一行，前后期摘要'],['展开月份','同一门店24次记录'],['下一步','利用店内变化，检查共同时间因素']),
 'panel-v-cross':diag(['面板','每月追踪同一批M编号'],['重复截面','每月另选门店，编号不延续']),
 'indices':diag(['i：门店','M001，M002，…，M120'],['t：月份','1，2，…，24'],['Yᵢₜ与Dᵢₜ','同店同月的一对记录']),
 'fe-model':diag(['αᵢ','门店稳定水平'],['βDᵢₜ','培训状态对应的共同斜率项'],['εᵢₜ','尚未解释的期内变化']),
 'fe-average':diag(['24期原模型','每月各有一条记录'],['店内求平均','αᵢ仍保持不变'],['均值模型','Ȳᵢ = αᵢ + βD̄ᵢ + ε̄ᵢ']),
 'fe-within':diag(['原值','Yᵢₜ 与 Dᵢₜ'],['减去店均值','Ȳᵢ 与 D̄ᵢ'],['留下','相对本店平均的偏离；αᵢ消去']),
 'equivalence':diag(['门店虚拟变量法','显式加入店别截距'],['组内去均值法','先吸收店别截距'],['相同斜率','同一变量、样本与设定']),
 'twfe-model':diag(['αᵢ','稳定、加性的门店差异'],['λₜ','各店共同的月份水平'],['βDᵢₜ + εᵢₜ','解释剩余变化，仍依赖模型条件']),
 'two-effects':diag(['店别固定差异','区位、长期经营水平'],['共同月份变化','品牌旺季、共同环境'],['未必吸收','某些店独有的同期促销']),
 'double-demean':diag(['减店均值','消去稳定店别水平'],['减月均值','消去共同月份水平'],['加总体均值','校正被重复减去的总水平']),
 'double-x':diag(['对销售额Y','减店均值，减月均值，加总均值'],['对培训状态D','使用完全相同的变换'],['回归','用两者剩余部分估计共同斜率']),
 'three-layers':diag(['控制','模型吸收了哪些项？'],['识别','剩余误差与处理有什么关系？'],['精度','标准误和区间怎样计算？']),
 'identification':diag(['所有店同月培训','状态只随月份变化'],['月份效应吸收','D没有剩余独立变化'],['无法单独估计','更多相同记录不恢复识别']),
 'strict-exogeneity':diag(['过去处理','不能关联当期误差'],['当期处理','不能关联当期误差'],['未来处理','也不能由当期经营冲击驱动']),
 'reverse-time':diag(['某月销售骤降','当期经营冲击'],['决定下月培训','未来处理由当期冲击驱动'],['严格外生性风险','滞后处理不自动修复反馈']),
 'varying-confounder':diag(['培训启动','参加店在第13月开始'],['同期促销','也只在参加店开展'],['销售变化','两种变化难以从简单FE中区分']),
 'judgment-eleven':diag(['已经控制','加性稳定店别项与共同月份项'],['仍需论证','严格外生性与差异性同期变化'],['不能推出','控制了所有因素或得到真实作用']),
 'next-design':diag(['对象不变','同一批门店'],['时点明确','第13月启动'],['下一讲的问题','未培训时本来的变化路径是什么？']),
};
export const causalChartDescriptions:Record<string,string>={
 'cover-training':'120家门店培训决策；研究作用需要合理比较对象。',
 'cover-panel':'同一批120家门店，24个月；利用时间变化检查稳定差异。',
 'post-means':`后12月月均净销售：培训组${cf(D.treatedMean)}，比较组${cf(D.controlMean)}；差${cf(D.rawDifference)}，万元/店/月；样本59/61。`,
 'case-timeline':'第1—12月记录培训前条件；第13月启动；第13—24月计算后期结果。',
 'dag-observed':'假设图：培训前X→D，X→Y，D→Y；X可能形成共同原因路径。',
 'dag-hidden':'假设图另有未测U→D与U→Y；观测X平衡不能检验U是否已排除。',
 'overlap':'120店估计倾向得分分布；按参加与未参加分行；未提供后页估计结果。',
 'propensity':'倾向得分是给定培训前X的参加概率，不是效果或结果预测值。',
 'retention':`59家培训店，卡钳内保留50家，未匹配9家；独立比较店${D.matching.uniqueControls}家。`,
 'weights':`比较组61店，ATT权重最大${cf(D.weighting.max)}；按权重从小到大排列。`,
 'ess':`比较组原有61店，权重ESS=${cf(D.weighting.essControl)}；ESS不增加实际门店。`,
 'weight-interval':`加权估计${cf(D.weighting.estimate)}；499次门店bootstrap百分位95%区间[${D.weighting.ci.map(v=>cf(v)).join(', ')}]；重估倾向得分。`,
 'store-lines':'主数据M001与M002的24月净销售轨迹；竖线为第13月启动，非随机实验。',
 'between-within':'独立两店三期概念序列：A=40,42,44；B=50,52,54；平均水平相差10，变化相同。',
 'panel-count':'120家门店×24个月=2880个完整唯一键；平衡是结构描述，不代表无选择。',
 'missing-panel':'公开缺失示意：M示例01的第4月未知，折线断开，不补零；非主数据实际缺失。',
 'treatment-time':'G在每店内固定；参加店D在1—12月为0、13—24月为1；未参加店D始终为0。',
 'within-scatter':'主数据门店去均值后的D偏离与Y偏离；尚未消除共同月份项；不提供后页模型比较。',
 'fe-result':`门店FE系数${cf(D.models[1]!.beta,3)}；共同月份冲击尚未控制。`,
 'group-time':'主数据24月两组净销售均值折线；第13月启动，图形不单独证明平行趋势或因果识别。',
 'twfe-result':`双向FE系数${cf(D.models[2]!.beta,3)}；共同加性斜率、门店和月份项；不自动等于ATT。`,
 'clusters':'120个门店簇，每簇24月；允许簇内相关，需论证簇间独立等推断条件。',
 'cluster-interval':`双向FE系数${cf(D.models[2]!.beta,3)}，门店CR1聚类SE ${cf(D.models[2]!.se,3)}；t119参考95%区间[${D.models[2]!.ci.map(v=>cf(v,3)).join(', ')}]。`,
};
export function causalEvidenceText(id?:string){if(!id)return '';const t=causalTables[id];if(t)return `${t.headers.join(' / ')}；${t.rows.map(r=>r.join(' / ')).join('；')}`;const d=causalDiagrams[id];if(d)return d.steps.map(r=>r.join('：')).join('；');const s=causalChartDescriptions[id];if(s)return s;throw new Error(`Missing causal evidence ${id}`);}
