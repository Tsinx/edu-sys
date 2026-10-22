import { authoredLesson } from "../authoring.js";
export const lesson08=authoredLesson(8,"求导法则与基本函数","复杂的成本关系怎样拆开计算？",["导数定义","幂运算"],["使用基本求导公式","正确应用乘积与商法则"],[{minutes:12,activity:"生产关系"},{minutes:28,activity:"基本公式"},{minutes:25,activity:"组合求导"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"结果核验"}],[
 {title:"生产线中的两种变化",layout:"story",image:"l08-scene.png",imageAlt:"糕点生产线",lead:"收入$R(t)=p(t)q(t)$同时受价格和销量变化影响。",prompt:"能否只把两个导数相乘？",sourceLabel:"教学情境"},
 {title:"基本函数的变化规则",layout:"table",table:{columns:["函数","导数","适用范围"],rows:[["$c$","$0$","常数"],["$x^r$","$rx^{r-1}$","函数可导处"],["$e^x$","$e^x$","实数"],["$\\ln x$","$1/x$","$x>0$"],["$\\sin x$","$\\cos x$","弧度"]]}},
 {title:"从部件构成整体",layout:"essay",image:"l08-concept.png",imageAlt:"组合部件的插画",formula:"(af+bg)'=af'+bg'",body:["常数倍保留系数。","有限个可导函数的和逐项求导。"],prompt:"求$C'(q)$，其中$C(q)=2000+20q+0.01q^2$。",steps:[{title:"结果",formula:"C'(q)=20+0.02q"}]},
 {title:"乘积法则",layout:"proof",formula:"(fg)'=f'g+fg'",steps:[{title:"例题",formula:"(x^2e^x)'=2xe^x+x^2e^x"},{title:"整理",formula:"e^x(x^2+2x)"},{title:"经济解释",formula:"(pq)'=p'q+pq'"}]},
 {title:"错误的乘积规则",layout:"compare",style:"constructivist",formula:"(x\\cdot x)'=2x\\ne1\\cdot1",prompt:"用最简单的例子说明$(fg)'=f'g'$为什么不成立。"},
 {title:"商法则",layout:"proof",formula:"\\left(\\frac fg\\right)'=\\frac{f'g-fg'}{g^2},\\quad g\\ne0",steps:[{title:"平均成本",formula:"A(q)=\\frac{2000+20q}{q}=\\frac{2000}q+20"},{title:"两条求导路径",formula:"A'(q)=-\\frac{2000}{q^2},\\quad q>0"},{title:"解释",text:"本模型中销量增加使固定成本的平均分摊下降。"}]},
 {title:"三角与指数函数",layout:"table",table:{columns:["函数","导数"],rows:[["$\\cos x$","$-\\sin x$"],["$\\tan x$","$1/\\cos^2x$"],["$a^x$","$a^x\\ln a$"],["$\\log_a x$","$1/(x\\ln a)$"]]},body:["$a>0$且$a\\ne1$；对数输入为正，正切排除余弦为零的位置。"]},
 {title:"完整例题",layout:"proof",formula:"f(x)=\\frac{\\ln x}{x}",steps:[{title:"定义域",formula:"x>0"},{title:"求导",formula:"f'(x)=\\frac{1-\\ln x}{x^2" + "}"},{title:"核对",formula:"f'(1)=1"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"f(x)=x^3\\sin x,\\quad g(x)=\\frac{x+1}{x-1}",prompt:"求导并写出适用范围。",steps:[{title:"乘积",formula:"f'=3x^2\\sin x+x^3\\cos x"},{title:"商",formula:"g'=-2/(x-1)^2,\\quad x\\ne1"}]},
 {title:"先整理，再核验",layout:"essay",body:["可先约分或展开，但保留原定义域限制。","检查符号、次数和单位。","选择一个允许输入，用小差商检验数量级。"],prompt:"为平均成本导数写一条具有单位的业务解释。"}
]);
