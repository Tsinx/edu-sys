import { authoredLesson } from "../authoring.js";
export const lesson21=authoredLesson(21,"定积分：由局部速率累计总量","一天的配送量怎样从速率记录估算？",["积分公式","数列极限"],["建立黎曼和","解释有向面积","比较取样误差"],[{minutes:15,activity:"配送速率"},{minutes:25,activity:"分割与取样"},{minutes:20,activity:"矩形实验"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"累计迁移"}],[
 {title:"定积分与累计量",layout:"cover",style:"cover",image:"unit-06.png",imageAlt:"累计记录的拼贴",lead:"把许多小段连接为总量。",body:["第六单元 / 第21—25讲"]},
 {title:"配送高峰的一天",layout:"story",image:"l21-scene.png",imageAlt:"配送日的现场",formula:"v(t)=120+24t-3t^2,\\quad0\\le t\\le8",prompt:"速率以件/小时计，怎样估算8小时完成的件数？",sourceLabel:"教学情境"},
 {title:"每一小段的贡献",layout:"essay",image:"l21-concept.png",imageAlt:"小段累积的概念插画",formula:"\\Delta A_i\\approx v(\\xi_i)\\Delta t_i",body:["高度是速率。","宽度是时间。","矩形面积的单位是件。"]},
 {title:"先做四段估算",layout:"proof",formula:"\\Delta t=2",steps:[{title:"左端点速率",formula:"v(0),v(2),v(4),v(6)=120,156,168,156"},{title:"矩形和",formula:"S_L=2(120+156+168+156)=1200"},{title:"中点",formula:"S_M=2(141+165+165+141)=1224"}]},
 {title:"黎曼和实验",layout:"lab",interactionId:"riemann-sum-lab",interactionDefaults:{partitions:"4",sample:"left"},prompt:"比较左右端点与中点，增加分段数。哪项误差随分段缩小？"},
 {title:"定积分的定义",layout:"proof",formula:"\\int_a^bf(t)\\,dt=\\lim_{\\max\\Delta t_i\\to0}\\sum_i f(\\xi_i)\\Delta t_i",steps:[{title:"分割趋细",text:"最大子区间长度趋零，不能只细分其中一段。"},{"title":"取样独立",text:"可积函数的和趋向同一数值，不依赖具体取样点。"}]},
 {title:"面积包含方向",layout:"split",formula:"\\int_{-1}^1x\\,dx=0",body:["横轴上方面积为正。","横轴下方面积为负。","净累计与总面积可能不同。"],prompt:"本例的总几何面积是多少？",steps:[{title:"绝对面积",formula:"\\int_{-1}^1|x|\\,dx=1"}]},
 {title:"定积分的基本性质",layout:"table",table:{columns:["性质","等式"],rows:[["方向","$\\int_b^af=-\\int_a^bf$"],["可加","$\\int_a^cf=\\int_a^bf+\\int_b^cf$"],["线性","$\\int(\\alpha f+\\beta g)=\\alpha\\int f+\\beta\\int g$"]]}},
 {title:"独立练习：恒定速率",layout:"exercise",kind:"exercise",lead:"0—3小时每小时配送80件，3—5小时每小时配送120件。",prompt:"建立分段速率函数，求5小时总量和平均速率。",steps:[{title:"累计",formula:"A=80\\cdot3+120\\cdot2=480\\text{件}"},{title:"平均",formula:"\\bar v=480/5=96\\text{件/小时}"}],sourceLabel:"教学情境"},
 {title:"模型与记录的边界",layout:"essay",body:["连续速率模型描述平均趋势。","实际订单件数为整数，模型累计值可为实数估算。"],prompt:"用一张表说明你在记录什么、估算什么，以及误差从何而来。"}
]);
