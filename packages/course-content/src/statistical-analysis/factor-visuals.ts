import D from './factor-data.json' with {type:'json'};
import M from './measurement-data.json' with {type:'json'};
import type {MeasurementTable} from './measurement-visuals.js';

export const FACTOR_DATA=D;
export const efSource='教学模拟 · 原六题完整记录 n=221 · 多分相关 / MINRES';
export const cfSource='独立教学模拟 C001—C400 · 五级题项 / WLSMV';
export const semSource='九题教学模拟 n=400 · WLSMV · 横截面关联模型';
export const f=(x:number,d=3)=>x.toFixed(d);
export const pv=(x:number)=>x<.001?'< .001':f(x);
const e=D.efa,c=D.confirmation.two,one=D.confirmation.one,s=D.sem.fit;
const table=(headers:string[],rows:(string|number)[][]):MeasurementTable=>({headers,rows});
const fitRows=(a:typeof c,b:typeof c)=>[
 ['校正χ² / df',`${f(a.measures['chisq.scaled'])} / ${a.measures['df.scaled']}`,`${f(b.measures['chisq.scaled'])} / ${b.measures['df.scaled']}`],
 ['p',pv(a.measures['pvalue.scaled']),pv(b.measures['pvalue.scaled'])],
 ['CFI / TLI',`${f(a.measures['cfi.scaled'])} / ${f(a.measures['tli.scaled'])}`,`${f(b.measures['cfi.scaled'])} / ${f(b.measures['tli.scaled'])}`],
 ['RMSEA',f(a.measures['rmsea.scaled']),f(b.measures['rmsea.scaled'])],
 ['SRMR',f(a.measures.srmr),f(b.measures.srmr)],
];
const paths=s.parameters.filter(p=>p.op==='~'||p.op===':=');
export const semPaths={
 a:paths.find(p=>p.label==='a')!,b:paths.find(p=>p.label==='b')!,c:paths.find(p=>p.label==='c')!,
 indirect:paths.find(p=>p.lhs==='indirect')!,total:paths.find(p=>p.lhs==='total')!,
};
export const factorTables:Record<string,MeasurementTable>={
 'efa-items':table(['编号','最近一次购买中的咨询或求助经历','方向'],M.survey.items.map(r=>[r[0]!,r[2]!,r[3]!])),
 'efa-samples':table(['分析','记录与处理','能支持的范围'],[
  ['第8讲探索','原240份中六题完整221份；T3已反向','在这批完整记录中寻找候选结构'],
  ['第9讲确认','另生成C001—C400；同六题、同选项','用独立模拟检查预先指定的限制'],
  ['真实研究','核查抽样、缺失与工具适用性','模拟中的清楚结构不保证实测也如此'],
 ]),
 'efa-purpose':table(['研究任务','适合的起点','结果仍需核查'],[
  ['压缩采购记录','PCA：保留指定尺度的总方差','压缩损失与用途'],
  ['探索自编题项的共同结构','EFA：共同变异与独特部分','内容含义、结构稳定性'],
  ['检验已有量表的指定结构','CFA：明确载荷和相关限制','适用版本、拟合与其他效度证据'],
 ]),
 'efa-routes':table(['现有依据','分析路径','理由'],[
  ['合适的成熟量表及适用版本','先检验预先规定的结构','已有理论和计分规则可受检验'],
  ['适配或新内容，结构尚不明确','内容审查、预试，必要时EFA','探索须有具体的结构不确定性'],
  ['记录金额、时长、渠道','保留事实变量的定义','不为凑量表而要求指标高度相关'],
 ]),
 'efa-precheck':table(['核查','本例处理','实际调查的额外问题'],[
  ['方向','T3*=6−T3；其他题保留原方向','否定措辞是否被正确理解？'],
  ['缺失','六题完整221/240；19份未进入','排除者是否系统不同？'],
  ['有效回答','逐题检查1—5频数','直线作答、极端偏态、稀疏类别？'],
  ['相关与稳定性','矩阵正定；保留全部六题','样本构成、精度及内容是否足够？'],
 ]),
 'efa-correlation-choice':table(['输入','描述或假设','本讲用途'],[
  ['Pearson相关','把1—5编码作数值，概括线性关系','直观对照与经典筛查演示'],
  ['多分相关','有序类别来自阈值分割的潜在连续响应','本例EFA输入；不是无条件更优'],
  ['需要检查','潜在正态假设、稀疏列联格、矩阵正定','更换方法时检查结构是否敏感'],
 ]),
 'efa-kmo':table(['项目','Pearson矩阵上的结果','含义'],[
  ['总体KMO',f(e.kmo),'相关相对偏相关的集中程度'],
  ['最低逐题MSA',f(Math.min(...e.msa)),'定位需要进一步核查的题项'],
  ['本例用途','与题意、分布和相关一起读','不据此确定因子数或证明效度'],
 ]),
 'efa-bartlett':table(['检验内容','本例计算','结论范围'],[
  ['H₀：Pearson总体相关矩阵为单位阵',`χ²=${f(e.bartlett.chisq)}；df=${e.bartlett.df}`,'检验无关的整体假设'],
  ['经典近似',`n=221；p ${pv(e.bartlett['p.value'])}`,'正态连续变量近似；五级数据仅作演示'],
  ['拒绝H₀之后','仍须选择和检查共同因子模型','显著不等于有两个因子'],
 ]),
 'efa-number-evidence':table(['候选数','非对角相关残差RMS','额外核查'],[
  ['1',f(e.one.rms),'是否把两个领域强并成一维？'],
  ['2',f(e.two.rms),'题意、平行分析与模式共同判断'],
  ['3',f(e.three.rms),'六题三因子df=0；低残差不提供拟合检验'],
 ]),
 'efa-parallel-values':table(['次序','观测约化矩阵特征值','置换参考95%分位'],e.parallel.observed.slice(0,4).map((v,i)=>[i+1,f(v),f(e.parallel.null95[i]!) ])),
 'efa-pattern':table(['题项','F1模式载荷','F2模式载荷'],e.keys.map((k,i)=>[k==='T3'?'T3*':k,...e.two.pattern[i]!.map(v=>f(v))])),
 'efa-unrotated':table(['题项','未旋转F1','未旋转F2'],e.keys.map((k,i)=>[k==='T3'?'T3*':k,...e.unrotated.pattern[i]!.map(v=>f(v))])),
 'efa-rotation':table(['解的表达','因素相关','相关残差RMS'],[
  ['未旋转',f(e.unrotated.phi[0]![1]!),f(e.unrotated.rms)],
  ['varimax：正交',f(e.orthogonal.phi[0]![1]!),f(e.orthogonal.rms)],
  ['oblimin：斜交',f(e.two.phi[0]![1]!),f(e.two.rms)],
 ]),
 'efa-pattern-structure':table(['题项','模式F1','模式F2','与F1相关','与F2相关'],[0,3,4].map(i=>[e.keys[i]!,...e.two.pattern[i]!.map(v=>f(v)),...e.two.structure[i]!.map(v=>f(v))])),
 'efa-communality':table(['题项','共同度 h²','独特部分 1−h²'],e.keys.map((k,i)=>[k==='T3'?'T3*':k,f(e.two.h2[i]!),f(e.two.uniqueness[i]!)])),
 'efa-item-cases':table(['独立示意题','模式F1','模式F2','内容问题'],[
  ['A',.72,.08,'一个领域有清楚联系'],['B',.43,.40,'一句话可能混合两件事'],['C',.18,.12,'可能覆盖重要但未充分测量的内容'],
 ]),
 'efa-naming':table(['候选因素','题项内容','命名的依据与边界'],[
  ['F1','回应、解决、人员可获得','暂称服务响应；名称来自内容解释'],
  ['F2','费用、商品信息、关键条件','暂称信息透明；T3*方向已统一'],
  ['其他可能解释','总体评价倾向、共同措辞或经历','相关结构本身无法排除全部替代解释'],
 ]),
 'efa-deletion':table(['处理方案','可能的好处','需要付出的代价'],[
  ['删除跨载荷题','结构可能更清楚','原有内容可能因此缺失'],
  ['保留并解释','保留重要内容和可比性','必须正视歧义或跨领域含义'],
  ['修订后再收集','检查新措辞与结构','新版本需要重新积累证据'],
 ]),
 'efa-report':table(['报告项目','本例应写明'],[
  ['资料','六题自编教学模拟；221/240完整记录；T3反向'],
  ['估计','多分相关，MINRES提取，oblimin斜交旋转'],
  ['留数','199次保留边际的置换参考、题意与残差支持候选两因子'],
  ['结果',`报告全模式矩阵、共同度及因素相关 ${f(e.two.phi[0]![1]!)} `],
  ['限制','结果依赖完整记录与模型假设；独立数据和其他效度证据仍需补充'],
 ]),
 'efa-check-feedback':table(['判断','解释'],[
  ['α较高，仍可能有多个领域','内部一致性不确定维数'],
  ['因素可相关','斜交解仍保留可区分的内容'],
  ['载荷不是计分权重','计分须依据定义、手册及另行评价'],
  ['结构是候选结果','独立数据中的确认与用途证据仍重要'],
 ]),
 'efa-edit-feedback':table(['问题','合理的下一步'],[
  ['B题同时询问速度与清晰度','访谈核查理解；考虑拆分或重写'],
  ['删B后α提高','同时检查内容覆盖、结构和版本可比性'],
  ['用原数据反复调整','如实称探索；在另一批数据中检验修订结构'],
 ]),
 'efa-plan':table(['研究环节','需要留下的记录'],[
  ['准备工具','构念范围、版本、许可和内容审查'],
  ['探索分析','样本来源、缺失规则、估计、留数与修订理由'],
  ['固定模型','题项归属、允许的相关、估计与主要评价'],
  ['独立确认','新样本或预先保留且未用于修改的数据'],
 ]),
 'efa-report-feedback':table(['原句的问题','可以成立的表述'],[
  ['“KMO合格，所以验证成功”','KMO是相关结构的筛查线索'],
  ['“特征值大于1，所以一定两个因素”','留数结合适用的平行分析、内容与可解释性'],
  ['“删题直到α最高”','报告修订理由和内容损失；另作确认'],
 ]),
 'cfa-frozen':table(['事前规定','可被数据质疑的限制'],[
  ['R1、R2、R3属于响应R','它们在透明T上的交叉载荷固定为0'],
  ['T1、T2、T3*属于透明T','它们在响应R上的交叉载荷固定为0'],
  ['R与T允许相关','相关大小由确认数据估计'],
  ['题项残差不相关','六题的局部依赖由残差检查质疑'],
 ]),
 'cfa-sample':table(['资料','实际使用','限制'],[
  ['确认样本','C001—C400，400份完整五级回答','独立教学生成；并非实际追访'],
  ['测量版本','与第6讲相同六题；T3反向','没有把原S样本重新当确认数据'],
  ['分析范围','六题先做CFA；新增S题另用于SEM','确认测量结构不等于确认因果路径'],
 ]),
 'cfa-identification':table(['连续协方差概念例','数量','解释'],[
  ['六个变量的不同协方差元素',21,'6×7/2；不含均值'],
  ['自由参数',13,'定因子方差为1：6载荷、6残差方差、1相关'],
  ['自由度',8,'21−13；参数计数是必要检查'],
  ['额外条件','模型确实可识别','仍需检查约束、信息矩阵与解的可接受性'],
 ]),
 'cfa-ordinal-df':table(['本例顺序响应模型','数量','对应内容'],[
  ['阈值',24,'六题，每题五级，需要四个阈值'],
  ['不同相关',15,'六题潜在响应之间的相关'],
  ['自由模型参数',31,'24阈值＋6载荷＋1因素相关；采用指定定标'],
  ['自由度',8,'39−31；与前页连续例数值相同，参数含义不同'],
 ]),
 'cfa-estimation':table(['数据情形','可考虑的方法','需要核查'],[
  ['本例五级有序题项','ordered + WLSMV','潜在响应阈值；稀疏类别与样本精度'],
  ['近似连续的测量','ML或适用的稳健ML','分布、尺度和稳健修正的条件'],
  ['存在缺失','与题项类型匹配的缺失策略','连续ML的FIML选项不能直接套给本例'],
 ]),
 'cfa-missing':table(['情况','本例或处理原则'],[
  ['本次确认样本','400/400完整；没有插补，也没有FIML'],
  ['真实顺序题有缺失','说明原因、模式；评估合适的插补或其他支持方法'],
  ['完整案例或成对资料','透明报告样本与假设；都不自动消除选择偏差'],
  ['连续变量ML的FIML','依赖相应模型与MCAR/MAR条件；不能据此假称WLSMV也用了FIML'],
 ]),
 'cfa-admissibility':table(['先检查','本次结果','发现问题时'],[
  ['优化收敛','已收敛','检查模型、资料和估计设置'],
  ['解的可接受性','通过软件post.check','检查负方差、边界解和矩阵正定'],
  ['参数与不确定性','结合下页载荷与区间','不通过删题或固定小正数掩盖问题'],
 ]),
 'cfa-loadings':table(['题项','标准化载荷','95%区间'],c.standardized.filter(p=>p.op==='=~').map(p=>[p.rhs==='T3'?'T3*':p.rhs,f(p['est.std']),`[${f(p['ci.lower'])}, ${f(p['ci.upper'])}]`])),
 'cfa-phi':table(['参数','标准化估计','95%区间'],c.standardized.filter(p=>p.op==='~~'&&p.lhs==='R'&&p.rhs==='T').map(p=>['R与T的相关',f(p['est.std']),`[${f(p['ci.lower'])}, ${f(p['ci.upper'])}]`])),
 'cfa-pairs':table(['题项对','观测多分相关','模型隐含相关','残差'],[[0,1],[2,3],[1,4],[3,5]].map(([i,j])=>[`${e.keys[i!]} / ${e.keys[j!]==='T3'?'T3*':e.keys[j!]}`,f(c.observed[i!]![j!]!),f(c.implied[i!]![j!]!),f(c.residual[i!]![j!]!)])),
 'cfa-fit':table(['指标','本例校正结果','解释时考虑'],[
  ['χ² / df / p',`${f(c.measures['chisq.scaled'])} / ${c.measures['df.scaled']} / ${pv(c.measures['pvalue.scaled'])}`,'精确拟合检验与样本量'],
  ['CFI / TLI',`${f(c.measures['cfi.scaled'])} / ${f(c.measures['tli.scaled'])}`,'相对独立基准模型的改善'],
  ['RMSEA及90%区间',`${f(c.measures['rmsea.scaled'])} [${f(c.measures['rmsea.ci.lower.scaled'])}, ${f(c.measures['rmsea.ci.upper.scaled'])}]`,'近似误差、自由度与区间宽度'],
  ['SRMR',f(c.measures.srmr),'平均残差仍可能掩盖局部失配'],
 ]),
 'cfa-comparison':table(['同400份、同WLSMV','单因素','两相关因素'],fitRows(one,c)),
 'cfa-modification':table(['固定参数若放开','MI','预期参数变化EPC'],c.modification.slice(0,4).map(p=>[
  p.op==='=~'?`交叉载荷 ${p.lhs} → ${p.rhs==='T3'?'T3*':p.rhs}`:`残差相关 ${p.lhs==='T3'?'T3*':p.lhs} / ${p.rhs==='T3'?'T3*':p.rhs}`,
  f(p.mi,2),f(p.epc)])),
 'cfa-validity':table(['证据问题','可用的资料','CFA能覆盖多少'],[
  ['内容是否覆盖构念','定义、专家审查、目标人群访谈','不能由拟合优良代替'],
  ['回答是否按预期形成','认知访谈、理解与作答过程','不能只看数字推断'],
  ['内部结构是否相符','载荷、相关、残差、模型比较','本讲主要处理的部分'],
  ['与外部变量的关系','按理论预先规定的关系与独立资料','还需要用途和设计支持'],
 ]),
 'cfa-convergent':table(['领域','平均提取方差AVE','模型下的单位权重ω'],[0,1].map(j=>{
  const v=c.loadings.slice(j*3,j*3+3).map(r=>r[j]!);const errors=c.theta.slice(j*3,j*3+3).map((r,i)=>r[j*3+i]!);
  const common=v.reduce((a,b)=>a+b*b,0),noise=errors.reduce((a,b)=>a+b,0),total=v.reduce((a,b)=>a+b,0)**2;
  return [j===0?'响应R':'透明T',f(common/(common+noise)),f(total/(total+noise))];
 })),
 'cfa-invariance':table(['比较目的','需要检验的可比性','顺序题的额外注意'],[
  ['比较结构','构型是否相符','相同构念与题意是前提'],
  ['比较关系','载荷约束是否合理','定标与识别必须一致'],
  ['比较潜在均值','相应阈值/截距限制','阈值与载荷约束依参数化安排'],
  ['当前两领域样本','没有进行多组不变性检验','不能声称跨语言或跨人群可直接比较'],
 ]),
 'cfa-mature-scale':table(['工具情况','合理工作','仍需保留的边界'],[
  ['成熟且用途匹配','核对版本和使用条件，检验指定结构','本地数据不能自动继承所有旧证据'],
  ['翻译、删改或换人群','审查理解、等价性与适用结构','必要时探索，再独立确认'],
  ['事实记录或未明确的新问题','使用记录，或先访谈与界定','不能先挑一个知名量表再改变研究问题'],
 ]),
 'sem-items':table(['编号','就最近一次购买作答','角色'],[
  ['S1','我对本次购买的整体经历感到满意。','满意度候选指标'],
  ['S2','本次购买的体验符合我的期待。','满意度候选指标'],
  ['S3','回想本次购买，我总体感受良好。','满意度候选指标'],
 ]),
 'sem-equations':table(['模型部分','本例规定','需要解释什么'],[
  ['测量','R、T、S各由三题反映','题项与潜变量的关系'],
  ['结构','T = aR + ζT','响应与透明的指定方向关系'],
  ['结构','S = bT + cR + ζS','同时控制另一个潜变量的条件关系'],
  ['定标','R1、T1、S1首载荷固定为1','后续a、b、c及其乘积采用同一因子尺度'],
 ]),
 'sem-paths':table(['指定路径','非标准化估计','95%区间'],[semPaths.a,semPaths.b,semPaths.c].map(p=>[`${p.rhs} → ${p.lhs}`,f(p.est),`[${f(p['ci.lower'])}, ${f(p['ci.upper'])}]`])),
 'sem-effects':table(['模型中的量','同一定标的估计','delta方法95%区间'],[semPaths.c,semPaths.indirect,semPaths.total].map((p,i)=>[['直接项 c','间接乘积 ab','总项 c＋ab'][i]!,f(p.est),`[${f(p['ci.lower'])}, ${f(p['ci.upper'])}]`])),
 'sem-equivalence':table(['九题、同一批400份','原指定方向','反向递归模型'],fitRows(s,D.sem.reverse)),
 'cfa-report':table(['报告内容','本例写法'],[
  ['样本与版本','独立模拟400份；六题及同一选项；T3反向'],
  ['模型与估计','两相关因素；交叉载荷和题项残差协方差为0；WLSMV'],
  ['结果',`χ²(${c.measures['df.scaled']})=${f(c.measures['chisq.scaled'])}；CFI=${f(c.measures['cfi.scaled'])}；RMSEA=${f(c.measures['rmsea.scaled'])}`],
  ['模型评价','精确拟合被拒绝；T1/R3与T2/R2残差待核查，未实际放开参数'],
  ['推论','当前资料与假设下的内部结构证据，非全部效度或因果证据'],
 ]),
 'sem-report':table(['项目','本例应写明'],[
  ['测量扩展','加入S1—S3三道满意度自编题；九题同400份'],
  ['估计与尺度','WLSMV；首题载荷定标；非标准化路径'],
  ['模型结果',`ab=${f(semPaths.indirect.est)}；delta区间 [${f(semPaths.indirect['ci.lower'])}, ${f(semPaths.indirect['ci.upper'])}]`],
  ['研究范围','横截面关联演示；无随机干预、时间顺序或混杂控制设计'],
 ]),
 'cfa-check-feedback':table(['原结论','证据缺口'],[
  ['“α高，量表有效”','信度不能替代内容、回答过程与结构证据'],
  ['“CFI高，两因素理论已证明”','拟合不能排除其他模型和局部失配'],
  ['“间接项显著，所以机制成立”','方向、未测混杂和时间顺序仍无设计保证'],
  ['“换语言也可直接比均值”','需要理解、等价性与适用的不变性证据'],
 ]),
};

/** Only evidence already projected on this page enters assistant context. */
export const factorEvidenceText:Record<string,string>={
 'efa-scene':'独立情境示意：顾客甲及时获得帮助，但不知道哪些费用包含在内；乙理解费用，却很难找到工作人员。',
 'efa-pearson':`六题完整n=221，T3反向；Pearson相关矩阵 ${JSON.stringify(e.pearson)}`,
 'efa-polychoric':`同221份的多分相关矩阵 ${JSON.stringify(e.polychoric)}；潜在正态阈值假设。`,
 'efa-variance':'标准化连续响应概念例，载荷0.8，因子方差1，独特方差0.36：0.8²+0.36=1；不是本例拟合参数。',
 'efa-common-model':'两个相关共同因素示意：R连接R1—R3；T连接T1—T3*；各题有独特部分。EFA拟合时交叉载荷自由，不强制题项归属。',
 'efa-single-prediction':`在多分相关输入上，单因素解非对角残差RMS=${f(e.one.rms)}。`,
 'efa-thresholds':'概念图示五级回答来自连续潜在响应的四个阈值；相邻类别的数值间距不必代表等距。',
 'efa-scree':`完整多分相关矩阵特征值 ${JSON.stringify(e.eigen)}；此图总对角为6，不能当作共同因子平行分析。`,
 'efa-parallel':`SMC约化矩阵特征值 ${JSON.stringify(e.parallel.observed)}；199次逐列独立置换、多分相关、SMC；95%分位 ${JSON.stringify(e.parallel.null95)}。`,
 'efa-rotation-geometry':`同一个两因子解，不同载荷表达。旋转前RMS=${f(e.unrotated.rms)}；oblimin RMS=${f(e.two.rms)}。`,
 'efa-loading-map':`模式载荷 ${JSON.stringify(e.two.pattern)}；行R1,R2,R3,T1,T2,T3*。`,
 'efa-reflective':'反映式测量示意：共同体验反映在多个回答；组成式指数示意：成本、等待、覆盖共同定义指数。形成式组成不要求高内部相关。',
 'efa-heywood':'独立诊断示意：标准化响应共同度1.08、独特方差−0.08是不可接受解；不是主数据结果。',
 'efa-scores':'模式载荷属于题项；因素得分属于个体。因素得分是依模型和估计方法得到的估计，不能把模式载荷直接当问卷均分权重。',
 'efa-reverse':'原T3为负向措辞，计分T3*=6−T3；正确反向仍不能排除措辞方法因素或共同回答倾向。',
 'cfa-model':'预先指定R由R1—R3反映，T由T1—T3*反映，允许R与T相关；交叉载荷与题项残差协方差固定0。',
 'cfa-symbols':'矩形为观测题项，椭圆为潜变量，单向箭头为指定载荷，双向箭头为相关，独特残差连接各题；箭头本身不提供因果识别。',
 'cfa-scaling':'同一潜变量放大两倍，载荷减半，隐含响应不变。可固定一个载荷为1，或固定因子方差为1；本例六题CFA采用后者。',
 'cfa-variance':`R1标准化载荷${f(c.loadings[0]![0]!)}；潜在响应中共同方差${f(c.loadings[0]![0]!**2)}，残差${f(c.theta[0]![0]!)}。不是原始1—5编码的解释率。`,
 'cfa-within':`R1/R2隐含相关=${f(c.loadings[0]![0]!)}×${f(c.loadings[1]![0]!)}=${f(c.implied[0]![1]!)}；无交叉载荷与残差相关。`,
 'cfa-between':`R1/T1隐含相关=λR1×φRT×λT1=${f(c.implied[0]![3]!)}；三个量来自同一标准化顺序响应模型。`,
 'cfa-residual':`观测多分相关减去隐含相关，最大非对角绝对残差${f(c.maxResidual)}；矩阵 ${JSON.stringify(c.residual)}。`,
 'cfa-chi':`WLSMV校正χ²=${f(c.measures['chisq.scaled'])}，df=${c.measures['df.scaled']}，p ${pv(c.measures['pvalue.scaled'])}。`,
 'cfa-relative':`校正CFI=${f(c.measures['cfi.scaled'])}、TLI=${f(c.measures['tli.scaled'])}；相对基准模型的指标，不是模型为真概率。`,
 'cfa-rmsea':`校正RMSEA=${f(c.measures['rmsea.scaled'])}，90%区间[${f(c.measures['rmsea.ci.lower.scaled'])},${f(c.measures['rmsea.ci.upper.scaled'])}]。`,
 'cfa-srmr':`SRMR=${f(c.measures.srmr)}；汇总标准化残差，须结合最大残差${f(c.maxResidual)}和具体题项检查。`,
 'sem-model':'九题扩展测量R/T/S。指定T~aR，S~bT+cR；各因素首题载荷固定1，结构残差不额外相关。',
 'sem-product':`同一非标准化尺度：a=${f(semPaths.a.est)}，b=${f(semPaths.b.est)}，ab=${f(semPaths.indirect.est)}。这是关联模型中的路径乘积。`,
 'sem-total':`同一定标：c=${f(semPaths.c.est)}，ab=${f(semPaths.indirect.est)}，c+ab=${f(semPaths.total.est)}。`,
 'sem-reverse':'原模型R指向T，S同时依赖R/T；反向模型T指向R，S仍依赖R/T。两个递归模型可表达同一潜变量协方差；无时间或干预设计不能据此确定方向。',
};
