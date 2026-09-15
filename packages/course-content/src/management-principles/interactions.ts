import type {ManagementDemo, ManagementValues, ManagementTable, ManagementDiagram} from './types.js';
import {phaseTwoDefinitions,getPhaseTwoVisibleDemo} from './interactions-phase2.js';
export {calculateManagementHierarchy} from './interactions-phase2.js';
export interface ManagementControl {key:string;label:string;min?:number;max?:number;step?:number;options?:{value:string;label:string}[]}
interface Definition {maxStep:number;defaults:Record<string,number|string|boolean>;controls:ManagementControl[]}
const definitions:Record<ManagementDemo,Definition>={
  ...phaseTwoDefinitions,
  efficiency:{maxStep:3,defaults:{step:0,resources:60,output:72},controls:[{key:'resources',label:'乙投入资源',min:20,max:140,step:10},{key:'output',label:'乙合格产出',min:0,max:120,step:6}]},
  system:{maxStep:3,defaults:{step:0,middle:8},controls:[{key:'middle',label:'中间环节能力（件/时）',min:2,max:20,step:1}]},
  timeline:{maxStep:5,defaults:{step:0},controls:[]},
  'theory-lenses':{maxStep:2,defaults:{step:0,lens:'scientific'},controls:[{key:'lens',label:'理论视角',options:[{value:'scientific',label:'科学管理'},{value:'relations',label:'人际关系'},{value:'system',label:'系统'},{value:'contingency',label:'权变'}]}]},
  'decision-process':{maxStep:5,defaults:{step:0},controls:[]},
  'payoff-matrix':{maxStep:3,defaults:{step:0,criterion:'optimistic'},controls:[{key:'criterion',label:'比较准则',options:[{value:'optimistic',label:'乐观'},{value:'pessimistic',label:'悲观'},{value:'regret',label:'最小最大后悔值'},{value:'equal',label:'等可能'}]}]},
  'environment-analysis':{maxStep:4,defaults:{step:0,framework:'pest'},controls:[{key:'framework',label:'分析框架',options:[{value:'pest',label:'PEST'},{value:'swot',label:'SWOT'}]}]},
  'decision-tree':{maxStep:3,defaults:{step:0,probability:0.7,largeGood:100,smallGood:40},controls:[{key:'probability',label:'销路好概率',min:0,max:1,step:0.05},{key:'largeGood',label:'大厂销路好收益（万元）',min:0,max:160,step:10},{key:'smallGood',label:'小厂销路好收益（万元）',min:0,max:80,step:5}]},
};
export function getManagementInteractionDefinition(demo:ManagementDemo){return definitions[demo];}
export function validateManagementInteraction(demo:ManagementDemo,patch:ManagementValues,current?:ManagementValues){
  const def=definitions[demo];
  if(!def || !Object.keys(patch).length || Object.keys(patch).some(k=>!Object.hasOwn(def.defaults,k)))return false;
  const merged={...def.defaults,...current,...patch};
  if(typeof merged.step!=='number'||!Number.isInteger(merged.step)||merged.step<0||merged.step>def.maxStep)return false;
  if(demo==='span-hierarchy'&&!Number.isInteger(merged.span))return false;
  return def.controls.every(c=>c.options?c.options.some(o=>o.value===merged[c.key]):typeof merged[c.key]==='number'&&Number.isFinite(merged[c.key])&&(merged[c.key] as number)>=c.min!&&(merged[c.key] as number)<=c.max!);
}
export interface ManagementVisibleDemo {
  heading:string; body:string[]; step:number; maxStep:number; table?:ManagementTable; diagram?:ManagementDiagram;
  metrics?:{label:string;value:string;detail?:string}[]; controls:ManagementControl[]; values:ManagementValues;
}
const fmt=(n:number)=>Number(n.toFixed(3)).toString();
const payoffRows=[[40,20,-10],[90,40,-50],[30,20,-4]];
export function evaluateManagementPayoffs(criterion:string){
  const columnMax=[0,1,2].map(c=>Math.max(...payoffRows.map(r=>r[c]!)));
  const regrets=payoffRows.map(r=>r.map((x,c)=>columnMax[c]!-x));
  const scores=payoffRows.map((r,i)=>criterion==='optimistic'?Math.max(...r):criterion==='pessimistic'?Math.min(...r):criterion==='regret'?Math.max(...regrets[i]!):r.reduce((a,b)=>a+b,0)/3);
  const best=criterion==='regret'?Math.min(...scores):Math.max(...scores);
  return {scores,regrets,winners:scores.flatMap((v,i)=>v===best?[['甲','乙','丙'][i]!]:[])};
}
export function evaluateManagementTree(probability:number,largeGood=100,smallGood=40){
  const grossLarge=probability*largeGood+(1-probability)*-20,grossSmall=probability*smallGood+(1-probability)*30;
  const netLarge=grossLarge-30,netSmall=grossSmall-20;
  return {grossLarge,grossSmall,netLarge,netSmall,choice:Math.abs(netLarge-netSmall)<1e-9?'两方案期望净收益相同':netLarge>netSmall?'大厂':'小厂'};
}
// Both the renderer and assistant use this projection. Unrevealed steps never appear in its output.
export function getManagementVisibleDemo(demo:ManagementDemo,input:ManagementValues={}):ManagementVisibleDemo {
  const def=definitions[demo],v={...def.defaults,...input},step=Math.max(0,Math.min(def.maxStep,Number(v.step)||0));
  const base={step,maxStep:def.maxStep,controls:def.controls,values:v};
  switch(demo){
    case 'efficiency':{
      const r=Number(v.resources),o=Number(v.output);
      const table:ManagementTable={headers:['组织','投入资源','合格产出','目标产出'],rows:[['甲',100,90,90],['乙',r,o,90]]};
      return {...base,heading:['比较两个组织','效率：产出与投入','效益：目标达成程度','把两个维度合起来'][step]!,table,
        body:step===0?['目标相同，投入与产出不同。哪一个组织表现更好？']:step===1?['效率＝合格产出÷投入资源。比值越高，单位资源产出越多。']:step===2?['本节沿用原稿口径：效益＝目标达成程度。目标达成率＝合格产出÷90。']:['较高效率与较高目标达成度可能并不同时出现。评价管理，需要同时明确目标、质量与资源约束。'],
        metrics:step===0?undefined:step===1?[{label:'甲效率',value:'0.9'},{label:'乙效率',value:fmt(o/r)}]:step===2?[{label:'甲达成率',value:'100%'},{label:'乙达成率',value:`${fmt(o/90*100)}%`}]:[{label:'乙效率',value:fmt(o/r)},{label:'乙达成率',value:`${fmt(o/90*100)}%`}]
      };
    }
    case 'system':{
      const b=Number(v.middle),throughput=Math.min(12,b,10);
      return {...base,heading:['观察三个连续环节','系统能力受到瓶颈约束','局部加速之后','协调各环节'][step]!,diagram:{kind:'flow',items:[`${step===2?16:12}件/时 · 前段`,`${b}件/时 · 中段`,'10件/时 · 后段']},
        body:step===0?['系统由相互联系、相互作用的要素组成，形成具有特定功能的整体。','教学模型：三个环节串联，投入充足，暂不考虑故障与缓冲限制。']:step===1?['系统具有整体性、相关性、有序性，并与外部环境互动。','稳定产出不能超过最慢环节的处理能力。']:step===2?['仅将前段由12提高到16件/时，并未提高当前系统瓶颈。局部忙碌不等于整体产出增加。']:['管理需要层次观点与开放观点，同时考察局部、整体及其环境。','调整中段能力，观察瓶颈转移。超过后段10件/时后，继续提高中段不再提高整体产出。'],
        metrics:step>0?[{label:'系统最大稳定产出',value:`${throughput}件/时`,detail:'由串联系统的最小能力决定'}]:undefined};
    }
    case 'timeline':{
      const eras=[['早期管理思想','古代协作、劳动分工与产业组织，为管理思想积累经验。'],['古典管理理论','科学管理、一般管理与科层组织，分别关注作业、管理职能与正式结构。'],['行为科学与人际关系','关注社会关系、动机、群体和人的行为。'],['丛林式发展','系统、决策、权变、经验与数量等视角形成并行研究。'],['制度与流程再造','组织正当性与流程变革，扩展管理问题的解释范围。'],['多视角并存','理论并非依次消灭前一理论，而是针对不同问题提供解释。']];
      return {...base,heading:eras[step]![0]!,body:[eras[step]![1]!,...(step===0?['劳动生产率、员工积极性、运作精细化与环境适应，推动管理思想演进。']:[])],diagram:{kind:'timeline',items:eras.slice(0,step+1).map(e=>e[0]!)}};
    }
    case 'theory-lenses':{
      const views:Record<string,string[]>={scientific:['科学管理','检查操作方法、工时、工具与培训，寻找可验证的作业改进。','过度聚焦标准与产出，可能忽略情绪、非正式关系和变化。'],relations:['人际关系','调查沟通、群体规范、归属感与认可，理解合作动机。','良好关系不能代替技术、资源与明确的绩效要求。'],system:['系统观点','把交付延迟放入采购、生产、质量和销售相互依赖的系统中。','系统边界过大时，需要明确优先级，避免分析失去重点。'],contingency:['权变观点','根据任务、技术、环境与人员特征选择适合的结构和管理方式。','需要说明哪些情境变量重要，不能只用“因情况而定”代替分析。']};
      const x=views[String(v.lens)]??views.scientific!;
      return {...base,heading:`同一车间 · ${x[0]}`,body:['共同取向：用科学分析代替单纯经验，使管理专业化、职业化。','教学情境：车间交付延迟，员工抱怨增加，返工率较高。',...(step>=1?[x[1]!]:['这一视角会优先调查什么？']),...(step>=2?[x[2]!]:[])]};
    }
    case 'decision-process':{
      const stages=[['识别问题','比较现状与预期，确认偏差是否需要处理。','需要什么证据，才能确认问题确实存在？'],['诊断原因','通过调查与询问区分表象和原因。','哪些原因可控，哪些需要适应？'],['确定目标','平衡最低、期望与最高目标。','哪些条件是不能放弃的最低要求？'],['制定备选方案','结合现有和可争取的条件，构思多种可行路径。','除了眼前方案，还能提出哪些选择？'],['评价与选择方案','检查可行性、目标满足程度和后续影响。','是否已达到满意标准，还是需要暂缓选择？'],['实施和监督','将选择转化为行动，通过反馈检查与修正。','什么信号说明应调整原决策？']];
      const s=stages[step]!;return {...base,heading:`${step+1} / 6 · ${s[0]}`,body:[...(step===0?['决策是解决问题的过程，受到环境、组织历史、决策者特点和组织文化的影响。']:[]),s[1]!,s[2]!],diagram:{kind:'timeline',items:stages.slice(0,step+1).map(s=>s[0]!)}};
    }
    case 'payoff-matrix':{
      const c=String(v.criterion),r=evaluateManagementPayoffs(c);
      const titles:Record<string,string>={optimistic:'取各方案最大收益，再取最大',pessimistic:'取各方案最小收益，再取最大',regret:'各状态最优收益减本方案收益，再最小化最大后悔值',equal:'无概率信息时，另作三状态等可能的教学假定'};
      return {...base,heading:step===0?'甲、乙、丙三种产品方案':titles[c]!,table:{headers:['方案','销路好','一般','销路差',...(step>=2?['准则值']:[])],rows:payoffRows.map((row,i)=>[['甲','乙','丙'][i]!,...(c==='regret'&&step>=1?r.regrets[i]!:row),...(step>=2?[fmt(r.scores[i]!)]:[])])},body:[step===0?'原例题收益，单位万元；三种市场状态的概率未知。':c==='regret'?'当前表格为后悔值：状态最优收益－该方案收益。':titles[c]!,...(step>=3?[`按此准则选择：${r.winners.join('、')}。不同准则表达不同的风险态度或附加假设。`]:[]) ]};
    }
    case 'environment-analysis':{
      const pest=[['P 政策法律','食品安全、信息披露与公平竞争规则会影响经营约束。'],['E 经济','成本、购买力和门店单位经济性，需要明确期间的数据。'],['S 社会文化','消费习惯、便利需求与品牌信任，是需要调查的线索。'],['T 技术','数字点单、供应链与门店系统，为效率改善提供可能。']];
      const swot=[['S 优势','2025年末31048家门店形成触达网络；网络能否持续有效运营还需证据。'],['W 劣势','快速扩张带来组织协调、质量和联营管理的挑战；具体薄弱点需要核验。'],['O 机会','不同地区与人群的未满足需求，可能提供发展空间，需要市场调查。'],['T 威胁','竞争、原材料成本及信任事件可能增加经营压力，需要持续监测。']];
      const list=v.framework==='swot'?swot:pest;
      return {...base,heading:`瑞幸案例 · ${String(v.framework).toUpperCase()}`,body:step===0?['2025年末门店31048家：自营20234家，联营10814家。','规模扩大触达网络，也增加运营、质量控制与合作管理的要求。','用PEST识别外部线索，再用SWOT整理内外部条件。以下分析线索仍需业务证据验证。']:list.slice(0,step).map(x=>`${x[0]}：${x[1]}`),diagram:step===0?undefined:{kind:'quadrants',items:list.slice(0,step).map(x=>x[0]!)}};
    }
    case 'decision-tree':{
      const prob=Number(v.probability),lg=Number(v.largeGood),sg=Number(v.smallGood),r=evaluateManagementTree(prob,lg,sg);
      const table:ManagementTable={headers:['方案','投资','销路好收益','销路差收益'],rows:[['大厂',30,lg,-20],['小厂',20,sg,30]]};
      return {...base,heading:['建立决策树','展开市场状态','反推期望收益','扣除投资并比较'][step]!,table:step===0?table:undefined,diagram:step>=1?{kind:'decision-tree',items:[`大厂 · 投资30`,`好 ${fmt(prob)} · ${lg}`,`差 ${fmt(1-prob)} · −20`,`小厂 · 投资20`,`好 ${fmt(prob)} · ${sg}`,`差 ${fmt(1-prob)} · 30`]}:undefined,
        body:step===0?['原例题：单期收益，单位万元；默认好销路概率0.7，不考虑货币时间价值。']:step===1?['概率之和为1；比较方案时必须使用相同的状态与期间口径。']:step===2?[`大厂期望收益：${lg}×${fmt(prob)}＋(−20)×${fmt(1-prob)}＝${fmt(r.grossLarge)}。`,`小厂期望收益：${sg}×${fmt(prob)}＋30×${fmt(1-prob)}＝${fmt(r.grossSmall)}。`]:[`大厂净收益${fmt(r.netLarge)}万元，小厂净收益${fmt(r.netSmall)}万元。`,`按期望净收益：${r.choice}。改变概率或收益参数后，结论可能变化。`],
        metrics:step===3?[{label:'大厂净收益',value:fmt(r.netLarge)},{label:'小厂净收益',value:fmt(r.netSmall)}]:undefined};
    }
    default:return getPhaseTwoVisibleDemo(demo,v,step,base);
  }
}
