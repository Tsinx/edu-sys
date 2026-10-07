import { authoredLesson } from "../authoring.js";
export const lesson22=authoredLesson(22,"微积分基本定理","为什么累计量的导数回到速率？",["原函数","定积分"],["使用牛顿莱布尼茨公式","求变上限积分导数","区分累计量与速率"],[{minutes:15,activity:"存量记录"},{minutes:25,activity:"基本定理"},{minutes:20,activity:"上限实验"},{minutes:20,activity:"完整计算"},{minutes:10,activity:"独立迁移"}],[
 {title:"水位与流入速率",layout:"story",image:"l22-scene.png",imageAlt:"蓄水池与观察",formula:"A(T)=\\int_0^T v(t)\\,dt",prompt:"延长一点观察时间，新增总量由什么决定？",sourceLabel:"教学情境"},
 {title:"累计与局部互相连接",layout:"essay",image:"l22-concept.png",imageAlt:"累计与速率的概念插画",formula:"A'(T)=v(T)",body:["当速率在该点连续时，累计函数的局部变化率等于末端速率。","新增薄片的面积近似为$v(T)\\Delta T$。"]},
 {title:"基本定理的两部分",layout:"proof",formula:"f\\text{在}[a,b]\\text{连续}",steps:[{title:"变上限",formula:"\\frac d{dx}\\int_a^xf(t)\\,dt=f(x)"},{title:"原函数计算",formula:"F'=f\\Rightarrow\\int_a^bf(t)\\,dt=F(b)-F(a)"}]},
 {title:"8小时累计销售",layout:"proof",formula:"v(t)=120+24t-3t^2",steps:[{title:"原函数",formula:"F(t)=120t+12t^2-t^3"},{title:"定积分",formula:"\\int_0^8v(t)dt=960+768-512=1216"},{title:"平均速率",formula:"1216/8=152\\text{件/小时}"}],sourceLabel:"教学情境"},
 {title:"移动积分上限",layout:"lab",interactionId:"accumulation-limit-lab",interactionDefaults:{upperBound:0},prompt:"移动上限，比较面积、累计值和末端速率。"},
 {title:"上限也是函数",layout:"proof",formula:"H(x)=\\int_0^{x^2}e^t\\,dt",steps:[{title:"链式法则",formula:"H'(x)=e^{x^2}\\cdot2x"},{title:"核验",formula:"H(x)=e^{x^2}-1"}]},
 {title:"上下限都改变",layout:"proof",formula:"K(x)=\\int_x^{2x}f(t)\\,dt",steps:[{title:"拆为两个变上限",formula:"K=\\int_0^{2x}f-\\int_0^xf"},{title:"求导",formula:"K'=2f(2x)-f(x)"}]},
 {title:"积分常数会消去",layout:"compare",formula:"[F(b)+C]-[F(a)+C]=F(b)-F(a)",body:["不定积分保留一族原函数。","定积分在上下限确定后给出一个数值。"],prompt:"定积分结果还需要再加$C$吗？"},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"\\int_1^3(2t+1)\\,dt,\\qquad\\frac d{dx}\\int_1^{\\ln x}t^2\\,dt",prompt:"分别计算，注意第二题的范围。",steps:[{title:"定积分",formula:"[t^2+t]_1^3=10"},{title:"导数",formula:"(\\ln x)^2/x,\\quad x>0"}]},
 {title:"迁移：流入减去流出",layout:"exercise",kind:"exercise",lead:"净速率为$r(t)=6-2t$升/小时，初始存量10升。",prompt:"求0—4小时末存量；净增量与累计流动是否相同？",steps:[{title:"净增量",formula:"\\int_0^4r(t)dt=8"},{title:"末存量",formula:"V(4)=18\\text{升}"},{title:"方向",text:"3小时后净速率为负，累计存量开始减少。"}],sourceLabel:"教学情境"}
]);
