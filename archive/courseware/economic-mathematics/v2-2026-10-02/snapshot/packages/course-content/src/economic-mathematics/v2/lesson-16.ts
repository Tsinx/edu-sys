import { authoredLesson } from "../authoring.js";
export const lesson16=authoredLesson(16,"需求弹性与调价决策","同样涨价1%，销量反应为什么不同？",["导数","边际收入"],["计算无量纲需求弹性","连接弹性与收入变化","区分收入最优和利润最优"],[{minutes:15,activity:"两个细分市场"},{minutes:25,activity:"弹性推导"},{minutes:20,activity:"调价实验"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"决策迁移"}],[
 {title:"两种服装消费群体",layout:"story",image:"l16-scene.png",imageAlt:"服装零售的不同消费场景",formula:"q_A=1200-10p,\\quad q_B=900-6p",prompt:"价格都为50元，哪个群体的相对销量反应更强？",sourceLabel:"教学情境"},
 {title:"比较相对变化",layout:"essay",image:"l16-concept.png",imageAlt:"比例变化的概念插画",formula:"E=-\\frac{dq}{dp}\\frac pq",body:["需求向下倾斜时采用非负弹性惯例。","弹性没有单位，适合比较不同规模的市场。","定义要求$p>0$且$q>0$。"]},
 {title:"同一价格的比较",layout:"proof",formula:"p=50",steps:[{title:"市场A",formula:"q_A=700,\\quad E_A=500/700=5/7"},{title:"市场B",formula:"q_B=600,\\quad E_B=300/600=1/2"},{title:"解释",text:"小幅涨价1%，A的销量约下降0.714%，B约下降0.5%。"}]},
 {title:"收入与弹性的连接",layout:"proof",formula:"R(p)=pq(p)",steps:[{title:"求导",formula:"R'=q+pq'=q(1-E)"},{title:"三个区间",text:"$E<1$时涨价提高收入；$E>1$时涨价降低收入；$E=1$时为收入驻点。"}]},
 {title:"收入驻点的价格",layout:"proof",formula:"E_A=\\frac{10p}{1200-10p}",steps:[{title:"单位弹性",formula:"E_A=1\\Rightarrow p=60"},{title:"收入最大",formula:"R''=-20<0,\\quad R(60)=36000"}]},
 {title:"收入最优与利润最优",layout:"compare",style:"constructivist",formula:"p_R^*=60,\\qquad p_\\Pi^*=70",body:["收入不扣除成本。","利润考虑销量变化带来的成本变化。"],prompt:"为什么两个目标给出不同价格？"},
 {title:"弹性与利润实验",layout:"lab",interactionId:"elasticity-profit-lab",interactionDefaults:{price:50,segment:"A",revealOptimum:false,revealStep:false},prompt:"分别记录收入和利润的转折位置，再用公式说明差异。"},
 {title:"边际收入的另一种表达",layout:"proof",formula:"MR=p\\left(1-\\frac1E\\right)",steps:[{title:"适用条件",text:"需求可微且局部可逆，$q,p,E$均为正。"},{"title":"本例的核验",formula:"q=500,p=70,E=1.4\\Rightarrow MR=20"}]},
 {title:"独立练习：订阅量",layout:"exercise",kind:"exercise",formula:"n(p)=1000p^{-2},\\quad p>0",prompt:"求弹性；涨价是否提高收入？",steps:[{title:"求导与弹性",formula:"n'=-2000p^{-3},\\quad E=2"},{title:"收入",formula:"R=1000/p,\\quad R'<0"}],sourceLabel:"教学情境"},
 {title:"迁移：调价建议",layout:"exercise",kind:"exercise",lead:"某业务估计局部需求弹性为0.8，计划涨价2%。",prompt:"估算销量和收入的相对变化，列出使用该估算的前提。",steps:[{title:"近似",formula:"dq/q\\approx-1.6\\%,\\quad dR/R\\approx0.4\\%"},{title:"前提",text:"变化足够小，其他条件固定，弹性估计适用于当前位置。"}],sourceLabel:"教学情境"}
]);
