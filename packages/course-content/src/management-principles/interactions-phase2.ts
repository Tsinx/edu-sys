import type {ManagementPhaseTwoDemo,ManagementValues} from './types.js';
import type {ManagementVisibleDemo} from './interactions.js';

export const phaseTwoDefinitions={
 'rolling-plan':{maxStep:3,defaults:{step:0},controls:[]},
 'pdca-shop':{maxStep:4,defaults:{step:0},controls:[]},
 'club-design':{maxStep:6,defaults:{step:0},controls:[]},
 'span-hierarchy':{maxStep:2,defaults:{step:0,span:4},controls:[{key:'span',label:'每位管理者最多直接管理人数',min:2,max:8,step:1}]},
 'recruitment-flow':{maxStep:5,defaults:{step:0},controls:[]},
 'candidate-evidence':{maxStep:4,defaults:{step:0},controls:[]},
 'culture-layers':{maxStep:3,defaults:{step:0},controls:[]},
 'saic-integration':{maxStep:4,defaults:{step:0},controls:[]},
};
export function calculateManagementHierarchy(basePeople=64,span=4){
 if(!Number.isInteger(basePeople)||basePeople<1||!Number.isInteger(span)||span<2)throw new RangeError('Positive whole-number people and span >= 2 required');
 const levels=[basePeople];
 while(levels.at(-1)!>1)levels.push(Math.ceil(levels.at(-1)!/span));
 return {basePeople,span,levels,managementLevels:levels.length-1,totalLevels:levels.length,managers:levels.slice(1).reduce((a,b)=>a+b,0)};
}
export function getPhaseTwoVisibleDemo(demo:ManagementPhaseTwoDemo,v:ManagementValues,step:number,base:Pick<ManagementVisibleDemo,'step'|'maxStep'|'controls'|'values'>):ManagementVisibleDemo{
 switch(demo){
  case 'rolling-plan':{
   const start=2011+step;
   const changes=['建立2011—2013年初始窗口；2011年安排具体行动。','检查2011年执行差异；2012年计划细化，并补入2014年。','结合2012年反馈；2013年计划细化，并补入2015年。','结合2013年反馈；2014年计划细化，并补入2016年。'];
   return {...base,heading:`${start}年：三年计划窗口`,table:{headers:['期间','详略程度','本轮安排'],rows:[[`${start}年`,'近：具体','明确行动、责任、时间与资源'],[`${start+1}年`,'中：较粗','分阶段任务与主要约束'],[`${start+2}年`,'远：概略','方向、关键假设与目标范围']]},body:['教学时间轴沿用原图2011—2016年，窗口持续向前滚动。',changes[step]!,'调整记录示例：若需求、资源或进度与前提不同，说明变化、理由和对应措施；本例未给定实际经营数据。']};
  }
  case 'pdca-shop':{
   const headings=['从经营问题出发','P：制定试行计划','D：推出并记录','C：观察与比较','A：把发现变成行动'];
   const body=[['服装店想知道顾客偏好，以及哪些产品带来更多利润。','原情境：每两周推出2款新产品，持续半年。'],['确定试行节奏，并协调供应商交付时间。','考虑新产品折扣推广，预先明确销售、利润和顾客反馈的观察口径。'],['按计划推出产品、开展推广并记录销售与顾客反应。','同时记录折扣、价格、进货成本、供货时间等条件。'],['观察哪些产品受到欢迎，以及在相同口径下的利润表现。','原稿没有实际销量或利润结果。折扣和供货变化也可能影响表现，不能把相关变化直接认定为产品偏好的因果效果。'],['依据已获得的证据调整选品、推广或供应安排。','把有效做法形成标准；尚未解决的问题和新的假设进入下一轮。','检查记录属于观察证据；调整商品或流程属于改进行动。']];
   return {...base,heading:headings[step]!,body:body[step]!,diagram:{kind:'timeline',items:['经营问题','计划','实施','检查','改进'].slice(0,step+1)}};
  }
  case 'club-design':{
   const stages=[
    ['从社团目的出发','原稿学生社团案例：先说明社团目标、成员需要和可持续开展的活动。','哪些任务必须有人负责？'],
    ['把活动分解为任务','确定活动策划、会员服务、宣传联络、行政与资源管理等工作。','任务划分示例；可根据原社团目标调整。'],
    ['把任务组合成部门','把相近工作适当归并，明确各部门职责与接口。','部门名称不能代替具体任务和负责人。'],
    ['安排职权与协作','确定社长、副社长、部门负责人与成员之间的责任关系。','哪些决定由谁作出，哪些事项需要横向协调？'],
    ['对照原结构','原图：社长与两位副社长，连接项目、外联、宣传、人力资源与办公室；项目部下设项目组A和B。','结构需要与任务量、成员能力和传承要求相匹配。'],
    ['检查运行问题','观察信息传递、部门协作、负责人负担和经验传承。','发现问题后再判断应改变职责、流程还是结构。'],
    ['比较原稿创新方案','原方案增加社长助理、顾问团、知识管理部、资深会员部和重大项目部。','两位副社长分别协调会员传承与项目；办公室支持。增加部门可能改善分工，也增加协调成本。'],
   ];const s=stages[step]!;
   return {...base,heading:s[0]!,body:s.slice(1),diagram:step===6?{kind:'org-chart',variant:'club-innovation',items:['社长','社长助理 · 顾问团','副社长：会员传承','副社长：项目','办公室','知识管理部 · 资深会员部 · 会员部','重大项目部 · 项目部']}:step===4?{kind:'org-chart',variant:'club-base',items:['社长','两位副社长','项目部 · 外联部 · 宣传部 · 人力资源部 · 办公室','项目组A · 项目组B']}:{kind:'timeline',items:stages.slice(0,step+1).map(s=>s[0]!)}};
  }
  case 'span-hierarchy':{
   const r=calculateManagementHierarchy(64,Number(v.span));
   return {...base,heading:['64名基层人员，怎样分层？','逐层向上取整','比较岗位数量与协调代价'][step]!,body:step===0?['教学模型：基层人数固定为64，每个管理岗位至多直接管理所选幅度的人数。','只设置容纳下一层所需的最少岗位，直到出现1个最高层岗位。调整幅度后再推进计算。']:step===1?[`从基层向上：${r.levels.join(' → ')}。`,`每层人数＝ceil(下一层人数÷${r.span})；管理层数${r.managementLevels}，含基层总层数${r.totalLevels}。`]:[`管理岗位合计＝${r.levels.slice(1).join('＋')}＝${r.managers}。`,`在本模型下共有${64+r.managers}人。幅度越大，模型所需层级与岗位通常越少，但个人协调负担也可能增加。`,'现实结构还受任务复杂度、人员能力、技术与授权影响，不存在由此模型推出的统一最优幅度。'],table:step>0?{headers:['层次',...r.levels.map((_,i)=>i===0?'基层':`管理${i}`)],rows:[['人数',...r.levels]]}:undefined,metrics:step===2?[{label:'管理岗位',value:String(r.managers)},{label:'总层数（含基层）',value:String(r.totalLevels)}]:undefined};
  }
  case 'recruitment-flow':{
   const stages=[['岗位与信息发布','Z设计院改制后招聘战略管理人员。发布广告20天，收到130多份简历。'],['初步筛选','3名人力资源人员用7天筛选，留下31份简历。原稿只给“130多份”，不能计算精确初筛通过率。'],['笔试与测评','安排3天，考查管理与财务知识、16PF、成就/失败动机和7项能力倾向。测评结果需要结合岗位证据解释。'],['第一轮面试','31人分3天参加：10人、10人、11人。通过半结构化面试选择3名候选人。'],['进一步沟通','第二次面试用半天，了解候选人的职业发展方向与薪酬要求。'],['回顾流程','人力资源人员与外聘专家组成9人工作组，总过程超过1个月。后续由领导进一步面试。','数量链：130多份 → 31份 → 3人；阶段、耗时和人员数使用各自原口径。']];
   const s=stages[step]!;
   return {...base,heading:s[0]!,body:s.slice(1),diagram:{kind:'timeline',items:stages.slice(0,step+1).map(s=>s[0]!)}};
  }
  case 'candidate-evidence':{
   if(step===0)return {...base,heading:'三位候选人：先看岗位证据',body:['岗位重视战略规划、沟通协调、组织管理、分析解决问题、责任感与个人影响力。','领导访谈：2位领导半天，4位部门领导1天，每人约1.5小时。原材料未给评分表。','下一步展开候选人资料；原案例的年龄、性别与户籍需求是背景，不直接用作能力评分。']};
   if(step===1)return {...base,heading:'候选人的原始资料',table:{headers:['候选人','原稿经历与表现'],rows:[['李先生，38岁','麦肯锡；交流表现突出；缺少与政府部门打交道的经验'],['赵女士，37岁','国际会计师事务所；曾在沿海国有设计院工作，服务同业；现北京工作；沟通、人际与协调较好；希望解决北京户籍'],['张先生，40岁','澳大利亚博士；设计院下属公司，组织过大型设计项目；技术较强，沟通相对较弱']]},body:['比较岗位证据与未获得的信息。','这些是原案例的面试判断与背景，尚无统一量化评分。']};
   if(step===2)return {...base,heading:'原录用决定',body:['设计院选择了李先生。','原稿给出的考虑是：希望引入不同类型人才，重视沟通能力和活力。','这个决定是否充分考虑了岗位任务、行业经验、授权和双方期待？']};
   if(step===3)return {...base,heading:'后续表现：事实到这里',body:['入职第二个月，李先生表达离职意向；经挽留留下，但积极性下降。','原材料没有提供其完整解释、实际绩效记录或后续调查。','能够观察到结果，并不意味着已经知道原因。']};
   return {...base,heading:'把事实与原因假设分开',table:{headers:['可能的解释','仍需核实的证据'],rows:[['岗位与期待不匹配','工作内容、招聘沟通与本人访谈'],['授权或支持不足','实际职责、资源与协作记录'],['组织适应存在困难','入职支持、沟通与反馈'],['个人或外部因素','本人说明及相关事实']]},body:['复盘招聘环节和实际工作情境。','这些是竞争性假设。现有证据尚不足以判断哪一种解释更符合此次事件。']};
  }
  case 'culture-layers':{
   const materials=[['精神层：我们怎样理解','价值观、理念与共同预期，影响成员认为哪些事情值得做。'],['制度层：规则怎样支持','规章制度、组织机构、管理机制及培训活动，把理念联系到日常安排。'],['器物层：看得见的环境','工作场所、设备、建筑与环境，表达并影响日常实践。'],['行为与形象：检验一致性','成员的实际行为共同形成外部认知；社会反馈和实践经验也可能促使理念、规则与环境调整。']];
   return {...base,heading:materials[step]![0]!,body:[materials[step]![1]!,'理念、制度与实际行为是否一致？'],diagram:{kind:'culture-layers',items:materials.slice(0,Math.min(step+1,3)).map(m=>m[0]!),center:step===3?'实践与社会形象的反馈':'逐层观察'}};
  }
  case 'saic-integration':{
   const bodies=[['战略设想是全球经营与产品、研发、采购、营销协同。','2004年签约报道约5亿美元、48.9%；2006年报告记载2005年1月协议受让48.917%，2006年6月底51.10%。'],['2009年1月8日董事会决议，1月9日提交回生申请；2月6日公布法院批准决定。','当时公告持股51.33%；半年报记载申请后失去控制，不再纳入合并范围。'],['原案例关注认同、技术与品牌整合、劳资关系和沟通。','上汽事后材料也提及全球金融危机、债务与现金流压力；这是当事方陈述，不能单独确定各因素的因果权重。'],['比较经营环境、利益安排、治理协调与文化沟通几种解释。','韩国位于朝鲜半岛南部。不能用“岛国性格”或民族整体态度解释具体组织行为。'],['文化整合的行动可以包括澄清权责、沟通就业与技术安排、提供参与渠道和建立共同工作规则。','这些行动是依据问题提出的管理建议，不是已经证明可以避免此次失败的反事实结论。']];
   return {...base,heading:['协同的设想','事件时间线','出现了哪些困难？','比较竞争性解释','从解释到整合行动'][step]!,body:bodies[step]!,table:step===3?{headers:['解释','需要的证据'],rows:[['外部经营冲击','销量、市场与融资条件变化'],['利益与资源冲突','就业、技术与投资安排'],['治理和劳资协调','权责、谈判与执行记录'],['认同与沟通差异','具体访谈、沟通及协作过程']]}:undefined};
  }
 }
}
