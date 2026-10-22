import data from './policy-data.json' with {type:'json'};
export const POLICY_DATA=data;
export const pf=(x:number,digits=3)=>x.toFixed(digits);
export const POLICY_PROJECT_BASE='/course-assets/statistical-analysis/project-12-13';
type Table={headers:string[];rows:(string|number)[][]};
const cells=(values:typeof data.cells)=>values.map(r=>[r.high?'高强度地区':'低强度地区',r.young?'年轻队列 2—6岁':'年长队列 12—17岁',r.n,pf(r.mean)]);
const modelRow=(label:string,m:typeof data.education)=>[label,pf(m.beta),`[${m.ci.map(v=>pf(v)).join(', ')}]`,m.n];
export const policyTables:Record<string,Table>={
 schema:{headers:['原列 / 派生列','含义','使用边界'],rows:[['yeduc','受教育年限 / 年','1995年调查记录'],['lhwage','小时工资的自然对数','缺失不能填0'],['recp → high','来源预定义的高建校强度地区','不是随机分配'],['p504thn → age74','1974年的年龄 = 74 − 出生年后两位','不是1995年的年龄'],['weight / birthpl','观测权重 / 出生地区','按出生地区聚类']]},
 audit:{headers:['检查环节','记录数','含义'],rows:[['下载的处理版',data.audit.rawRows,'一个来源文件'],['教育、出生年、权重有效',data.audit.validRows,'剔除1行关键资料缺失'],['2—6岁或12—17岁',data.audit.eligibleRows,'第12讲教育主样本'],['其中小时工资可观测',data.audit.wageRows,'第13讲共同估计样本'],['工资不可观测',data.audit.excludedWage,'不填0，不说成随机缺失']]},
 preview:{headers:['文件行号','出生地区','1974年龄','高强度','教育 / 年'],rows:data.preview.map(r=>[r.source_row,r.district,r.age74,r.high,r.yeduc])},
 groups:{headers:['出生地区','年长队列','年轻队列'],rows:[['高强度 high=1','12—17岁，较少直接暴露','2—6岁，可在小学阶段暴露'],['低强度 high=0','12—17岁，较少直接暴露','2—6岁，较低强度暴露']]},
 cells:{headers:['地区','1974年年龄','样本人数','加权教育均值 / 年'],rows:cells(data.cells)},
 differences:{headers:['比较','计算','差值 / 年'],rows:[['高强度：年轻 − 年长',`${pf(data.cells[3]!.mean)} − ${pf(data.cells[2]!.mean)}`,pf(data.cells[3]!.mean-data.cells[2]!.mean)],['低强度：年轻 − 年长',`${pf(data.cells[1]!.mean)} − ${pf(data.cells[0]!.mean)}`,pf(data.cells[1]!.mean-data.cells[0]!.mean)],['两次差分','高强度的变化 − 低强度的变化',pf(data.education.beta)]]},
 dictionary:{headers:['符号','本项目的内容','在模型中的角色'],rows:[['Y','受教育年限 yeduc','结果'],['H','高强度地区 high','地区主效应'],['C','年轻队列 young','队列主效应'],['H×C','z = high × young','差异的变化']]},
 didresult:{headers:['模型','DID / 年','95%地区聚类区间','n'],rows:[modelRow('教育：权重版',data.education)]},
 placebo:{headers:['队列比较','差额 / 年','95%地区聚类区间','n'],rows:[modelRow('12—17岁 对 18—24岁',data.placebo)]},
 sensitivity:{headers:['同一简化模型','DID / 年','95%地区聚类区间','n'],rows:[modelRow('含观测权重',data.education),modelRow('不含观测权重',data.unweighted.education)]},
 samples:{headers:['对象','n','教育DID / 年','后续用途'],rows:[['教育主样本',data.education.n,pf(data.education.beta),'第12讲教育结果'],['工资完整样本',data.first.n,pf(data.first.beta),'第13讲第一阶段'],['两者之差',data.audit.excludedWage,'不能混用分母','工资选择风险']]},
 wagecells:{headers:['地区','1974年年龄','样本人数','加权平均 log小时工资'],rows:cells(data.wageCells)},
 firstcells:{headers:['地区','1974年年龄','样本人数','加权教育均值 / 年'],rows:cells(data.wageSchoolCells)},
 stages:{headers:['方程','结果变量','z系数','95%地区聚类区间'],rows:[['第一阶段','yeduc / 年',pf(data.first.beta),`[${data.first.ci.map(v=>pf(v)).join(', ')}]`],['简约式','lhwage',pf(data.reduced.beta),`[${data.reduced.ci.map(v=>pf(v)).join(', ')}]`]]},
 ivcomparison:{headers:['同一工资样本','教育系数','常规95%地区聚类区间','n'],rows:[modelRow('加权OLS',data.ols),modelRow('加权2SLS',data.iv)]},
 firstdiagnostic:{headers:['诊断','本项目数值','解释'],rows:[['第一阶段 π',pf(data.first.beta),'教育年 / 暴露差异'],['地区聚类 t²',pf(data.first.clusterT2),'一个排除工具的强度诊断'],['部分 R²',pf(data.diagnostics[0]!['partial.rsquared'],6),'扣除 high、young 后的增量'],['排除限制','不能由该表检验','强相关也可能是坏工具']]},
 ivsensitivity:{headers:['共同样本，不同权重','2SLS系数','常规95%区间','n'],rows:[modelRow('含观测权重',data.iv),modelRow('不含观测权重',data.unweighted.iv)]},
 deliverables:{headers:['检查点','保存文件','先核对什么'],rows:[['资料核查','audit.json','来源hash、行数、列定义'],['四格比较','did_cells.csv','两维分组、人数、加权均值'],['设计报告','did_results.json / cohort_profile.png','估计对象、区间与队列坐标'],['工具变量','iv_results.json / memo.md','共同样本、第一阶段、AR集合']]},
 eventcompare:{headers:['分析','横轴','本项目能否计算'],rows:[['本项目队列暴露剖面','1974年年龄（基期12岁）','能：不同出生队列'],['日历事件研究','距各单位实施时点的期数','不能：缺实施前后逐期结果'],['错位实施的动态效应','处理队列 × 日历时间','不能：缺该设计所需记录']]},
 checks:{headers:['结果核对','容差 / 规则','出错先查'],rows:[['四格差分 = z回归系数','绝对差 < 1e−8','权重、完整样本、交互项'],['ρ / π = 2SLS系数','绝对差 < 1e−8','同一行、同一权重与控制'],['教师值与自己的值','先比n，再比系数','不要换数据追数值'],['区间跨0或无界','如实保留','不是程序失败']]},
};
export const policyDescriptions:Record<string,string>={
 timeline:'真实政策时间：1973—1978年小学建设；用1974年年龄划分队列；1995年调查成年教育与工资。不是同一个人的多次观测。',
 'did-lines':`加权教育均值，横轴年长队列→年轻队列；高强度${pf(data.cells[2]!.mean)}→${pf(data.cells[3]!.mean)}；低强度${pf(data.cells[0]!.mean)}→${pf(data.cells[1]!.mean)}。聚焦纵轴，不代表同一人的成长曲线。`,
 counterfactual:`高强度年轻队列反事实均值 = ${pf(data.cells[2]!.mean)} + (${pf(data.cells[1]!.mean)}−${pf(data.cells[0]!.mean)}) = ${pf(data.cells[2]!.mean+data.cells[1]!.mean-data.cells[0]!.mean)}；观察值${pf(data.cells[3]!.mean)}；间距${pf(data.education.beta)}年。虚线依赖跨队列平行变化假设。`,
 cohorts:`加权教育剖面：1974年年龄2—24岁；横轴按24→2排列，12岁为规范化基期，点估计与逐点95%出生地区CR1聚类t289区间。相对高低地区差额，不是日历时间政策后动态效应。坐标：${JSON.stringify(data.cohorts)}`,
 'first-arrow':`工资完整样本n=${data.first.n}；z=high×young；加权第一阶段π=${pf(data.first.beta)}年；95%出生地区聚类区间[${data.first.ci.map(v=>pf(v)).join(', ')}]。`,
 'wald':`同一工资完整样本n=${data.iv.n}；简约式ρ=${pf(data.reduced.beta,6)}；第一阶段π=${pf(data.first.beta,6)}；ρ/π=${pf(data.iv.beta,6)}。`,
 'iv-interval':`加权2SLS教育系数${pf(data.iv.beta)}，常规地区聚类95%区间[${data.iv.ci.map(v=>pf(v)).join(', ')}]；第一阶段弱，常规区间不可代替弱工具稳健推断。`,
 'ar-set':'同一线性规格下，出生地区聚类AR检验反演的95%集合为全体实数。该设计没有给出有限的信息性教育回报区间；不能解释为效应不存在。',
 'dag':'待论证的工具路径：高强度地区×年轻队列 Z → 教育 S → log工资 Y；家庭条件 U 同时影响 S 与 Y。若Z直接影响Y，例如当地劳动力需求变化，则排除限制不成立。',
};
export function policyEvidenceText(id?:string){
 if(!id)return '';
 const table=policyTables[id];return table?`${table.headers.join(' / ')}；${table.rows.map(r=>r.join(' / ')).join('；')}`:policyDescriptions[id]??'';
}
