import { authoredLesson } from "../authoring.js";
export const lesson06=authoredLesson(6,"连续性与优惠门槛","规则在哪一个位置突然改变？",["左右极限","函数值"],["验证连续的三个条件","区分间断类型","解释商业门槛"],[{minutes:15,activity:"免运费门槛"},{minutes:25,activity:"连续条件"},{minutes:20,activity:"门槛实验"},{minutes:20,activity:"参数与练习"},{minutes:10,activity:"定价迁移"}],[
 {title:"差一分钱的订单",layout:"story",image:"l06-scene.png",imageAlt:"包裹与免运费门槛",lead:"订单额$s<99$元时加收8元配送费；$s\\ge99$元时免配送费。",prompt:"订单额增加0.01元，总支付额会怎样变化？",sourceLabel:"教学情境"},
 {title:"总支付函数",layout:"proof",formula:"P(s)=\\begin{cases}s+8,&0\\le s<99,\\\\s,&s\\ge99.\\end{cases}",steps:[{title:"门槛两边",formula:"P(98.99)=106.99,\\quad P(99)=99"},{title:"支付额变化",formula:"99-106.99=-7.99\\text{元}"}]},
 {title:"门槛实验",layout:"lab",interactionId:"continuity-threshold-lab",interactionDefaults:{orderAmount:98.99,approach:"left"},prompt:"从两侧移动订单额，比较左右极限与门槛处的支付额。"},
 {title:"连续的三个条件",layout:"essay",image:"l06-concept.png",imageAlt:"连贯与断开道路的概念插画",body:["函数在该点有定义。","该点的双侧极限存在。","极限等于函数值。"],formula:"\\lim_{x\\to a}f(x)=f(a)"},
 {title:"门槛处的检查",layout:"proof",formula:"s=99",steps:[{title:"左右极限",formula:"\\lim_{s\\to99^-}P(s)=107,\\quad\\lim_{s\\to99^+}P(s)=99"},{title:"函数值",formula:"P(99)=99"},{title:"判断",text:"左右极限不同，是跳跃间断。"}]},
 {title:"三种断开方式",layout:"compare",body:["可去间断：极限存在，但函数值缺失或不匹配。","跳跃间断：左右极限有限且不同。","无穷间断：邻近函数值无界。"],formula:"\\frac{x^2-1}{x-1},\\quad P(s),\\quad\\frac1{x^2}",prompt:"分别指出间断位置。"},
 {title:"用参数连接两段",layout:"proof",formula:"f(x)=\\begin{cases}2x+1,&x<2,\\\\kx-1,&x\\ge2.\\end{cases}",steps:[{title:"连接值",formula:"5=2k-1"},{title:"参数",formula:"k=3"},{title:"核对",formula:"\\lim_{x\\to2}f(x)=f(2)=5"}]},
 {title:"区间上的连续",layout:"essay",body:["区间内部逐点连续。","闭区间端点分别检查单侧连续。","闭区间上连续函数能取得最大值与最小值。"],prompt:"开区间上的连续函数一定能取得最大值吗？"},
 {title:"介值定理的运营解释",layout:"proof",lead:"连续成本差函数$F$满足$F(0)<0$、$F(10)>0$。",formula:"\\exists c\\in(0,10),\\quad F(c)=0",steps:[{title:"含义",text:"至少存在一个两方案成本相同的位置。"},{"title":"边界",text:"定理不保证解唯一，也不直接给出解的位置。"}]},
 {title:"独立练习：阶梯优惠",layout:"exercise",kind:"exercise",formula:"T(s)=\\begin{cases}s,&s<200,\\\\0.9s,&s\\ge200.\\end{cases}",prompt:"求200处的左右极限，判断连续性；199元与200元订单的支付额分别是多少？",steps:[{title:"极限",formula:"T(200^-)=200,\\quad T(200^+)=180"},{title:"支付额",formula:"T(199)=199,\\quad T(200)=180"},{title:"判断",text:"存在20元跳跃，函数在200处不连续。"}],sourceLabel:"教学情境"},
 {title:"连续性属于哪一个量？",layout:"essay",body:["订单额连续变化，支付额仍可能跳跃。","分段规则可以连续，也可以不连续。"],prompt:"为一个真实优惠规则画出示意图，标出开点、闭点与单位。"}
]);
