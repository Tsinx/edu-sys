import { authoredLesson } from "../authoring.js";
export const lesson11=authoredLesson(11,"微分与线性近似","小幅调价的估算会偏差多少？",["导数","切线"],["计算微分","比较增量与微分","解释近似误差"],[{minutes:15,activity:"小幅调价"},{minutes:25,activity:"线性近似"},{minutes:20,activity:"误差实验"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"适用边界"}],[
 {title:"定价旋钮转动一点",layout:"story",image:"l11-scene.png",imageAlt:"零售价格调整",formula:"\\Pi(p)=-10p^2+1400p-26000",prompt:"从50元调到51元，日利润约改变多少？",sourceLabel:"教学情境"},
 {title:"切线替代附近曲线",layout:"essay",image:"l11-concept.png",imageAlt:"局部近似的概念插画",formula:"\\begin{aligned}\\Delta y&=f(x+\\Delta x)-f(x)\\\\dy&=f'(x)\\Delta x\\end{aligned}",body:["增量是实际改变。","微分是一次项给出的局部估算。"]},
 {title:"一次调价的完整核算",layout:"proof",formula:"p_0=50,\\quad\\Delta p=1",steps:[{title:"微分",formula:"d\\Pi=400\\cdot1=400"},{title:"实际增量",formula:"\\Delta\\Pi=400\\Delta p-10(\\Delta p)^2=390"},{title:"估算误差",formula:"\\Delta\\Pi-d\\Pi=-10\\text{元/日}"}]},
 {title:"误差实验",layout:"lab",interactionId:"linearization-error-lab",interactionDefaults:{basePrice:50,deltaPrice:0},prompt:"比较1元、5元和10元的调价。误差怎样随幅度变化？"},
 {title:"一般线性近似",layout:"proof",formula:"f(x_0+h)\\approx f(x_0)+f'(x_0)h",steps:[{title:"平方根附近",formula:"\\sqrt{4.04}\\approx2+\\frac14\\cdot0.04=2.01"},{title:"适用条件",text:"基点可导，变化幅度足够小；是否足够小取决于容许误差。"}]},
 {title:"绝对误差与相对误差",layout:"split",formula:"E=\\text{实际值}-\\text{近似值},\\qquad E_r=|E|/|\\text{实际值}|",body:["同样的绝对误差，对不同规模的结果意义不同。","实际值接近零时，相对误差可能失去稳定性。"]},
 {title:"微分的运算法则",layout:"table",table:{columns:["函数","微分"],rows:[["$u+v$","$du+dv$"],["$uv$","$v\\,du+u\\,dv$"],["$u/v$","$(v\\,du-u\\,dv)/v^2$"],["$f(u)$","$f'(u)\\,du$"]]}},
 {title:"误差不能省略",layout:"compare",style:"constructivist",formula:"\\Pi(60)-\\Pi(50)=3000\\ne4000",prompt:"用50元处的切线估算涨价10元，为什么高估1000元？",steps:[{title:"二次项",formula:"-10(\\Delta p)^2=-1000"}]},
 {title:"独立练习：平方根",layout:"exercise",kind:"exercise",prompt:"用$x_0=9$附近的线性近似估算$\\sqrt{9.12}$，说明估算方向。",steps:[{title:"一次近似",formula:"\\sqrt{9.12}\\approx3+\\frac16\\cdot0.12=3.02"},{title:"方向",text:"平方根函数向下弯曲，切线估算偏大。"}]},
 {title:"迁移：相对变化",layout:"exercise",kind:"exercise",formula:"R(q)=5q^2,\\quad q>0",prompt:"销量增加约1%，收入约增加百分之几？",steps:[{title:"比例关系",formula:"dR/R=2\\,dq/q"},{title:"近似结论",text:"收入约增加2%；精确增加2.01%。"}],sourceLabel:"教学情境"}
]);
