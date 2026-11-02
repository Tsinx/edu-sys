import {textLessonFifteen,textTiming} from './text-lessons.js';
import {getResearchPaper,type ResearchPaperId} from './research-literature.js';
export interface ResearchTable {headers:string[];rows:string[][];widths?:number[];}
export interface ResearchModel {
 equations:string[];symbols:[string,string][];provenance:string;
 sourceKind:'original'|'restatement';layout?:'split'|'wide';
}
export interface ResearchPage {
 title:string;lead:string;text:string[];caption:string;question:string;note:string;
 source:ResearchPaperId|'course'|'exercise'|'synthesis'|'policy'|'text';
 visual?:string;formula?:string;code?:string;table?:ResearchTable;kind?:'question'|'feedback';
 exerciseId?:string;stableKey?:string;
 readingStep?:'题目与摘要'|'问题与资料'|'主要模型'|'估计结果'|'管理解释';
 abstract?:{paragraphs:string[];locator:string};
 model?:ResearchModel;
}
const p=(title:string,lead:string,text:string[],caption:string,question:string,extra:Partial<ResearchPage>={}):ResearchPage=>
 ({title,lead,text,caption,question,note:question,source:'course',...extra});
const r=(source:ResearchPaperId,title:string,lead:string,text:string[],caption:string,question:string,extra:Partial<ResearchPage>={})=>
 p(title,lead,text,caption,question,{source,...extra});
const table=(headers:string[],rows:string[][]):ResearchTable=>({headers,rows});

/** These 48 pages are individually authored around the five verified papers. */
export const researchLessonFourteen:ResearchPage[]=[
 p('管理建议，怎样获得研究证据','沿五篇工商管理论文，从摘要读到管理解释',[],
   '组织行为、企业战略、平台竞争、工厂管理与混合办公。','你希望用一篇实证论文回答哪一项管理决策？',{source:'synthesis'}),
 p('五项经营决策，五个研究问题','先认清文章要回答什么，再跟随它的资料与模型',[],
   '五篇论文依次展开；每篇都从完整题目与摘要开始。','这五个问题中，你最想追踪哪一个结果？',{visual:'study-map',source:'synthesis'}),
 p('每篇论文，都沿同一条线读下去','题目与摘要、问题与资料、主要模型、估计结果、管理解释',[],
   '摘要给出一项完整主张，正文逐步展示这项主张如何形成。','摘要中的哪一句发现，会引导你去找正文的公式与表格？',{visual:'paper-route',source:'synthesis'}),
 r('zhang2010','论文一：授权型领导与员工创造力','Zhang与Bartol · Academy of Management Journal · 2010',[],
   '摘要中文提要；正文从构念测量走向结构路径与调节关系。','论文把“授权怎样连接创造力”拆成了哪几个环节？',{
    readingStep:'题目与摘要',abstract:{locator:'期刊摘要，印刷第107页；中文提要',
     paragraphs:['文章整合领导、赋能与创造力理论，研究授权型领导通过怎样的心理与行为过程连接员工创造力。',
      '作者使用中国一家大型IT企业的员工及主管调查，报告心理赋能、内在动机和创意过程参与之间的正向路径。',
      '研究还考察赋能角色认同、领导创造力鼓励的调节作用，把“通过什么过程”与“在什么条件下更强”连接起来。']}}),
 r('zhang2010','先看这条证据链由谁提供','员工报告领导与心理过程，主管评价员工创造力',[],
   '原文Methods，印刷第113页；最终367份员工—主管配对响应。','员工与主管两端的资料，怎样组成一条可分析的记录？',{visual:'zhang-sample',readingStep:'问题与资料'}),
 r('zhang2010','构念怎样成为模型中的变量','成熟工具、维度与评价者，把理论落到具体测量',[],
   '原文Measures；已有合适构念工具时评估采用，语言与对象变化时核查适配。','研究心理赋能与研究库存记录，分别适合怎样测量？',{readingStep:'问题与资料',table:table(
    ['模型角色','原文测量','进入研究的方式'],
    [['L 授权型领导','Ahearne等12题工具','员工报告，按维度组织指标'],
     ['P 心理赋能','Spreitzer12题工具','员工报告，覆盖四个维度'],
     ['M 内在动机 / E 过程参与','既有动机工具 / 开发11题过程测量','区分心理动机与实际创意过程'],
     ['C 员工创造力','主管评价','与对应员工响应配对']])}),
 r('zhang2010','摘要中的机制，具体是哪几条路径','从L到P，再经过M与E连接C',[],
   '据Figure 2抽取主要结构路径；字母用于下一页读公式。','内在动机M通过哪两条路径连接创造力C？',{visual:'zhang-path',readingStep:'主要模型'}),
 r('zhang2010','把路径图读成一组结构方程','每个方程对应一个被解释的心理或行为环节',
   ['a、b、c、d、e、f分别对应图中的结构路径。'],
   '按Figure 2主要路径课堂转写；测量与调节部分另按原文报告。','哪一个方程直接解释创造力，哪几个方程解释中间过程？',{readingStep:'主要模型',model:{
    equations:['P_i=aL_i+u_{Pi}','M_i=bP_i+u_{Mi}','E_i=cP_i+dM_i+u_{Ei}','C_i=eM_i+fE_i+u_{Ci}'],
    symbols:[['L','授权型领导'],['P','心理赋能'],['M','内在动机'],['E','创意过程参与'],['C','员工创造力']],
    provenance:'Figure 2主路径的课堂转写',sourceKind:'restatement'}}),
 r('zhang2010','沿论文顺序，先读测量再读结构','指标对应构念以后，结构方程才有具体含义',[],
   'Table 2；EQS 6.1，部分指标按维度汇总，单指标采用相应误差处理。','测量模型和结构模型分别在评价什么？',{readingStep:'估计结果',table:table(
    ['原文报告','测量模型','结构模型'],
    [['χ²；df','463.60；122','626.80；169'],['CFI','0.98','0.97'],['SRMR','0.06','0.07'],['RMSEA','0.07','0.08']])}),
 r('zhang2010','从方程参数回到论文的路径结果','Figure 2把每条结构关系配上了报告系数',[],
   'Figure 2报告的主路径系数；图注各路径p<0.05。调节关系另用分层多元回归分析。','哪些结果在支持“动机”和“创意过程”这两条解释？',{readingStep:'估计结果',table:table(
    ['结构路径','对应参数','原文报告系数'],
    [['L → P','a','0.81'],['P → M','b','0.31'],['P → E','c','0.19'],
     ['M → E','d','0.71'],['M → C','e','0.32'],['E → C','f','0.55']])}),
 r('zhang2010','个人解释：怎样把路径读成管理做法','给一位希望鼓励员工创造力的主管写两项建议',
   ['分别指出建议对应的构念与路径。','把建议写成可以理解的日常管理动作。'],
   '独立思考约90秒；下一页对照论文提供的管理解释。','“给予自主权”与“支持创意过程”，各对应什么证据？',{readingStep:'管理解释',kind:'question',exerciseId:'R14-Q1'}),
 r('zhang2010','反馈：把授权做成日常工作安排','研究把领导行为、员工心理与创意过程连接起来',
   ['让工作意义、决策参与、自主安排与能力信心进入授权实践。','用问题识别、信息搜索与想法生成，支持员工把动机转成创意过程。','从主管层面的做法，继续追问企业层面的长期战略怎样进入组织流程。'],
   '前两项对应论文构念与路径；下一篇转向企业战略选择与长期表现。','当研究对象从员工变成企业，怎样组织一组有用的比较？',{readingStep:'管理解释',kind:'feedback',exerciseId:'R14-Q1'}),
 r('eccles2014','论文二：可持续战略与长期表现','Eccles、Ioannou与Serafeim · Management Science · 2014',[],
   '摘要中文提要；顺着企业选择、组织流程与绩效三个层次阅读。','摘要把哪些组织安排与哪些长期结果联系起来？',{readingStep:'题目与摘要',abstract:{
    locator:'作者公开稿第1页摘要；中文提要',
    paragraphs:['文章以180家美国企业的配对样本，研究可持续政策怎样体现在组织流程与长期表现中。',
     '作者报告，高可持续企业更常把相关责任纳入董事会与高管激励，并形成利益相关者沟通、长期导向和非财务信息管理流程。',
     '作者报告高可持续企业在长期股票市场与会计表现上更优，把企业战略、组织制度与长期绩效连接起来。']}}),
 r('eccles2014','先为90家企业形成比较组','行业与财务条件，把候选对照整理成90对企业',[],
   'Sample Selection：1993年条件匹配；90家高可持续、269家候选对照、90对180家。','行业与财务条件分别帮助比较哪些企业特征？',{visual:'eccles-match',readingStep:'问题与资料'}),
 r('eccles2014','匹配方法，怎样写成数学表达','先估计政策组别概率，再寻找得分接近的行业对照',
   ['得分模型的因变量是企业是否属于高可持续组。'],
   '据Sample Selection课堂转写；原文采用行业条件与最近邻不放回配对。','这一页的Logit，和订单取消Logit的研究任务有什么不同？',{readingStep:'主要模型',model:{
    equations:['\\widehat e(X_i)=\\frac{\\exp(\\widehat\\alpha+X_i^{\\mathsf T}\\widehat\\beta)}{1+\\exp(\\widehat\\alpha+X_i^{\\mathsf T}\\widehat\\beta)}',
     'j(i)=\\underset{j\\in\\mathcal C_i,\\ j\\ {\\rm unused}}{\\arg\\min}\\;|\\widehat e(X_i)-\\widehat e(X_j)|'],
    symbols:[['e(X_i)','属于高可持续组的倾向得分'],['X_i','规模、ROA、周转率、MTB与杠杆'],['\\mathcal C_i','满足行业条件的候选比较企业'],['j(i)','与企业i配对的对照企业']],
    provenance:'Sample Selection所述配对过程的课堂转写',sourceKind:'restatement'}}),
 r('eccles2014','读配对表，认清比较的起点','1993年，两组企业具有怎样的财务特征',[],
   '作者稿Table 1及第6页；总资产为十亿美元，ROA与杠杆为百分比。','总资产、盈利与周转率，分别描述企业哪一方面？',{readingStep:'估计结果',table:table(
    ['1993年指标','高可持续组（90家）','配对对照（90家）'],
    [['总资产','8.6','8.2'],['ROA','7.86%','7.54%'],['杠杆','56%','57%'],['资产周转率','1.02','1.05']])}),
 r('eccles2014','长期表现，怎样进入一个结果模型','四因子模型把组合收益分解为共同因素与月度α',
   ['两组企业各形成投资组合，绩效回归以组合—月份为记录单位。'],
   '据作者稿Table 7表注转写；1993—2010年，216个月。','α在回答什么问题，和匹配模型中的组别概率有何不同？',{readingStep:'主要模型',model:{
    equations:['R_{g,t}-R_{f,t}=\\alpha_g+\\beta_g\\mathrm{MKTRF}_t+s_g\\mathrm{SMB}_t',
     '\\qquad\\qquad+h_g\\mathrm{HML}_t+m_g\\mathrm{UMD}_t+\\varepsilon_{g,t}',
     '\\Delta\\alpha=\\alpha_H-\\alpha_L'],
    symbols:[['g=H,L','高、低可持续企业组合'],['R_{g,t}-R_{f,t}','组合月收益减无风险收益'],['\\mathrm{MKTRF},\\mathrm{SMB}','市场与规模因素'],['\\mathrm{HML},\\mathrm{UMD}','账面市值比与动量因素'],['\\alpha_g','模型中的月度异常收益截距']],
    provenance:'Table 7四因子绩效模型的课堂转写',sourceKind:'restatement',layout:'wide'}}),
 r('eccles2014','把模型结果与组织安排放在一起读','论文同时考察治理、流程和长期金融表现',[],
   '作者稿摘要与Table 7；α按月收益比例×100展示，216个月。','财务结果之外，哪些组织流程有助于解释企业战略怎样落地？',{readingStep:'估计结果',table:table(
    ['比较内容','高可持续企业的报告结果','阅读位置'],
    [['治理与激励','更常把可持续责任纳入董事会和高管激励','摘要及组织流程部分'],
     ['沟通与信息','更多利益相关者沟通、长期导向和非财务信息管理','摘要及组织流程部分'],
     ['市值加权组合月α','高组0.96%；配对低组0.59%','Table 7'],
     ['等权组合月α','高组0.57%；配对低组0.39%','Table 7']])}),
 r('eccles2014','个人解释：两步模型怎样接上管理问题','匹配模型与绩效模型，分别把什么放在因变量位置？',
   ['分别说明得分、配对和α承担的任务。','结合一种组织流程，写出这篇论文给管理者的启发。'],
   '独立思考约90秒；下一页把两步模型连成一段完整解释。','从“选择这类战略的企业”到“后续表现”，中间经过了什么比较？',{readingStep:'管理解释',kind:'question',exerciseId:'R14-Q2'}),
 r('eccles2014','反馈：战略选择、组织流程与长期表现','先形成企业比较，再用相应结果模型阅读长期表现',
   ['得分模型解释政策组别；配对整理比较对象；四因子模型报告组合α。','董事会责任、激励、沟通和信息管理，展示战略进入日常组织的方式。','下一篇把比较转向酒店的月度经营，观察市场竞争发生后收入怎样变化。'],
   '企业层面的长期比较，衔接到同一经营单位随时间变化的面板分析。','面对平台扩张，酒店需要追踪哪些月度经营记录？',{readingStep:'管理解释',kind:'feedback',exerciseId:'R14-Q2'}),
 r('zervas2017','论文三：Airbnb扩张与酒店经营','Zervas、Proserpio与Byers · Journal of Marketing Research · 2017',[],
   '核读2016年11月作者稿的摘要；沿平台供给、酒店定价与收入继续阅读。','摘要中的平台竞争，会体现在哪些经营指标上？',{readingStep:'题目与摘要',abstract:{
    locator:'作者2016-11公开稿第1页摘要；中文提要',
    paragraphs:['文章研究Airbnb进入得州市场之后，传统酒店的经营怎样变化，并利用酒店与平台资料估计竞争影响。',
     '作者报告酒店房费收入受到影响，低价酒店、较少服务商务客的酒店反应更明显。',
     '研究进一步把收入变化连接到酒店定价：平台供给可以灵活扩张，旺季中的价格竞争尤其值得关注。']}}),
 r('zervas2017','一行记录，怎样从订单变成酒店—月份','酒店经营记录与城市平台供给，组成不同层次的资料',[],
   'Data与Empirical Strategy；期中订单项目可由记录单位的变化联系到本案例。','酒店月收入怎样连接到相应城市、相应月份的平台供给？',{readingStep:'问题与资料',table:table(
    ['资料层次','记录单位','研究中的用途'],
    [['订单','一次预订','研究取消、渠道与订单条件'],
     ['酒店—月份','一家酒店的某月','记录月房费收入与经营条件'],
     ['城市—月份','某市场的某月','连接平台供给、需求与市场资料'],
     ['城市','多家酒店共享的市场','组织供给变化和聚类推断']])}),
 r('zervas2017','时间变化，怎样形成一项比较','平台进入前后与城市差异，一起进入面板分析',[],
   '课堂时间示意；甲乙丙用于理解进入顺序。','沿着一个城市的时间线，模型准备追踪哪一种变化？',{visual:'zervas-did',readingStep:'问题与资料'}),
 r('zervas2017','正文式(1)：把平台竞争写进面板模型','β连接平台供给与酒店月房费收入',[],
   '原文式(1)；City×Month表示城市×历月季节项，如“奥斯汀×3月”。','β、酒店效应、年月效应和X，各自对应什么经营信息？',{readingStep:'主要模型',model:{
    equations:['\\begin{aligned}\\log\\mathrm{HotelRevenue}_{ikt}&=\\beta\\log\\mathrm{AirbnbSupply}_{kt}+X_{ikt}^{\\mathsf T}\\gamma\\\\&\\quad+h_i+\\tau_t+\\mathrm{City}_k\\times\\mathrm{Month}_t+\\epsilon_{ikt}\\end{aligned}'],
    symbols:[['i,k,t','酒店、城市与年月'],['h_i','稳定的酒店特征'],['\\tau_t','共同年月变化'],['\\mathrm{City}\\times\\mathrm{Month}','城市的历月季节模式'],['X_{ikt}','经营、需求控制及城市趋势'],['\\beta','平台供给与酒店收入的弹性参数']],
    provenance:'作者公开稿第11页，原文式(1)',sourceKind:'original',layout:'wide'}}),
 r('zervas2017','读出β，再换成经营量级','作者稿主规格的供给系数约为−0.039',[],
   'Table 3；原文用供给增10%近似对应月房费收入降0.39%来解释量级。','对数模型怎样把供给增长换成酒店收入的相对变化？',{visual:'zervas-result',readingStep:'估计结果'}),
 r('zervas2017','酒店定位，帮助解释平均结果','价格区间与客群决定平台竞争的经营含义',[],
   '据作者稿异质性与定价分析作方向性概括。','哪些酒店的服务更容易被共享住宿替代？',{readingStep:'估计结果',table:table(
    ['经营特征','论文报告的方向','管理分析的切入点'],
    [['价格较低的酒店','收入影响更明显','关注价格竞争与客源替代'],
     ['较少服务商务客的酒店','收入影响更明显','比较休闲客与商务客需求'],
     ['高需求时段','定价反应更明显','跟踪旺季扩容、房价与收入']])}),
 r('zervas2017','把估计精度放回市场层次','同城酒店共享市场变化，原文按城市聚类',
   ['酒店效应组织稳定的店别差异，年月效应组织共同时间变化。','城市聚类让标准误对应同城与跨期的误差关联。','结果表把系数、样本和推断方式一起交给读者。'],
   '作者稿第13页；酒店—月份记录与城市供给的层次相互对应。','为什么市场层次的信息有助于读懂β的标准误？',{readingStep:'估计结果'}),
 r('zervas2017','从收入结果，读到价格竞争机制','平台供给、酒店定价与月房费收入可以连成一条经营解释',[],
   '按原文定价与异质性分析整理的机制示意。','收入变化可以引导酒店继续追踪哪些价格与客源信息？',{visual:'platform-pricing',readingStep:'管理解释'}),
 r('zervas2017','个人计算：把供给增长换成收入变化','沿正文的对数模型，设平台供给增加20%',
   ['用β=−0.039计算收入的精确相对变化。','结合酒店定位，提出一项值得继续跟踪的经营指标。'],
   '独立计算约90秒，可用计算器或自己的Python环境。','怎样把弹性参数、供给比例与收入比例连接起来？',{readingStep:'管理解释',kind:'question',exerciseId:'R14-Q3'}),
 r('zervas2017','反馈：用模型把变化量算清楚','供给增加20%，该规格对应收入变化约−0.71%',
   ['继续按酒店定位、客群和旺季追踪价格与收入。'],
   '课堂按原文系数换算；完成一个竞争分析，再转入可以安排措施的现场实验。','当企业能够安排管理支持时，可以怎样组织效果比较？',{readingStep:'管理解释',kind:'feedback',exerciseId:'R14-Q3',model:{
    equations:['\\frac{\\widehat R_{\\rm new}}{\\widehat R_{\\rm old}}=(1.20)^{-0.039}',
     '100\\big[(1.20)^{-0.039}-1\\big]\\approx-0.71\\%'],
    symbols:[['1.20','平台供给的新旧比'],['-0.039','Table 3报告的供给弹性'],['\\widehat R_{\\rm new}/\\widehat R_{\\rm old}','同一模型条件下的收入比']],
    provenance:'以Table 3系数进行课堂经营量级换算',sourceKind:'restatement',layout:'wide'}}),
 r('bloom2013','论文四：管理实践与生产率','Bloom等 · The Quarterly Journal of Economics · 2013',[],
   '期刊摘要中文提要；顺着管理措施、实践采纳与经营结果阅读。','摘要中的17%，对应哪一种管理措施和哪一个结果？',{readingStep:'题目与摘要',abstract:{
    locator:'期刊摘要，印刷第1—2页；中文提要',
    paragraphs:['作者在印度大型纺织企业开展管理现场实验，随机安排咨询实施支持，比较管理实践与经营结果的变化。',
     '论文报告首年生产率约提高17%，并观察到质量、效率与库存改善，以及较长期的产能扩张。',
     '作者进一步把企业此前未采纳这些实践的原因，联系到信息障碍和管理时间约束。']}}),
 r('bloom2013','随机安排在公司，经营记录在工厂与周','17家公司、28家工厂，组成一项分层次的现场研究',[],
   'III.C–D；两组共同接受诊断，处理组获得额外实施支持。','公司分配、工厂记录与周度观察，分别提供什么信息？',{visual:'bloom-design',readingStep:'问题与资料'}),
 r('bloom2013','先把“管理改善”与“生产率”分别量出来','管理用38项实践采纳比例记录，生产率由经营投入产出构造',
   ['质量记录、库存管理、作业标准与人员管理，为实践采纳提供可观察内容。'],
   '据V.A脚注18的TFP定义整理符号；资本与劳动权重分别为0.42和0.58。','管理实践指数与生产率结果，分别在模型中承担什么角色？',{readingStep:'问题与资料',model:{
    equations:['y^{\\rm TFP}_{it}=\\log VA_{it}-0.42\\log K_{it}-0.58\\log L_{it}'],
    symbols:[['VA','增加值'],['K','资本：土地、建筑、设备和库存'],['L','生产劳动小时'],['y^{\\rm TFP}','原文用于TFP分析的对数指数'],['M','38项管理实践的采纳比例']],
    provenance:'正文V.A脚注18的变量定义，课堂符号整理',sourceKind:'restatement',layout:'wide'}}),
 r('bloom2013','正文式(1)：咨询实施的ITT模型','参数a对应实施支持后的平均变化',[],
   '原文V.A式(1)；TREAT按原文从干预结束一个月后起记为1。','哪个系数在回答“这套实施支持带来多大经营变化”？',{readingStep:'主要模型',model:{
    equations:['\\mathrm{OUTCOME}_{i,t}=a\\,\\mathrm{TREAT}_{i,t}+b\\,\\mathrm{DURING}_{i,t}+c_t+d_i+e_{i,t}'],
    symbols:[['\\mathrm{OUTCOME}_{i,t}','质量、库存、产出或TFP结果'],['\\mathrm{TREAT}_{i,t}','处理工厂的实施后时期'],['\\mathrm{DURING}_{i,t}','从诊断开始的六个月窗口'],['c_t','日历周效应'],['d_i','工厂效应'],['a','咨询实施的ITT参数']],
    provenance:'期刊正文第23页，原文式(1)',sourceKind:'original',layout:'wide'}}),
 r('bloom2013','0.154怎样换成摘要里的约17%','先找到TFP列的a，再回到原尺度解释',[],
   'Table II列(4)：0.154个自然对数点，指数换算约16.65%。','为什么这里先取指数再减1？',{visual:'bloom-effect',readingStep:'估计结果'}),
 r('bloom2013','把量级与精度读成一份完整结果','同一项TFP估计，原表提供了这些推断信息',[],
   'Table II列(4)；各推断行按原文方法分别报告。','点估计、标准误与区间，各为这份结果增加了什么信息？',{readingStep:'估计结果',table:table(
    ['报告项','原文数值','怎样阅读'],
    [['TFP的ITT估计a','0.154','实施支持后的对数结果量级'],
     ['公司聚类bootstrap SE','0.084','原文采用的标准误'],
     ['置换检验p值','0.061','小样本推断信息'],
     ['Ibragimov–Mueller 95%区间','[−0.014, 0.79]','以区间表达估计精度'],
     ['该列观测数','1831','工厂—周记录']])}),
 r('bloom2013','附表A.II：把问题转为管理采纳程度','先解释M的变化，再解释M连接的经营结果',
   ['该表的TFP列报告IV斜率0.477，第一阶段F=86.00。'],
   '根据Appendix Table A.II的规格课堂转写；工具是累积实施周数。','与上一模型中的a相比，θ解释的是哪一种变化？',{readingStep:'主要模型',model:{
    equations:['M_{it}=\\pi W_{it}+c_t+d_i+v_{it}',
     'y^{\\rm TFP}_{it}=\\theta\\widehat M_{it}+c_t+d_i+u_{it}'],
    symbols:[['W_{it}','累积实施周数'],['M_{it}','38项管理实践的采纳比例'],['\\widehat M_{it}','工具提供的采纳变化'],['\\theta','管理采纳比例的IV斜率'],['c_t,d_i','周与工厂效应']],
    provenance:'Appendix Table A.II估计规格的课堂转写',sourceKind:'restatement'}}),
 r('bloom2013','论文给管理者的启发是什么','把管理知识转成执行支持，再观察流程与经营结果',
   ['诊断帮助识别改进位置，实施支持推动实践落地。','质量、库存与产出记录，让管理改善有可跟踪的经营指标。','信息、管理时间和咨询投入，进入实际推广的资源安排。'],
   '结合摘要、实验设计与结果讨论管理实践的采用。','如果为一家企业设计改进项目，你会先记录哪些流程与结果？',{readingStep:'管理解释'}),
 r('bloom2013','个人解释：两个模型怎样服务管理决策','一项问题问咨询实施效果，另一项问实践采纳变化',
   ['分别用a与θ解释这两项问题。','给管理者写一段能连接措施、过程与经营结果的说明。'],
   '独立思考约90秒；下一页将两个模型串成一段解释。','哪一个参数适合介绍咨询方案，哪一个参数连接管理实践指数？',{readingStep:'管理解释',kind:'question',exerciseId:'R14-Q4'}),
 r('bloom2013','反馈：措施效果与实践变化，可以接着读','ITT模型与IV模型，各自量化研究问题的一部分',
   ['a=0.154：额外实施支持对应的TFP变化量级，换算约17%。','θ=0.477：咨询推动的管理采纳变化与TFP连接的斜率。','下一篇同样安排一项管理措施，把结果转向员工留任与工作表现。'],
   'Table II与Appendix Table A.II；依次说明处理安排、管理过程与经营结果。','如果管理决策是每周两天居家，哪些结果最有助于企业判断？',{readingStep:'管理解释',kind:'feedback',exerciseId:'R14-Q4'}),
 r('bloom2024','论文五：混合办公、留任与工作表现','Bloom、Han与Liang · Nature · 2024',[],
   '摘要中文提要；先定义工作安排，再读离职、满意度与绩效。','摘要中的“留任改善”怎样进一步换成企业可以使用的量？',{readingStep:'题目与摘要',abstract:{
    locator:'Nature开放正文Abstract；中文提要',
    paragraphs:['文章通过2021—2022年一家中国科技企业1612名员工的六个月试验，评估每周两天居家的混合办公安排。',
     '作者报告工作满意度提高、离职率相对下降约三分之一；绩效评分与代码产出在原文等效范围内保持相当。',
     '研究还观察到管理者对混合办公生产率影响的看法变得更积极，为企业安排工作方式提供了具体证据。']}}),
 r('bloom2024','工作安排怎样进入实验','符合条件员工按生日日期奇偶，获得两种工作资格',[],
   'The experiment与Randomization：1612名员工，两批纳入，奇数日生日可周三、周五居家。','随机分配的工作资格，怎样对应到员工的实验期结果？',{visual:'hybrid-design',readingStep:'问题与资料'}),
 r('bloom2024','把实验比较写成离职率差','同一实验窗口，比较两种工作资格下的组均值',[],
   '据正文Fig.2与Methods组间比较整理；原文报告双侧t检验。','2.4个百分点与相对下降三分之一，怎样由同两个均值得到？',{readingStep:'主要模型',model:{
    equations:['\\widehat\\tau^{\\rm quit}_{\\rm ITT}=\\overline q_{Z=1}-\\overline q_{Z=0}=0.048-0.072=-0.024',
     '\\frac{0.048-0.072}{0.072}\\times100\\%\\approx-33.3\\%'],
    symbols:[['Z=1','可每周两天居家的资格组'],['Z=0','办公室工作组'],['q_i','六个月实验期是否离职'],['\\widehat\\tau^{\\rm quit}_{\\rm ITT}','按分配资格比较的离职率差']],
    provenance:'正文Fig.2与Methods组间比较的课堂数学表达',sourceKind:'restatement',layout:'wide'}}),
 r('bloom2024','把留任与工作表现放在一起看','企业关心员工是否留下，也关心工作怎样完成',[],
   '正文与Methods / Null results；绩效随访样本随时间变化。','哪些指标帮助企业同时评价人力成本与工作表现？',{readingStep:'估计结果',table:table(
    ['结果','观察窗口','论文提供的信息'],
    [['离职率','六个月实验期','办公室7.2%，资格组4.8%；p=0.043'],
     ['工作满意度','实验结束调查','资格组满意度更高'],
     ['绩效与代码产出','后续绩效评价与程序员记录','在原文等效范围内保持相当'],
     ['晋升','最长两年随访','组间差异未达统计显著']])}),
 r('bloom2024','个人换算：让率差进入人力资源预算','设有1000名类似岗位员工，采用相同的六个月窗口',
   ['按实验离职率差，换算预期少离职的人数。','按原文讨论中约2万美元/次的招聘培训成本，估算对应量级。'],
   '独立计算约90秒；1000人为课堂换算规模，成本口径来自原文Discussion。','一个百分点结果，怎样连接到招聘培训预算？',{readingStep:'管理解释',kind:'question',exerciseId:'R14-Q5'}),
 r('bloom2024','反馈：从率差到人数，再到成本量级','1000名同类岗位员工，对应约24次离职与48万美元',[],
   '课堂经营换算：1000人规模×实验率差；招聘培训成本约2万美元/次据Discussion。','如果向管理者汇报，你还会同时展示哪一项工作表现指标？',{visual:'hybrid-cost',readingStep:'管理解释',kind:'feedback',exerciseId:'R14-Q5'}),
 p('把五篇论文读成自己的研究范例','请选择一项熟悉的管理问题，仿照其中一篇组织证据',[],
   '独立思考约90秒：写出问题、资料、主要参数、结果指标和管理用途。','你选择的公式，怎样把管理问题变成一个可解释的量？',{visual:'study-comparison',source:'synthesis',kind:'question',exerciseId:'R14-Q6'}),
 p('反馈：从读懂论文，走向完成自己的分析','同样的阅读顺序，也能组织一项管理研究项目',[],
   '第15讲将打开真实餐饮评论，把顾客的文字整理成变量、图表和服务分析简报。','你的项目目前走到了哪一步，接下来准备产出哪一张表或图？',{visual:'project-reading-chain',source:'synthesis',kind:'feedback',exerciseId:'R14-Q6'})
];


/** Review follows the existing projects and avoids inventing hotel estimates. */
export const researchLessonFifteen:ResearchPage[]=textLessonFifteen;

export const researchLessons=[researchLessonFourteen,researchLessonFifteen];
const questions=[11,19,29,39,45,47];
export function getResearchPage(lesson:number,local:number){return researchLessons[lesson-14]?.[local-1];}
export function researchTiming(lesson:number,local:number){
 if(lesson===15)return textTiming(local);
 const question=questions.includes(local);
 return {spokenSeconds:4200/48,pauseSeconds:question?90:[1,48].includes(local)?30:15,
  section:local<=3?'论文阅读主线':local<=12?'论文一 · 授权与创造力':local<=20?'论文二 · 可持续战略':local<=30?'论文三 · 平台竞争':local<=40?'论文四 · 工厂管理':local<=46?'论文五 · 混合办公':'从论文到项目'};
}
export function researchSourceLabel(page:ResearchPage){
 if(page.source==='text')return 'ASAP真实餐饮评论 · 本课Python计算';
 if(page.source==='exercise')return '课堂概念算例与个人判断';
 if(page.source==='policy')return 'INPRES公开处理版 · 第12—13讲简化教学规格';
 if(page.source==='course')return '本课程第1—13讲 · 概念复习与已标明教学模拟';
 if(page.source==='synthesis')return '五篇期刊论文的课堂综合 · 完整题录见阅读材料';
 const paper=getResearchPaper(page.source);
 return paper.short+(page.source==='eccles2014'?' · 核读作者公开稿':page.source==='zervas2017'?' · 核读2016-11作者稿':'');
}
