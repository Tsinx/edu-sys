import type {ManagementPhaseThreeDemo,ManagementValues} from './types.js';
import type {ManagementControl,ManagementVisibleDemo} from './interactions.js';
interface Definition{maxStep:number;defaults:Record<string,number|string|boolean>;controls:ManagementControl[]}
export const phaseThreeDefinitions:Record<ManagementPhaseThreeDemo,Definition>={
 'course-allocation':{maxStep:3,defaults:{step:0,proposal:'lottery'},controls:[{key:'proposal',label:'配置方案',options:[{value:'lottery',label:'随机分配250座位'},{value:'repeat',label:'假设增开同容量班次'},{value:'hybrid',label:'课堂与网络资源结合'}]}]},
 'science-practice':{maxStep:3,defaults:{step:0},controls:[]},
 'organization-change':{maxStep:3,defaults:{step:0,stage:'unfreeze',barrier:'information'},controls:[{key:'stage',label:'变革阶段',options:[{value:'unfreeze',label:'解冻'},{value:'change',label:'转变'},{value:'stabilize',label:'再冻结'}]},{key:'barrier',label:'主要障碍',options:[{value:'information',label:'信息不足'},{value:'adaptation',label:'适应困难'},{value:'interests',label:'利益变化'}]}]},
 'organization-learning':{maxStep:3,defaults:{step:0,learning:'single'},controls:[{key:'learning',label:'学习方式',options:[{value:'single',label:'单循环'},{value:'double',label:'双循环'},{value:'meta',label:'再学习'}]}]},
 'innovation-types':{maxStep:3,defaults:{step:0,example:'routine'},controls:[{key:'example',label:'教学行动',options:[{value:'routine',label:'执行既有检查程序'},{value:'increment',label:'试行局部流程改进'},{value:'radical',label:'重新设计全组织协作'}]}]},
 'innovation-process':{maxStep:4,defaults:{step:0},controls:[]},
 'risk-response':{maxStep:3,defaults:{step:0,likelihood:3,impact:3,response:'mitigate'},controls:[{key:'likelihood',label:'可能性等级（教学1—5）',min:1,max:5,step:1},{key:'impact',label:'影响等级（教学1—5）',min:1,max:5,step:1},{key:'response',label:'拟讨论的处理方式',options:[{value:'avoid',label:'避免'},{value:'share',label:'分担'},{value:'mitigate',label:'降低'},{value:'retain',label:'保留'}]}]},
 'crisis-evidence':{maxStep:4,defaults:{step:0},controls:[]},
 'financial-ratios':{maxStep:3,defaults:{step:0,ratio:'current',numerator:200,denominator:100},controls:[{key:'ratio',label:'指标',options:[{value:'current',label:'流动比率'},{value:'quick',label:'速动比率'},{value:'debt',label:'资产负债率'}]},{key:'numerator',label:'教学分子金额（万元）',min:0,max:1000,step:10},{key:'denominator',label:'教学分母金额（万元）',min:0,max:1000,step:10}]},
 'quality-dmaic':{maxStep:4,defaults:{step:0,units:1000,opportunities:2,defects:10},controls:[{key:'units',label:'教学样本件数',min:100,max:10000,step:100},{key:'opportunities',label:'每件定义的缺陷机会',min:1,max:10,step:1},{key:'defects',label:'观察到的缺陷数',min:0,max:100,step:1}]},
 'control-timing':{maxStep:3,defaults:{step:0},controls:[]},
 'procurement-controls':{maxStep:4,defaults:{step:0},controls:[]},
 'communication-network':{maxStep:4,defaults:{step:0,network:'chain',sender:'A'},controls:[{key:'network',label:'正式网络',options:[{value:'chain',label:'链式'},{value:'wheel',label:'轮式'},{value:'y',label:'Y式'},{value:'ring',label:'环式'},{value:'all',label:'全通道式'}]},{key:'sender',label:'初始发送者',options:['A','B','C','D','E'].map(value=>({value,label:value}))}]},
 'dorm-feedback':{maxStep:4,defaults:{step:0},controls:[]},
 'equity-comparison':{maxStep:3,defaults:{step:0,comparison:'others'},controls:[{key:'comparison',label:'比较对象',options:[{value:'others',label:'寝室同伴'},{value:'past',label:'过去的自己'}]}]},
 'zhang-expectancy':{maxStep:3,defaults:{step:0,period:'highschool',valence:1,expectancy:1},controls:[{key:'period',label:'案例阶段',options:[{value:'highschool',label:'高中升学'},{value:'freshman',label:'大一学习'},{value:'sophomore',label:'大二部分课程'},{value:'game',label:'游戏活动'},{value:'return',label:'重新学习'}]},{key:'valence',label:'教学效价 V（0—1）',min:0,max:1,step:0.1},{key:'expectancy',label:'教学期望 E（0—1）',min:0,max:1,step:0.1}]},
 'situational-leadership':{maxStep:3,defaults:{step:0,ability:'low',willingness:'low'},controls:[{key:'ability',label:'完成当前任务的能力',options:[{value:'low',label:'尚不足'},{value:'high',label:'已具备'}]},{key:'willingness',label:'当前任务的意愿／信心',options:[{value:'low',label:'不足或不安'},{value:'high',label:'愿意且有信心'}]}]},
 'fiedler-match':{maxStep:3,defaults:{step:0,relations:'good',structure:'high',power:'strong'},controls:[{key:'relations',label:'领导者—成员关系',options:[{value:'good',label:'好'},{value:'poor',label:'差'}]},{key:'structure',label:'任务结构',options:[{value:'high',label:'结构化'},{value:'low',label:'非结构化'}]},{key:'power',label:'职位权力',options:[{value:'strong',label:'强'},{value:'weak',label:'弱'}]}]},
};
export function classifyTaskReadiness(ability:string,willingness:string){return ability==='high'?(willingness==='high'?4:3):(willingness==='high'?2:1);}
export function calculateManagementRatio(numerator:number,denominator:number){return denominator===0?null:numerator/denominator;}
export function calculateDpmo(units:number,opportunities:number,defects:number){return units<=0||opportunities<=0||defects<0||defects>units*opportunities?null:defects/(units*opportunities)*1_000_000;}
export function classifyFiedlerSituation(relations:string,structure:string,power:string){return 1+(relations==='poor'?4:0)+(structure==='low'?2:0)+(power==='weak'?1:0);}
export function traceCommunicationNetwork(network:string,sender:string,round:number){
 const ids=['A','B','C','D','E'];
 const edges:Record<string,string[][]>={chain:[['A','B'],['B','C'],['C','D'],['D','E']],wheel:[['A','C'],['B','C'],['D','C'],['E','C']],y:[['A','C'],['B','C'],['C','D'],['D','E']],ring:[['A','B'],['B','C'],['C','D'],['D','E'],['E','A']],all:ids.flatMap((a,i)=>ids.slice(i+1).map(b=>[a,b]))};
 const links=edges[network]??edges.chain!;
 const source=ids.includes(sender)?sender:'A';
 const distance:Record<string,number>={[source]:0};
 for(let n=0;n<4;n++)for(const [a,b] of links){if(distance[a!]===n&&distance[b!]===undefined)distance[b!]=n+1;if(distance[b!]===n&&distance[a!]===undefined)distance[a!]=n+1;}
 return {ids,links,distance,reached:ids.filter(id=>distance[id]!<=round)};
}
export function getPhaseThreeVisibleDemo(demo:ManagementPhaseThreeDemo,v:ManagementValues,step:number,base:Pick<ManagementVisibleDemo,'step'|'maxStep'|'controls'|'values'>):ManagementVisibleDemo{
 switch(demo){
  case 'course-allocation':{
   const proposal=String(v.proposal);
   const choices:Record<string,string[]>={lottery:['从600个学习需求中随机分配250个现场机会，仍有350人未获得座位。','若机会等同且抽签规则公平，每人的入选机会为250÷600，约41.67%；这不是学习效果。'],repeat:['教学假设：若能够再开一个250座位班次，合计500个名额，仍少于600个需求。','原案例教师尚不能承担额外工作，故500是条件计算，不是已经可行的方案。'],hybrid:['现场教学配合网络资源，可能扩大部分学习材料的可及范围。','原稿没有给出网络容量、成本或学习效果，不能补造新增人数或保证相同体验。']};
   return {...base,heading:['确认资源与需求','观察当前缺口','比较所选方案','检查实施条件'][step]!,body:step===0?['原案例：学习需求增加至约600人，最大教室250座。','人员、时间、媒介和空间共同形成约束。']:step===1?['按600人需求计算，单班现场名额缺口为600−250＝350人。','这里用原案例的约数作教学计算，不是当前学校统计。']:step===2?choices[proposal]!:['比较公平性、教师负担、成本、安全及学习质量。','改变规则、增加供给和改进利用各有条件；可以组合方案，但不能将网络资源等同无限的优质教学供给。'],metrics:step>=1?[{label:'原案例容量',value:'250座'},{label:'教学需求基数',value:'600人'},{label:'单班缺口',value:'350人'}]:undefined};
  }
  case 'science-practice':{
   const body=[['教学情境：同一个小组计划，在两个任务中产生不同结果。','可以先检查哪些条件不同，而不是立即宣布理论无用。'],['科学性：明确概念、提出解释、收集证据，检验解释是否成立及适用范围。','理论提供分析工具，不保证在所有场景准确预测结果。'],['艺术性：结合具体人、时机与条件运用知识，处理难以完全标准化的判断。','技巧与直觉仍需接受结果、证据和责任的检验。'],['理论指导实践；行动与反思检验并修正认识，再进入新的实践。','掌握知识、熟练判断与实际绩效有关联，但不能把它们视为同一件事。']];
   return {...base,heading:['从结果差异提出问题','用证据检验解释','在情境中运用知识','连接理论、实践与反思'][step]!,body:body[step]!,diagram:step===3?{kind:'cycle-phase3',items:['理论与假设','实践行动','观察证据','反思修正']}:undefined};
  }
  case 'organization-change':{
   const stage=String(v.stage),barrier=String(v.barrier);
   const stages:Record<string,string>={unfreeze:'解冻：理解需要，倾听顾虑，检查准备条件。',change:'转变：设计并试行新安排，协调过渡，收集反馈。',stabilize:'再冻结：评估有效做法，使资源、制度与支持相互配合。'};
   const barriers:Record<string,string>={information:'成员不了解目的和后果。先核对信息差异，不能直接判定其不愿合作。',adaptation:'成员担心技能或工作条件不足。需要明确实际困难，而非只要求改变态度。',interests:'角色、收入、权力或机会可能变化。需要了解具体影响和正当诉求。'};
   const responses:Record<string,string>={information:'比较教育沟通与参与：解释依据、开放提问，并吸收一线信息；人数多时需要时间。',adaptation:'比较便利支持与参与：提供练习、培训和过渡资源；支持可能有成本，也需检验效果。',interests:'比较协商与制度调整：明确权利、责任及履约安排；不能把取得同意当作问题永久解决。'};
   return {...base,heading:['选择阶段与障碍','辨认具体问题','比较应对方式','检查结果与下一步'][step]!,body:step===0?[stages[stage]!, '教学情境：一个服务团队试行新的协作流程；这里不设置企业成功率。']:step===1?[barriers[barrier]!, '同一阶段可能同时存在多种障碍。']:step===2?[responses[barrier]!, '操纵或强制可能损害信任与权利；快速执行不能替代正当程序。']:['核对行为、服务结果及成员反馈，检查障碍是否变化。','三阶段是分析模型，实际过程可能反复；制度稳定后仍需要持续学习。'],diagram:{kind:'flow',items:step===0?['选择阶段']:step===1?['选择阶段','识别障碍']:step===2?['选择阶段','识别障碍','比较应对']:['选择阶段','识别障碍','比较应对','检验反馈']}};
  }
  case 'organization-learning':{
   const kind=String(v.learning);
   const methods:Record<string,string>={single:'单循环：在既定服务目标和规则内调整排班，减少等待。',double:'双循环：进一步讨论服务目标、预约规则和优先顺序是否合理。',meta:'再学习：检查团队如何收集反馈、表达不同意见、保存与检验经验。'};
   return {...base,heading:['观察共同问题','选择学习的着眼点','使认识进入组织行动','联系学习型组织'][step]!,body:step===0?['教学情境：服务窗口反复出现等待，团队准备复盘。','个人发现问题，并不自动使组织改变。']:step===1?[methods[kind]!, '三种方式各有用途，不能按名称断言一种始终更高级。']:step===2?['共同检查证据、明确试行安排、观察反馈，再调整认识和行动。','需要防止个人行动无法进入组织、错误归因及反馈含混等学习障碍。']:['学习型组织关注持续学习的条件与实践，不是某一种学习方式的别名。','系统思考、自我超越、改善心智模式、共同愿景和团体学习相互支持；完成清单并不保证成效。'],diagram:{kind:'flow',items:['发现问题','检查认识','组织行动','反馈学习'].slice(0,step+1)}};
  }
  case 'innovation-types':{
   const cases:Record<string,{scene:string;role:string;degree:string;scope:string;organization:string}>={routine:{scene:'按既有程序检查服务申请，记录异常并转交处理。',role:'主要属于维持：执行和保障已有安排。',degree:'没有给出新的做法，不能仅因工作有效就称为创新。',scope:'在既有流程内运行。',organization:'已有组织程序；本例不属于创新类型分类对象。'},increment:{scene:'一个小组发现申请反复补交材料，设计并试行新的预检查清单。',role:'改变已有做法并进入试行，可作为局部创新的教学例。',degree:'渐进改进：在既有流程上调整。',scope:'局部、要素层面的改变。',organization:'由小组有组织实施；最初的建议也可能由个人自发提出。'},radical:{scene:'组织经过共同讨论，重新设计各部门的端到端协作与责任关系并开展实施。',role:'涉及组织整体运作方式的较大改变。',degree:'激进改变：幅度较大；不因此自动属于颠覆式创新。',scope:'整体、结构层面的改变。',organization:'有组织的变革，需要协调与运行保障。'}};
   const c=cases[String(v.example)]??cases.routine!;
   return {...base,heading:['先观察行动','比较维持与创新','从不同维度分类','检查类型与效果的边界'][step]!,body:step===0?['以下均为教学情境，不是企业实测案例。',c.scene]:step===1?[c.role,'日常维持可以支持创新；形成的新做法也需要稳定运行。']:step===2?[c.degree,c.scope,c.organization]:['程度、范围与组织方式属于不同维度，同一行动可以同时具有多个属性。','激进式强调改变幅度；颠覆式关注特定市场进入和演进路径，二者不能互换。','类型本身不决定成败，需要检查成本、能力、实施和实际价值。']};
  }
  case 'innovation-process':{
   const bodies=[['教学情境：服务申请反复补交材料，但目前只有零散反馈。','先收集流程和需求证据，确认问题、机会与相关群体。'],['决策依据：核实的需求和流程资料；对象：申请处理过程。','水平：局部试行；方法：比较备选方案；时机：具备试行条件时。','这些是教学设定，尚未证明哪种方案有效。'],['确定责任、资源、协作接口和试行范围。','支持参与者理解并使用新做法，保留问题反馈与调整渠道。'],['评价技术可行性、实施过程、系统协调及结果。','没有前后同口径资料和适当比较，不能宣布效率提高了某个百分比。'],['根据证据决定扩大、调整、继续观察或停止。','有效做法形成新常规，新的问题再进入下一轮探索。']];
   return {...base,heading:['识别机会','作出创新决策','组织实施','评价过程与结果','学习并选择下一步'][step]!,body:bodies[step]!,diagram:{kind:'flow',items:['机会','决策','实施','评价','再选择'].slice(0,step+1)}};
  }
  case 'risk-response':{
   const likelihood=Number(v.likelihood),impact=Number(v.impact);
   const strategies:Record<string,string>={avoid:'避免：取消或改变相关活动，比较同时失去的机会与替代方案。',share:'分担：按合同安排部分损失后果，检查限额、除外责任及对方履约能力。',mitigate:'降低：改变发生条件或减少后果，验证措施是否有效及其成本。',retain:'保留：知情接受部分风险，并明确资金、监测与响应安排。'};
   return {...base,heading:['先明确评价对象与尺度','观察可能性和影响的组合','比较处理方式','复核剩余风险与条件变化'][step]!,body:step===0?['教学情境：一项活动可能延误，进而影响后续服务。','1—5仅为有序等级，数值不是概率，也不是以万元计的损失。']:step===1?[`当前组合：可能性 ${likelihood}，影响 ${impact}。教学评分乘积为 ${likelihood*impact}。`,'乘积相同不表示风险相同。例如高影响低可能与低影响高可能，需要不同准备。']:step===2?[strategies[String(v.response)]!,'等级不能自动决定唯一策略；还要考虑目标、人员安全、责任、能力与成本。']:['措施实施后，重新检查发生条件、后果、责任与新产生的风险。','没有措施效果数据时，不自动降低图上的等级，不补造风险减少比例。'],diagram:step>=1?{kind:'risk-position',items:[],nodes:[{id:'current',label:'当前教学组合',x:likelihood,y:impact}]}:undefined};
  }
  case 'crisis-evidence':{
   const bodies=[['2017年1月31日，GitLab.com主数据库在处理故障过程中被误删。','先区分：发生了什么、已掌握什么信息、还有什么未知。'],['企业记录指出，受影响的是GitLab.com的数据库内容与服务可用性。','Git仓库和wiki存储未发生相同的数据丢失；不能据知名客户名单推断其自托管系统也被影响。'],['团队使用可用快照恢复，并通过状态消息、公开进展文档及直播更新情况。','公开沟通不能暴露用户机密；透明也不等于把生产数据交给所有观看者操作。'],['服务后来恢复，但约六小时的部分数据库数据无法找回。','恢复可用性、恢复全部数据和消除用户损失，是三个不同结果。'],['官方复盘讨论操作环境区分、备份恢复、告警与流程等问题。','改进要落实为责任、测试及持续检查；不能把全部原因归于某个员工，也不能宣称透明沟通必然使危机变机遇。']];
   return {...base,heading:['事故事实','确认影响范围','技术恢复与信息公开','核对恢复结果','复盘原因与改进'][step]!,body:bodies[step]!,diagram:{kind:'flow',items:['事件','范围','响应','结果','改进'].slice(0,step+1)}};
  }
  case 'financial-ratios':{
   const kind=String(v.ratio),n=Number(v.numerator),d=Number(v.denominator),result=calculateManagementRatio(n,d);
   const labels=kind==='quick'?['速动比率','速动资产','流动负债']:kind==='debt'?['资产负债率','负债总额','资产总额']:['流动比率','流动资产','流动负债'];
   const invalidAssets=kind==='debt'&&n>d;
   const value=result===null?'未定义':kind==='debt'?`${(result*100).toFixed(2)}%`:result.toFixed(2);
   return {...base,heading:['明确指标与数据口径','写出分子和分母','计算当前教学参数','解释结果与比较边界'][step]!,body:step===0?['选择原稿中的一个偿债指标。所有金额是教学设定，不属于任何企业。','各项取同一时点、相同单位；切换指标后可重新设置金额。']:step===1?[`${labels[0]} = ${labels[1]} ÷ ${labels[2]}。`,kind==='quick'?'速动资产应明确剔除存货、预付款等项目的口径，不直接等于全部流动资产。':'分子、分母必须具有与指标定义一致的范围。']:step===2?[`${n} ÷ ${d} ${result===null?'：分母为0，不计算比率。':`＝ ${value}。`}`,...(invalidAssets?['本组负债大于资产，可能对应负权益的教学情形，需要检查数据和背景。']:[])]:['不能凭单项比率判定企业健康；行业、资产质量、到期结构与现金流都影响解释。','原课件没有统一最优值，本演示不设置“合格线”。'],table:step>=1?{headers:['指标组成','教学金额（万元）'],rows:[[labels[1]!,n],[labels[2]!,d]]}:undefined,metrics:step>=2?[{label:labels[0]!,value,detail:'教学计算；非企业数据'}]:undefined};
  }
  case 'quality-dmaic':{
   const u=Number(v.units),o=Number(v.opportunities),d=Number(v.defects),dpmo=calculateDpmo(u,o,d);
   const body=[['D 定义：明确顾客要求、问题、项目范围和改进目标。','教学样本的件数、机会数及缺陷数可以调整；它们不是企业实测数据。'],[`M 测量：DPMO = 缺陷数 ÷（件数 × 每件机会数）× 1,000,000。`,dpmo===null?'当前参数无效，检查机会总数与缺陷数。':`${d} ÷（${u} × ${o}）× 1,000,000 = ${dpmo.toFixed(2)}。`,'机会定义必须一致；这不是每百万件不良品数。'],['A 分析：检查测量可靠性，寻找变异与缺陷的原因假设。','分层、过程分析与实验可以提供证据；相关并不自动说明因果。'],['I 改进：比较方案，在受控范围试验，测量结果与副作用。','原稿没有改善后的数值，不补造降幅或成功率。'],['C 控制：保持有效做法，明确监测、责任及异常响应。','当前DPMO不能直接证明过程达到六西格玛；还需说明分布、稳定性与指标约定。']][step]!;
   return {...base,heading:['定义问题','建立可比较的测量','验证原因','试验并评估改进','保持改进与持续观察'][step]!,body,diagram:{kind:'flow',items:['D 定义','M 测量','A 分析','I 改进','C 控制'].slice(0,step+1)},metrics:step>=1?[{label:'教学 DPMO',value:dpmo===null?'不可计算':dpmo.toFixed(2),detail:'每百万缺陷机会'}]:undefined};
  }
  case 'control-timing':{
   const body=[['教学情境：采购一批材料，用于加工并交付产品。','先区分投入、转换与产出，再观察控制措施的位置。'],['前馈控制发生在行动之前：核查需求、供应商资格、预算和材料规格。','它旨在预防偏差，不能保证后续过程不会出错。'],['同期控制发生在活动进行之中：检查加工过程、用料和进度，及时处理偏差。','同一活动中的检查，也可能是下一项活动的前馈信息。'],['反馈控制在取得结果后比较交付质量、成本等与标准，改进下一轮活动。','三类控制相互补充；用时间位置分类，不把纠正快慢或处罚程度当作分类依据。']][step]!;
   return {...base,heading:['先定位活动过程','行动前：前馈控制','进行中：同期控制','结果后：反馈控制'][step]!,body,diagram:{kind:'flow',items:step===0?['投入','转换','产出']:['前馈：投入条件','同期：转换过程','反馈：产出结果'].slice(0,step)}};
  }
  case 'procurement-controls':{
   const body=[['教学流程：需求与预算→询价和选择→合同与订单→验收和付款→复核改进。','先识别权限与证据，不把任何个人或供应商预设为有问题。'],['需求与选择：明确规格和授权，推荐、准入与审批适当分离。','独立询价与价格数据库可帮助核对报价；价格异常是调查线索，并非舞弊结论。'],['验收与付款：核对订单、实收材料与验收记录，检查质量及金额。','技术验证、验收和付款保留相互检查；岗位轮换可作补充，不能替代权限与职责分离。'],['独立监督可采用走查、抽样和必要的二次询价；定期分析价格变化及其原因。','若发现异常，先保存证据、核查范围，再按权限纠正，不宣称数据库能够杜绝操纵。'],['复核纠正是否有效，检查同类采购是否也受影响，并更新流程。','原案例没有提供这些措施实施后的完整效果数据；这里展示控制设计，不编造损失追回或成功比例。']][step]!;
   return {...base,heading:['画出过程与责任','控制需求、准入与报价','控制验收与付款','独立核查并纠正偏差','复核结果与更新流程'][step]!,body,diagram:{kind:'flow',items:['识别过程','需求与报价','验收与付款','核查与纠正','复核与改进'].slice(0,step+1)}};
  }
  case 'communication-network':{
   const network=String(v.network),sender=String(v.sender),r=traceCommunicationNetwork(network,sender,step);
   const positions:Record<string,number[][]>={chain:[[100,200],[250,200],[400,200],[550,200],[700,200]],wheel:[[170,70],[630,70],[400,200],[170,330],[630,330]],y:[[210,60],[590,60],[400,150],[400,250],[400,350]],ring:[[400,55],[660,160],[560,340],[240,340],[140,160]]};
   const xy=positions[network]??positions.ring!;
   return {...base,heading:step===0?'选择网络与初始发送者':`第 ${step} 轮 · 信息沿连接推进`,
    diagram:{kind:'communication-network',items:[`已收到：${r.reached.join('、')}`],nodes:r.ids.map((id,i)=>({id,label:id,x:xy[i]![0]!,y:xy[i]![1]!,active:r.reached.includes(id)})),edges:r.links.map(([from,to])=>({from:from!,to:to!,active:Math.min(r.distance[from!]!,r.distance[to!]!)<step}))},
    body:[`当前发送者：${sender}。已收到信息的成员：${r.reached.join('、')}。`,'教学规则：5名成员，连线可双向沟通，每轮只沿一条边转发；暂不考虑延迟、丢失与处理能力。',...(step===0?['观察结构，再推进一轮。']:step<4?['哪些成员需要中转？如果发送者改变，路径会怎样变化？']:['轮数是本模型的最短传播距离，不是现实沟通效率或满意度的测量。'])]};
  }
  case 'dorm-feedback':{
   const bodies=[
    ['小许晚睡晚起，丫丫要求夜间不说话、不开灯，自己早起声音较大。陈丹感到困扰却难以开口，素素需早起兼职并尽量不扰人。','先说清哪些行为与需要发生了冲突。'],
    ['原分析指出：刚醒时争论、双方不满、强硬表达、方式不合适、只要求别人改变。','“对方故意针对我”属于原因解释；需要与可观察行为分开核对。'],
    ['表达具体行为及其影响，再邀请对方说明需要。例如：“早晨的声音使我醒来，你需要几点准备出门？”','请对方复述理解，检查是否漏掉学习、休息或工作安排。示例措辞为教学补充。'],
    ['共同讨论灯光、声音与早晚活动安排，形成双方可接受、能够执行的约定。','情绪过强时可暂停，或请双方接受的第三方协助；不把地域与性格作为原因定论。'],
    ['约定之后，观察声音、休息受扰及执行困难，再调整方案。','原稿没有提供最终协议或后续结果；不能把讨论中的方案当作已成功解决。'],
   ];
   return {...base,heading:['观察行为与需要','区分事实和原因解释','表达并核对理解','协商可执行的安排','观察反馈与再调整'][step]!,body:bodies[step]!,diagram:{kind:'flow',items:['观察','理解','反馈','协调','再检查'].slice(0,step+1)}};
  }
  case 'equity-comparison':{
   const past=v.comparison==='past';
   return {...base,heading:['先明确投入和回报','选择比较对象','观察感知到的相对关系','检查比较的边界'][step]!,
    body:step===0?['张华曾努力学习，获得升学结果、奖学金和社团认可。后来，他对部分课程的价值产生疑问。','哪些投入和回报应进入比较？这里使用原案例的定性信息，不编造工资或努力分数。']:step===1?[past?'纵向比较：现在的学习与过去的学习，所追求的回报相同吗？':'横向比较：张华看到寝室同伴较多参与娱乐，仍认为他们能够毕业。','比较的是当事人的感知，尚不足以认定分配是否客观公平。']:step===2?[past?'Oₚ／Iₚ 与 Oₕ／Iₕ：高中努力与升学目标相连，大学学习的目标与回报可能发生变化。':'Oₚ／Iₚ 与 O꜀／I꜀：如果把回报仅理解为毕业，可能忽略知识、能力、成绩及长期机会。','感到相对回报降低，可能引出投入调整、重新解释、更换比较对象或表达不满。']:['可比较的信息是否完整？任务、时间范围与回报定义是否一致？','改变感知不等于消除真实的不公平；需要同时检查分配结果、程序和表达渠道。','原案例没有共同量表，不能把多种投入与回报直接相除得到精确分数。'],
    table:step===0?{headers:['原线索','可观察内容'],rows:[['投入','学习时间、努力与参与'],['回报','升学、奖学金、认可及知识发展']]}:step===1?{headers:['比较方向','对象'],rows:[[past?'纵向':'横向',past?'过去的自己':'寝室同伴']]}:undefined};
  }
  case 'zhang-expectancy':{
   const cases:Record<string,{goal:string;observation:string;original:string}>={
    highschool:{goal:'考入理想大学',observation:'目标明确，持续努力。',original:'原稿教学赋值 V=1、E=1，因此 M=1。'},
    freshman:{goal:'继续学习并获得认可',observation:'延续习惯，获得奖学金与社团认可。',original:'原稿描述效价与期望均较高，没有给出测量分数。'},
    sophomore:{goal:'理解部分课程的用途',observation:'对课程价值产生怀疑，投入下降。',original:'原稿把效价描述为较低，部分极端例取 V=0；零不是实测值。'},
    game:{goal:'获得升级和同伴认可',observation:'即时反馈具有吸引力。',original:'原稿教学赋值 V=1、E=1，因此 M=1。'},
    return:{goal:'重新投入学习',observation:'希望改善成绩，但对能否追上有所顾虑。',original:'原稿使用 E=0 说明乘积为0；困难或信心较低不能直接证明期望等于0。'},
   };
   const c=cases[String(v.period)]??cases.highschool!;
   const valence=Number(v.valence),expectancy=Number(v.expectancy),m=Number((valence*expectancy).toFixed(3));
   return {...base,heading:['先确定所追求的结果','区分吸引力与实现预期','计算当前教学设定','对照原稿并检验解释'][step]!,
    body:step===0?[`目标：${c.goal}。`,c.observation,'先判断目标及证据，再讨论效价与期望。']:step===1?['V：这个结果对张华有多大吸引力？E：他认为自己的行动多大程度能带来该结果？','控制项为0—1的正向教学尺度，不是对张华的心理测量；切换阶段不会自动替他赋值。']:step===2?[`原简化式 M = V × E = ${valence} × ${expectancy} = ${m}。`,'任一因素为0，乘积为0；增加一个因素能提高多少，还取决于另一个因素。']: [c.original,'效价或期望较低，不等于能力为零。支持行动还需检查方法、资源及反馈。','进一步分析时，应区分努力到绩效、绩效到回报，以及回报的吸引力。'],
    metrics:step>=2?[{label:'教学乘积 M',value:String(m),detail:'当前参数；非实际心理测量'}]:undefined};
  }
  case 'situational-leadership':{
   const r=classifyTaskReadiness(String(v.ability),String(v.willingness));
   const options=[['S1 告知','高任务、低关系','明确任务、步骤与检查点。'],['S2 推销','高任务、高关系','解释理由，指导练习，并提供支持。'],['S3 参与','低任务、高关系','倾听顾虑，共同讨论，支持成员作决定。'],['S4 授权','低任务、低关系','明确边界后扩大自主权，按约定跟踪。']];
   const match=options[r-1]!;
   return {...base,heading:['先观察一项具体任务','用能力和意愿描述准备度','比较模型中的领导方式','重新观察任务与成员条件'][step]!,
    body:step===0?['教学情境：一名成员承担一项明确工作。先判断其任务能力与意愿／信心。','赫塞与布兰查德的情境领导关注行为与具体条件的匹配。']:step===1?[`当前组合为 R${r}：${v.ability==='high'?'具有':'尚缺少'}任务能力，${v.willingness==='high'?'愿意且有信心':'意愿不足或感到不安'}。`,'这些描述针对当前任务，不能作为永久的人格标签。']:step===2?[`原 R1—R4 模型建议：${match[0]}，${match[1]}。`,match[2]!]:['能力、意愿和任务条件会变化，匹配需要重新检查。','低关系行为并非不关心成员；授权仍需清晰责任、资源和风险边界。','模型提供分析线索，不能保证某种方式一定获得预期绩效。'],
    table:step===0?{headers:['观察维度','当前条件'],rows:[['能力',v.ability==='high'?'已具备':'尚不足'],['意愿／信心',v.willingness==='high'?'愿意且有信心':'不足或不安']]}:step>=2?{headers:['准备度','方式','行为组合'],rows:[[ `R${r}`,match[0]!,match[1]!]]}:undefined};
  }
  case 'fiedler-match':{
   const n=classifyFiedlerSituation(String(v.relations),String(v.structure),String(v.power));
   const rows=[['成员关系',v.relations==='good'?'好':'差'],['任务结构',v.structure==='high'?'结构化':'非结构化'],['职位权力',v.power==='strong'?'强':'弱']];
   // The source curve is qualitative. Do not turn an unlabeled curve into fitted numerical coefficients.
   const interpretation=n<=2?'很有利端：原模型较偏向任务取向。':n===8?'很不利端：原模型较偏向任务取向。':n>=4&&n<=6?'中间区域：原模型较偏向关系取向。':'处于两类区域的过渡位置；原定性曲线不能提供精确的分界或绩效数值。';
   return {...base,heading:['选择三个情境条件','定位八种组合','观察定性匹配关系','改变情境，检验适配'][step]!,table:{headers:['情境因素','当前条件'],rows},
    body:step===0?['三个因素依次组合成八种情境。调整条件，再观察其位置。']:step===1?[`当前为第 ${n} 种组合。组合1最有利，组合8最不利；原图按成员关系、任务结构、职位权力排序。`]:step===2?[interpretation,'这里的曲线表示理论上的关系，不是当前团队的测量结果。']:['费德勒把领导取向视为相对稳定。可以选择适合情境的领导者，或调整任务结构、权限等条件。','这与随任务准备度调整行为的情境领导、帮助成员排除路径障碍的路径—目标理论不同。','原“只有两种方法”限定为模型内的思路，现实组织还需要检验资源、制度与协作等因素。'],
    metrics:step>0?[{label:'情境组合',value:`${n} / 8`}]:undefined};
  }
 }
}
