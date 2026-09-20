// Independent arithmetic and interpretation ledger; does not certify historical claims.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const updates=JSON.parse(fs.readFileSync('docs/management/updates-phase3.json','utf8'));
const rows=[];
function record(id,documentId,page,expression,result,boundary,actual,expected){
 if(expected!==undefined)assert(Math.abs(actual-expected)<1e-8,`${id}: ${actual} != ${expected}`);
 const source=updates.find(x=>x.documentId===documentId&&x.page===page);assert(source,id);
 rows.push({id,documentId,originalPage:page,slideKeys:source.slideKeys,expression,result,boundary,status:expected===undefined?'interpretation-boundary-reviewed':'arithmetic-passed',sources:source.sources});
}
record('capacity','intro',13,'600 − 250','单班缺口350人','600为明确教学基数；原材料说600多人，不能把350冒充实际精确缺口。',600-250,350);
record('capacity-share','intro',13,'250 ÷ 600 × 100','约41.67%','仅在600人教学基数及均等随机机会假设下成立。',250/600*100,41.66666666666667);
record('second-section','intro',13,'600 − 2 × 250','两班仍缺100人','两班是可选教学方案，不表示现实已增设教师、课时或教室。',600-2*250,100);
record('herzberg-dissatisfaction','l10',41,'69 + 31','100%','原历史图组内构成；样本与时间未知，不解释为当前员工比例。',69+31,100);
record('herzberg-satisfaction','l10',41,'19 + 81','100%','两组分母不同，不将四项直接相加为一个总体比例。',19+81,100);
for(const [v,e] of [[1,1],[0,1],[1,0],[.6,.8]])record(`expectancy-${v}-${e}`,'l10',57,`${v} × ${e}`,String(v*e),'原简化式M=V×E；控制参数为教学赋值，不是张华的心理测量。进一步讨论区分努力—绩效、绩效—回报和效价。',v*e,v===1&&e===1?1:v===0||e===0?0:.48);
record('lincoln-sales-unit','l10',75,'4233百万美元 ÷ 100','42.33亿美元','2025净销售额；旧稿2400人、95.5%、4.4万与1.7万美元期间不明，不与新年度拼接。',4233/100,42.33);
record('historical-ownership-before','l10',83,'65.15 + 34.85','100%','合计正确仅是算术核对，不证明1997年股权叙述。7005万元、688人与299人不能用来补造个人认购金额。',65.15+34.85,100);
record('historical-ownership-after','l10',83,'5.05 + 33.09 + 61.86','100%','保留原图期间和主体；不当作目前股权结构。',5.05+33.09+61.86,100);
record('historical-subscription','l10',85,'144万元；225万元；30%—35%','现金购买额度与收益率口径分开','原2015例是购买现金额度而非股数；收益率缺价格、期间、税费及分配证据，不能重新算成可承诺收益。');
record('tup-ratios','l10',86,'2∶1 → 3∶1／4∶1；第五年结算','原历史材料设想','未取得匹配期间与口径，不能作为已经核实的劳动与资本回报统计；TUP与实际股权分开。');
record('huawei-benefits','l10',87,'209.9亿元','2025年全球员工保障总体投入','不直接转换为人均奖金；未提供匹配分母及个人资格。');
record('financial-ratio','l13',8,'200 ÷ 100','2.00','明确标注教学金额万元。流动资产和流动负债采用同一时点；分母为0时无定义，不显示Infinity。',200/100,2);
record('financial-definitions','l13',9,'期间利润／同期平均资产；同期净利润／同期营业收入','分子分母期间对齐','速动资产说明剔除项；资产周转率用同期营业收入与平均资产。不同利润口径不能混比，不设置统一最优值。');
record('haidilao-four','l13',23,'4 × 25%','100%','原历史示意，8000元与未出资细节无同口径原始证据，不用合计替代史实核验。',4*25,100);
record('haidilao-transfer-plus','l13',24,'50 + 18','68%','18为百分点，不是原50%持股的18%；转让比例与交易价格分开。',50+18,68);
record('haidilao-transfer-minus','l13',24,'50 − 18','32%','原图特定主体；不与当前上市公司股权表混用。',50-18,32);
record('yahoo-proxy-unit','l13',31,'121.5百万股 ÷ 100','1.215亿股','2014协议约定上限与实际持股取小值；15%提名支持门槛、软银超出30%的代理范围分别理解。',121.5/100,1.215);
record('dpmo','l13',57,'10 ÷ (1000 × 2) × 1000000','5000 DPMO','件数、每件机会数与缺陷数为教学参数；缺陷不等于不合格件。',10/(1000*2)*1e6,5000);
record('six-sigma','l13',54,'3.4 DPMO','带条件的长期惯例','正态过程及常用1.5σ均值漂移假设不能省略；DPMO单一数值不证明过程能力或六西格玛水平。');
const poll=[16.75,13.09,11.91,11.32,10.02,9.20,8.96,8.02,6.49,4.25];
record('quality-poll','l13',59,poll.join(' + '),'100.01%','2014年7月21日至8月21日848票；舍入与100.01%相容，票数不等于独立受访人数，自愿投票不代表总体。',poll.reduce((a,b)=>a+b,0),100.01);
record('risk-score','l14',23,'1—5可能性等级；1—5影响等级','教学比较标尺','顺序等级及其乘积不是统计概率或货币期望损失；选择措施不会自动降低风险等级。');
record('network-rounds','l11',10,'5节点；每轮沿一条边传播','最短路径的离散轮次','双向无延迟、无丢失的教学规则；轮数不等于真实沟通满意度或处理效率。');
const report={checkedAt:new Date().toISOString(),status:'passed',scope:'第三期独立复算与解释边界；第一、二期记录保持原样。',arithmeticChecks:rows.filter(r=>r.status==='arithmetic-passed').length,interpretationChecks:rows.filter(r=>r.status==='interpretation-boundary-reviewed').length,entries:rows};
fs.writeFileSync('docs/management/calculation-audit-phase3.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/management/CALCULATIONS-PHASE3.md','# 《管理学》第三期复算与口径记录\n\n核验日期：2026-09-20。算术成立与历史事实成立分别记录；未提供的分母、期间和参数不补造。逐页修改与来源见 [更新记录](updates-phase3.json)。\n\n| 原页 | 算式或口径 | 结果 | 解释边界 |\n|---|---|---|---|\n'+rows.map(r=>`| ${r.documentId} · ${r.originalPage} | ${r.expression} | ${r.result} | ${r.boundary} |`).join('\n')+'\n\n[机器可读记录](calculation-audit-phase3.json)；动态参数的边界、零分母、网络路径和状态恢复另由演示测试验证。\n');
console.log({arithmetic:report.arithmeticChecks,boundaries:report.interpretationChecks});
