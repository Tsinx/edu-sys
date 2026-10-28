import {POLICY_DATA as D} from './policy-evidence.js';
import type {ResearchPage} from './research-lessons.js';
import {researchPapers} from './research-literature.js';
/** Public descriptions of current-page evidence. Teacher scripts are separate. */
export const researchDescriptions:Record<string,string>={
 'study-map':'五个问题：授权怎样连接创造力；可持续战略与长期表现；Airbnb扩张与酒店月收入；咨询实施与工厂生产率；混合办公资格与员工离职。',
 'paper-catalog':'Zhang与Bartol，2010，AMJ，CFA/SEM；Eccles等，2014，Management Science，匹配；Zervas等，2017，JMR，面板差分；Bloom等，2013，QJE，现场实验与IV；Bloom等，2024，Nature，混合办公实验。',
 'paper-route':'每篇阅读顺序：完整题目与摘要→问题与资料→正文主要模型→估计结果→管理解释。围绕同一项摘要主张连续阅读。',
 'zhang-sample':'670名员工获邀，498份可用员工响应；219名主管获联系，164份主管响应；最终367份员工—主管配对响应。响应数不等于最终配对数。',
 'zhang-path':'Figure 2主结构路径：L授权型领导→P心理赋能；P→M内在动机、E创意过程参与；M→E、C员工创造力；E→C。字母与下一页结构方程一一对应。',
 'eccles-match':'高可持续企业90家，候选对照269家，经行业条件和倾向得分最近邻不放回匹配，保留90对，共180家。',
 'eccles-timeline':'高可持续组自1990年代初采用有关政策；1993年财务条件匹配；后续考察长期表现，2009年前后核查组织流程。匹配量是否真正处理前，取决于具体政策采用日期。',
 'zervas-did':'课堂示意：甲、乙、丙城市在不同月份进入平台市场；条带展示处理时点不一，不是实际城市数据或数值结果。',
 'zervas-result':'作者2016年11月公开稿Table 3：log平台供给系数约−0.039；作者近似解释供给增加10%，酒店月房费收入下降0.39%。不是取消率或利润。',
 'bloom-design':'17家公司、28家工厂；公司层面随机安排，11家处理公司、6家对照公司。20家实验工厂中14家处理、6家对照，另8家非实验工厂。两组共同诊断，处理组额外实施支持。',
 'bloom-practices':'38项可观察管理实践的采纳比例；流程类别包括质量记录、库存管理、作业标准与人员管理。类别仅作测量说明，不复制完整清单。',
 'bloom-effect':'期刊版Table II列4：TFP的ITT系数0.154个自然对数点；100×(exp(0.154)−1)=16.649%，约17%。',
 'bloom-iv':'ITT：额外实施支持→TFP，对数点估计0.154。Appendix Table A.II的IV：累积实施周数→38项管理实践采纳比例→logTFP，IV斜率0.477，第一阶段F=86.00。两者处理量与单位不同；F不证明排除限制。',
 'hybrid-design':'1612名符合条件员工；先518名自愿者，后1094名非自愿者纳入。生日日期奇偶分配：奇数日获周三、周五居家资格，偶数日办公室。资格的ITT不同于实际居家天数的作用。',
 'hybrid-rates':'六个月实验期离职率：办公室7.2%，混合办公资格4.8%；绝对差−2.4个百分点；相对变化(4.8−7.2)/7.2=−33.3%；正文报告p=0.043。',
 'platform-pricing':'按作者稿定价与异质性分析整理：平台房源扩张，旺季供给更灵活，酒店定价随竞争调整，月房费收入发生变化。按酒店定位、客群与时段追踪价格和收入。',
 'hybrid-cost':'课堂管理量级换算：假设1000名类似岗位员工、同一六个月窗口；实验离职率差0.072−0.048=0.024，预期少离职24人次；原文Discussion报告招聘培训成本约20000美元/次，对应480000美元，即48万美元。',
 'study-comparison':'授权与创造力—员工主管配对与构念测量—心理与行为路径；可持续战略—企业配对、组织记录与组合收益—战略、流程与长期表现；平台竞争—酒店月记录与城市平台供给—供给弹性与价格竞争；管理咨询—公司分配与工厂周记录—实施支持与实践采纳的经营量级；混合办公—员工资格与行政记录—留任、表现与人力资源成本。',
 'project-reading-chain':'研究问题→对象与测量→资料整理→比较设计→模型与结果→管理解释→论文与复现。每一步对应一项可以检查、可以继续完成的项目成果。',
 'review-project':'期中项目：学习通酒店订单资料，探索、清理、Logit与PDF。期末项目：自选管理问题与资料，机制或因果路线，论文PDF。按学习通要求执行。',
 'research-chain':'研究问题→对象与测量→资料核查→比较设计→估计与诊断→有条件的解释→论文与复现。',
 'review-ci':'第1讲教学模拟：会员与非会员月消费均值差150元/人/月，Welch 95% CI [86.3,213.7]；每组240人。不是利润或推广因果效果。',
 'review-logit':'课堂假设算例：起始概率0.20，优势0.25；OR=2后优势0.50；新概率1/3约0.333；风险比约1.67；概率差约13.3个百分点。不是酒店数据估计。',
 'review-mechanism':'课堂概念关系：满意度→忠诚；或忠诚→满意度；或共同原因同时影响两者。横截面关系与拟合不足以单独排除替代解释。',
 'review-weight':'课堂权重[1,1,1,1]，ESS=16/4=4；[1,1,1,7]，ESS=100/52约1.923。ESS观察权重集中，不自动等于独立样本数。',
 'review-fe':'门店效应吸收稳定店别差异；月份效应吸收共同月份变化；门店聚类处理误差相关。三者不自动排除店内时变混杂。',
 'review-did-cells':'真实公开处理版的四格：'+D.cells.map(c=>(c.high?'高':'低')+'强度、'+(c.young?'年轻':'年长')+'，n='+c.n+'，教育加权均值='+c.mean).join('；')+'。单位年；不同出生队列不是个人面板。',
 'review-iv-design':'Z暴露差异→S教育→Y对数工资；U家庭与能力同时影响S、Y；Z直接影响Y的路径需要排除。相关性、外生性与排除分别论证。',
 'review-iv-results':'共同工资样本n='+D.iv.n+'；第一阶段π='+D.first.beta+'；简约式ρ='+D.reduced.beta+'；2SLS β='+D.iv.beta+'；同一权重、控制和290个出生地区聚类。只说明第13讲简化规格的计算联系。',
 'review-repro':'项目目录：README运行入口；data/raw原始资料只读；data/processed派生表；src或notebooks计算；outputs表图与核查；report论文PDF与参考文献。受限资料按权限记录来源与访问方法。'
};
export function researchEvidenceText(page:ResearchPage){
 if(page.visual&&!researchDescriptions[page.visual])throw new Error('Missing research evidence: '+page.visual);
 const paper=page.abstract?researchPapers.find(p=>p.id===page.source):undefined;
 return [page.formula?'本页公式：'+page.formula:'',page.visual?researchDescriptions[page.visual]:'',
  paper?paper.title+'；'+paper.authors+'；'+paper.journal+' '+paper.year+'；DOI '+paper.doi+'。摘要中文提要：'+page.abstract!.paragraphs.join('；')+'。摘要位置：'+page.abstract!.locator:'',
  page.model?'本页模型：'+page.model.equations.join('；')+'。符号：'+page.model.symbols.map(s=>s.join('：')).join('；')+'。公式出处：'+page.model.provenance:'',
  page.table?page.table.headers.join(' / ')+'；'+page.table.rows.map(r=>r.join(' / ')).join('；'):''].filter(Boolean).join('\n');
}
