import {getManagementSlide, getManagementVisibleDemo, MANAGEMENT_LESSONS, MANAGEMENT_SCOPE_LABEL, getManagementLessonLabel, type ManagementValues} from '@edu/course-content/management-principles';
export const MANAGEMENT_COURSE_PROMPT=`《管理学》根据管理学课程组、韦笑老师原始课件建设。已建设${MANAGEMENT_SCOPE_LABEL}：${MANAGEMENT_LESSONS.map(l=>l.title).join('、')}。遵循原知识点与讲授顺序，密集页拆为连续页面。课程代码与总学时尚缺，不得推算。教师控制翻页与分步演示；学生同步观看，无强制投票、分组或提交。历史理论保留时代语境，现实数据标明期间，量化例题以给定参数和模型条件为准。生成插图是艺术示意，不能作为统计或历史证据。`;
const lessonFocus:Record<number,string>={
 0:'管理学研究对象、历史与学习方法；选课案例参数属于教学情境，资源配置要比较条件与公平，学习活动没有通用固定记忆率。',
 1:'区分管理、管理者与组织，理解职能、角色、技能及管理原理；效率与目标达成度分别解释。',
 2:'沿原稿历史顺序理解科学管理、一般管理、科层、人际关系、行为科学、系统、决策、权变、数量、制度与再造；理论是视角而非固定人群标签。',
 3:'围绕六步决策过程、原红黑牌讨论与定量例题，说明目标、标准、可行性、风险和反馈。未出现的例题答案不能提前提供。',
 4:'先分析宏观、行业与内部环境，再讨论理性及行为决策、方法与机会评价。第四讲两份原文件连续衔接；区分历史案例与当前年度资料。',
 5:'计划、目标管理、PDCA、预算与决策追踪。区分PERT与CPM；按原网络与当前已揭示条件解释计算；服装店没有实际销量利润结果。',
 6:'组织设计的条件、原则、结构与职权。矩阵不等于临时项目组；64人幅度模型逐层向上取整，管理层数与含基层总层数分开，无统一最优幅度。',
 7:'人员配备、招聘、考评与培训。微软旧比例奖金不可当现行承诺；Z设计院130多份不是精确分母。候选人结果及原因假设严格随当前可见步骤。',
 8:'组织文化的概念、分类、层次、功能及塑造。企业信息图属于历史材料；上汽双龙的公告事实、当事方陈述与竞争性解释分开，不作民族刻板归因。',
 9:'区分情境领导、费德勒与路径目标；准备度针对具体任务，不把文化群体均值当个体性格。',
 10:'激励理论、公平比较、期望及强化；负强化不等于惩罚。案例期间和制度适用范围分别说明。',
 11:'沟通过程、正式与非正式网络、反馈和冲突方式；信息到达不等于理解或同意。',
 12:'前馈、同期、反馈控制与控制过程；采购异常是核查线索，不直接认定舞弊。',
 13:'预算、审计、比率、标杆、质量和信息技术；分子分母与期间一致，六西格玛说明假设。',
 14:'风险与危机的识别、准备、响应与复盘；等级乘积不是损失期望，事实与原因假设分开。',
 15:'维持与创新、创新类型、机会与过程、评价审计；想法不等于已实现创新。',
 16:'组织变革、结构、文化、知识与学习；模型有适用条件，海尔公开资料不等于绩效因果证明。'
};
export function buildManagementPageContext(index:number,values:ManagementValues={}){
  const p=getManagementSlide(index),demo=p.demo?getManagementVisibleDemo(p.demo,values):undefined;
  const publicMaterial={title:p.title,body:demo?undefined:p.body,table:demo?undefined:p.table,diagram:demo?undefined:p.diagram,note:p.note,label:p.label,sources:p.sources,
    visibleDemo:demo?{heading:demo.heading,body:demo.body,table:demo.table,diagram:demo.diagram,metrics:demo.metrics,step:demo.step,maxStep:demo.maxStep,parameters:demo.values}:undefined};
  const withheld=demo?demo.step<demo.maxStep:['exercise','question'].includes(p.layout);
  const revealBoundary=demo&&withheld?'\n【分步约束】控制器中的选项只表示教师待比较的选择，不是案例已经符合该类型的证据。不得从选项、来源标题或一般知识推出尚未显示的分类、匹配方式、原因或结论；只描述当前visibleDemo的正文、图表和指标。'+(p.demo==='organization-learning'&&demo.step===0?'本步仅提出服务窗口反复等待与团队复盘的问题，尚未展示任何学习类型的解释，不得判断团队属于哪种学习层次。':''):'';
  const support=`【本页定位】当前${getManagementLessonLabel(p.lessonNumber)}，第${p.localIndex}/${p.localTotal}页；标题：${p.title}。\n【问题从何而来】本页属于“${p.section}”。${lessonFocus[p.lessonNumber]} 以当前可见的事实、条件或问题为起点，先确认需要解释的管理现象。\n【本页材料与概念联系】本页实际公开材料：${JSON.stringify(publicMaterial)}\n【后续如何使用】仅说明当前概念如何帮助观察、比较或决策；不引用后续页面的标题、数据或结论。是否推进步骤、翻页或改变参数，由教师决定。\n【综合回答方式】先指出材料中与提问相关的事实或给定条件，再解释它与管理概念的关系，最后给出简短结论或待验证的问题。区分事实、推论与教学假设，避免把单一例子概括成普遍因果规律。\n【本页专属约束】只解释上述材料；尚未揭示的步骤、后续页答案和原稿备注均未提供，不得提前推导最终答案。必要时给出观察问题或下一步检查方法。历史数据、教学规则和现实统计分别说明；不把艺术示意图当作史料或统计证据，不把历史政策当作现行政策。`;
  return {lesson:`${getManagementLessonLabel(p.lessonNumber)}：${p.lessonTitle}。${lessonFocus[p.lessonNumber]} 教师决定课堂节奏，不自动跳页。`,defaultText:support+revealBoundary,support:support+revealBoundary,withheld,visibleSummary:demo?[demo.heading,...demo.body].join('；'):p.summary};
}
