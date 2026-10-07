import { authoredLesson } from "../authoring.js";
export const lesson19=authoredLesson(19,"换元积分：识别内层变化","复杂表达式里藏着什么简单结构？",["链式法则","积分公式"],["识别微分因子","完成换元与回代","解释换元范围"],[{minutes:15,activity:"嵌套变化"},{minutes:25,activity:"第一类换元"},{minutes:25,activity:"第二类换元"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"策略迁移"}],[
 {title:"经过容器的流动",layout:"story",image:"l19-scene.png",imageAlt:"嵌套容器的工作场景",formula:"\\int2x\\cos(x^2)\\,dx",prompt:"被积式中哪一部分恰好是另一部分的导数？"},
 {title:"把内层变成新变量",layout:"essay",image:"l19-concept.png",imageAlt:"替换与转接插画",formula:"u=g(x),\\quad du=g'(x)\\,dx",body:["变量改变时，微分因子必须一起改变。","不定积分完成后回到原变量。"]},
 {title:"完整例题",layout:"proof",formula:"\\int2x\\cos(x^2)\\,dx",steps:[{title:"设新变量",formula:"u=x^2,\\quad du=2x\\,dx"},{title:"积分",formula:"\\int\\cos u\\,du=\\sin u+C"},{title:"回代",formula:"\\sin(x^2)+C"}]},
 {title:"对数结构",layout:"proof",formula:"\\int\\frac{2x}{1+x^2}\\,dx",steps:[{title:"换元",formula:"u=1+x^2,\\quad du=2x\\,dx"},{title:"结果",formula:"\\ln(1+x^2)+C"},{title:"范围",text:"$1+x^2$始终为正，不需要额外排除实数输入。"}]},
 {title:"常数因子需要补齐",layout:"proof",formula:"\\int e^{3x}\\,dx",steps:[{title:"换元",formula:"u=3x,\\quad dx=du/3"},{title:"结果",formula:"e^{3x}/3+C"}]},
 {title:"第二类换元",layout:"proof",formula:"\\int\\frac1{\\sqrt{x}}\\,dx,\\quad x>0",steps:[{title:"设x为新变量的函数",formula:"x=u^2,\\quad u>0,\\quad dx=2u\\,du"},{title:"积分并回代",formula:"\\int2\\,du=2u+C=2\\sqrt x+C"}]},
 {title:"三角换元的范围",layout:"proof",formula:"\\int\\frac1{\\sqrt{1-x^2}}\\,dx,\\quad|x|<1",steps:[{title:"选单调区间",formula:"x=\\sin u,\\quad-\\pi/2<u<\\pi/2"},{title:"微分与根式",formula:"dx=\\cos u\\,du,\\quad\\sqrt{1-x^2}=\\cos u"},{title:"结果",formula:"u+C=\\arcsin x+C"}]},
 {title:"只换字母会漏掉系数",layout:"compare",style:"constructivist",formula:"\\int\\cos(2x)\\,dx=\\tfrac12\\sin(2x)+C",prompt:"若写成$\\sin(2x)$，求导核验会出现什么偏差？"},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"\\int\\frac{3x^2}{1+x^3}\\,dx",prompt:"换元、积分、回代，并写出范围。",steps:[{title:"换元",formula:"u=1+x^3,\\quad du=3x^2dx"},{title:"结果",formula:"\\ln|1+x^3|+C,\\quad x\\ne-1"}]},
 {title:"迁移：衰减速率",layout:"exercise",kind:"exercise",formula:"N'(t)=100e^{-0.5t},\\quad N(0)=0",prompt:"恢复累计量，解释其长期趋势。",steps:[{title:"原函数",formula:"N(t)=-200e^{-0.5t}+C"},{title:"初始条件与极限",formula:"N(t)=200(1-e^{-0.5t}),\\quad\\lim_{t\\to\\infty}N=200"}],sourceLabel:"教学情境"}
]);
